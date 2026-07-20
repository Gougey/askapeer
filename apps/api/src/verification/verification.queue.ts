import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module';

export const VERIFICATION_QUEUE = Symbol('VERIFICATION_QUEUE');

export const VERIFICATION_QUEUE_NAME = 'verification';

/** Run the automated checks for a freshly registered (or resubmitting) applicant. */
export type VerifyJob = { name: 'verify'; data: { memberId: string } };
/** Fires if the identity-check callback never arrives (EPIC-A §8). */
export type TimeoutJob = { name: 'identity-check-timeout'; data: { sessionId: string } };
export type VerificationJob = VerifyJob | TimeoutJob;

/**
 * The verification queue. BullMQ rather than an in-process timer because the 48-hour
 * identity-check timeout (§8) has to survive a deploy — a delayed job does, a
 * `setTimeout` does not.
 *
 * The connection itself comes from the shared RedisModule. For the prove phase the
 * worker runs inside the API process (see VerificationWorker); the architecture spec's
 * separate background-worker service is a deployment change at the migrate step, not a
 * code change.
 */
@Global()
@Module({
  providers: [
    {
      provide: VERIFICATION_QUEUE,
      inject: [REDIS],
      useFactory: (connection: Redis) =>
        new Queue(VERIFICATION_QUEUE_NAME, {
          connection,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 500,
            removeOnFail: 1000,
          },
        }),
    },
  ],
  exports: [VERIFICATION_QUEUE],
})
export class VerificationQueueModule implements OnModuleDestroy {
  constructor(@Inject(VERIFICATION_QUEUE) private readonly queue: Queue) {}

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
