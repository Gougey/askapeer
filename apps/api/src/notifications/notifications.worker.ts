import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module';
import { NOTIFICATIONS_QUEUE_NAME } from './notifications.queue';
import { NotificationsService } from './notifications.service';

/**
 * The notifications worker (EPIC-G §5). A thin switch over the service, mirroring the
 * verification worker — including running in-process for the prove phase, which the
 * architecture spec splits out as a deployment change rather than a code one.
 */
@Injectable()
export class NotificationsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(NotificationsWorker.name);
  private worker?: Worker;

  constructor(
    @Inject(REDIS) private readonly connection: Redis,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      NOTIFICATIONS_QUEUE_NAME,
      async (job: Job) => {
        switch (job.name) {
          case 'reply':
            return this.notifications.handleReplyEvent(job.data.commentId as string);
          case 'kudos_received':
            return this.notifications.handleKudosEvent(
              job.data.targetType as 'post' | 'comment',
              job.data.targetId as string,
              job.data.actorHandleId as string,
            );
          case 'account_notice':
            return this.notifications.handleAccountNotice(
              job.data.handleId as string,
              job.data.payload,
              job.data.dedupeKey as string,
            );
          case 'email':
            return this.notifications.deliverEmail(
              job.data.handleId as string,
              job.data.type as string,
              job.data.payload,
            );
          default:
            this.log.warn(`Unknown job ${job.name}`);
        }
      },
      { connection: this.connection, concurrency: 5 },
    );

    this.worker.on('failed', (job, err) => {
      this.log.error(`Job ${job?.name} ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
