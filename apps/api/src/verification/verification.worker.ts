import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { REDIS, VERIFICATION_QUEUE_NAME, type VerificationJob } from './verification.queue';
import { VerificationService } from './verification.service';

/**
 * The verification worker (EPIC-A §5). Runs in-process for the prove phase — the
 * architecture spec's separate background-worker service is a deployment split at the
 * migrate step; the job handlers below move across unchanged.
 */
@Injectable()
export class VerificationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(VerificationWorker.name);
  private worker?: Worker;

  constructor(
    @Inject(REDIS) private readonly connection: Redis,
    private readonly verification: VerificationService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<VerificationJob['data']>(
      VERIFICATION_QUEUE_NAME,
      async (job: Job) => {
        switch (job.name) {
          case 'verify':
            return this.verification.runChecks(job.data.memberId as string);
          case 'identity-check-timeout':
            return this.verification.expireIdentityCheck(job.data.sessionId as string);
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
