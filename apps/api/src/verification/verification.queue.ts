import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis, { type Redis } from 'ioredis';

export const REDIS = Symbol('REDIS');
export const VERIFICATION_QUEUE = Symbol('VERIFICATION_QUEUE');

export const VERIFICATION_QUEUE_NAME = 'verification';

/** Run the automated checks for a freshly registered (or resubmitting) applicant. */
export type VerifyJob = { name: 'verify'; data: { memberId: string } };
/** Fires if the identity-check callback never arrives (EPIC-A §8). */
export type TimeoutJob = { name: 'identity-check-timeout'; data: { sessionId: string } };
export type VerificationJob = VerifyJob | TimeoutJob;

/**
 * Redis + the verification queue. BullMQ rather than an in-process timer because the
 * 48-hour identity-check timeout (§8) has to survive a deploy — a delayed job does,
 * a `setTimeout` does not.
 *
 * For the prove phase the worker runs inside the API process (see VerificationWorker);
 * the architecture spec's separate background-worker service is a deployment change at
 * the migrate step, not a code change.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis =>
        new IORedis(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379', {
          maxRetriesPerRequest: null, // required by BullMQ's blocking reads
        }),
    },
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
  exports: [REDIS, VERIFICATION_QUEUE],
})
export class VerificationQueueModule implements OnModuleDestroy {
  constructor(
    @Inject(VERIFICATION_QUEUE) private readonly queue: Queue,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    this.redis.disconnect();
  }
}
