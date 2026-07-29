import { Global, Inject, Injectable, Logger, Module, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module';

export const NOTIFICATIONS_QUEUE = Symbol('NOTIFICATIONS_QUEUE');

export const NOTIFICATIONS_QUEUE_NAME = 'notifications';

/**
 * Domain events this epic reacts to. The job carries **ids, not rendered content**: the
 * worker re-reads the row and resolves the recipient itself, so the domain services stay
 * ignorant of who gets notified and why (EPIC-G §1 — "this epic only reacts to them").
 */
export type ReplyEventJob = { name: 'reply'; data: { commentId: string } };
export type KudosEventJob = {
  name: 'kudos_received';
  data: { targetType: 'post' | 'comment'; targetId: string; actorHandleId: string };
};
/**
 * Delivery, split from the event that caused it. A failed send retries on its own
 * without re-running the event handler — which is what stops a retry from writing a
 * second in-app row (EPIC-G §6.2 describes exactly this shape: the worker "writes the
 * in-app row and enqueues email").
 *
 * It carries its own copy of the payload rather than a notification id, because the two
 * channels are independently switchable: a member who turns the in-app channel off but
 * leaves email on has no row to point at, and must still get the mail.
 */
export type EmailJob = {
  name: 'email';
  data: { handleId: string; type: string; payload: Record<string, unknown> };
};

export type NotificationJob = ReplyEventJob | KudosEventJob | EmailJob;

/**
 * Typed enqueue facade. Domain services depend on this rather than on a raw BullMQ
 * `Queue`, so a call site reads as the event it is ("a reply was posted") and the job
 * names stay in one file.
 */
@Injectable()
export class NotificationEvents {
  private readonly log = new Logger(NotificationEvents.name);

  constructor(@Inject(NOTIFICATIONS_QUEUE) private readonly queue: Queue) {}

  /**
   * A comment was created (EPIC-C). Recipient resolution — post author, or the parent
   * comment's author for a nested reply — happens in the worker.
   *
   * The job id is derived from the comment so a double-enqueue is impossible; the
   * database dedupe key (`notifications.dedupe_key`) is the durable half of the same
   * guarantee, for when the completed job has aged out of Redis.
   */
  async replyPosted(commentId: string): Promise<void> {
    // BullMQ forbids `:` in a custom job id — it is the delimiter of its own key space.
    await this.enqueue('reply', { commentId }, `reply-${commentId}`);
  }

  /** Kudos was genuinely awarded — not a repeat tap, which EPIC-D §3 makes a no-op. */
  async kudosAwarded(
    targetType: 'post' | 'comment',
    targetId: string,
    actorHandleId: string,
  ): Promise<void> {
    await this.enqueue('kudos_received', { targetType, targetId, actorHandleId });
  }

  /**
   * **Announcing an event never fails the action that caused it.**
   *
   * The caller has already committed: the answer is posted, the kudos is counted. If
   * Redis is unreachable at that moment, throwing would report a 500 for work that
   * genuinely succeeded — and the client's natural retry would post the answer a second
   * time. A missed notification is a smaller loss than a duplicated contribution, and it
   * is the one of the two that a member can recover from by opening the thread.
   *
   * (Kudos survives that retry unharmed because awarding is idempotent; answering is
   * not, which is what makes swallowing the right default rather than a shortcut.)
   */
  private async enqueue(
    name: string,
    data: Record<string, unknown>,
    jobId?: string,
  ): Promise<void> {
    try {
      await this.queue.add(name, data, jobId ? { jobId } : undefined);
    } catch (err) {
      this.log.error(`Could not queue ${name}: ${(err as Error).message}`);
    }
  }
}

/**
 * The notifications queue. `@Global()` for the same reason the verification queue is:
 * every epic that emits a domain event needs to enqueue (forum now, moderation and
 * verification in later slices), and having each import a notifications module would
 * invert the dependency — this epic reacts to those epics, it is not depended upon by
 * them.
 */
@Global()
@Module({
  providers: [
    {
      provide: NOTIFICATIONS_QUEUE,
      inject: [REDIS],
      useFactory: (connection: Redis) =>
        new Queue(NOTIFICATIONS_QUEUE_NAME, {
          connection,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 500,
            removeOnFail: 1000,
          },
        }),
    },
    NotificationEvents,
  ],
  exports: [NOTIFICATIONS_QUEUE, NotificationEvents],
})
export class NotificationsQueueModule implements OnModuleDestroy {
  constructor(@Inject(NOTIFICATIONS_QUEUE) private readonly queue: Queue) {}

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
