import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Worker, type Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module';
import { IngestionService } from './ingestion.service';
import {
  INGESTION_QUEUE,
  INGESTION_QUEUE_NAME,
  INGEST_EVERY_MS,
  INGEST_JOB,
  RECLASSIFY_JOB,
} from './ingestion.queue';

/**
 * The ingestion worker (EPIC-I). In-process for the prove phase, like the verification
 * worker — the architecture spec's separate worker service is a deployment split, and this
 * handler moves across unchanged.
 */
@Injectable()
export class IngestionWorker implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(IngestionWorker.name);
  private worker?: Worker;

  constructor(
    @Inject(REDIS) private readonly connection: Redis,
    @Inject(INGESTION_QUEUE) private readonly queue: Queue,
    private readonly ingestion: IngestionService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.worker = new Worker(
      INGESTION_QUEUE_NAME,
      async (job) =>
        job.name === RECLASSIFY_JOB
          ? this.ingestion.reclassifyAll(async (done, total) => {
              // Progress is reported for the operator, but it also renews the job's lock —
              // which is the part that matters, because a run this long outlives the default
              // lock many times over.
              await job.updateProgress({ done, total });
            })
          : this.ingestion.runAll(),
      // Concurrency 1: two runs at once would double our request rate against two free
      // public APIs to fetch the same overlapping window twice — and it is also what keeps
      // a reclassify from running while an ingest is writing the rows it just deleted.
      //
      // `maxStalledCount` is raised from BullMQ's default of 1 because a stall here is
      // routine rather than symptomatic: Fly autostops a machine it judges idle, and a
      // reclassify keeps the *worker* busy while leaving the *app* looking idle, so the
      // machine running it is exactly the one Fly picks. One such stall used to fail the
      // job outright. Now the run resumes from its committed cursor, so each attempt makes
      // real progress and three of them is ample.
      { connection: this.connection, concurrency: 1, maxStalledCount: 3 },
    );

    this.worker.on('failed', (job, err) => {
      this.log.error(`Ingestion job ${job?.id} failed: ${err.message}`);
    });

    // Keyed by name, so redeploying replaces the schedule rather than accumulating one
    // repeatable job per deploy — which is the classic way this pattern goes wrong.
    await this.queue.add(
      INGEST_JOB,
      {},
      { repeat: { every: INGEST_EVERY_MS }, jobId: 'research-ingestion-schedule' },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
