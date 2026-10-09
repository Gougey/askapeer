import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Worker, type Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module';
import { IngestionService } from './ingestion.service';
import { BackfillService } from './backfill.service';
import {
  BACKFILL_JOB,
  BACKFILL_SWEEP_EVERY_MS,
  BACKFILL_SWEEP_JOB,
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
    private readonly backfill: BackfillService,
  ) {}

  /**
   * One slice, then queue the next — see `BACKFILL_JOB`.
   *
   * The chain stops only when there is nothing left at all. ⚠️ It used to stop whenever
   * `runNext` could not pick a slice *this second*, which is a different thing: a rested
   * source or a slice abandoned nine minutes ago both read as "finished", and on 2026-10-07
   * that ended the import with 479 slices pending. `retryInMs` is the difference — there is
   * work, it is not available yet, come back.
   */
  private async runBackfillSlice(): Promise<unknown> {
    const result = await this.backfill.runNext();
    if (!result.done) {
      await this.queue.add(
        BACKFILL_JOB,
        {},
        // `delay: undefined` is immediate, which is the ordinary page-after-page case.
        { attempts: 2, removeOnComplete: true, delay: result.retryInMs },
      );
    }
    return result;
  }

  /**
   * Is the chain alive while there is work to do?
   *
   * ⚠️ **A self-enqueuing chain has nobody watching it.** Every link queues the next, so a
   * link that dies between finishing and enqueuing takes the whole import with it, and leaves
   * an empty queue — which looks exactly like success. Twice now the backfill has stopped this
   * way and been found by counting rows rather than by anything in the system noticing.
   *
   * It only ever *starts* a chain, never a second one: BullMQ's concurrency here is 1, but two
   * chains would still double the rate against two free public APIs, so a backfill job already
   * waiting, active or delayed means there is nothing to do.
   */
  private async sweepBackfill(): Promise<unknown> {
    const outstanding = await this.backfill.outstanding();
    if (outstanding === 0) return { outstanding, started: false };

    const queued = await this.queue.getJobs(['waiting', 'active', 'delayed', 'paused']);
    if (queued.some((job) => job?.name === BACKFILL_JOB)) return { outstanding, started: false };

    this.log.warn(
      `backfill chain was not running with ${outstanding} slice(s) outstanding — starting it`,
    );
    await this.queue.add(BACKFILL_JOB, {}, { attempts: 2, removeOnComplete: true });
    return { outstanding, started: true };
  }

  async onModuleInit(): Promise<void> {
    this.worker = new Worker(
      INGESTION_QUEUE_NAME,
      async (job) =>
        job.name === BACKFILL_JOB
          ? this.runBackfillSlice()
          : job.name === BACKFILL_SWEEP_JOB
          ? this.sweepBackfill()
          : job.name === RECLASSIFY_JOB
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

    // The watchdog over the self-enqueuing backfill chain. Same keying, same reason.
    await this.queue.add(
      BACKFILL_SWEEP_JOB,
      {},
      {
        repeat: { every: BACKFILL_SWEEP_EVERY_MS },
        jobId: 'research-backfill-sweep',
        removeOnComplete: true,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
