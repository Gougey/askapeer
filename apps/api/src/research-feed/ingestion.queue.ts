import { Global, Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module';

export const INGESTION_QUEUE = Symbol('INGESTION_QUEUE');
export const INGESTION_QUEUE_NAME = 'research-ingestion';
export const INGEST_JOB = 'ingest';

/**
 * Re-tagging runs on the same queue as ingest, and that is the point: concurrency is 1, so a
 * reclassify can never run while an ingest is writing `article_tags` — the two would be
 * fighting over the same rows, one of them having just emptied the table.
 */
export const RECLASSIFY_JOB = 'reclassify';

/**
 * One bounded piece of the historical backfill.
 *
 * ⚠️ **Self-enqueuing rather than one long job.** The whole exercise is hundreds of thousands
 * of articles over hours; as a single job it would be one stall away from losing everything,
 * and would hold the queue's only worker slot throughout. Each run takes a few pages, commits
 * its cursor and queues the next, so the work is a chain of short jobs that an interruption
 * costs a page of.
 */
export const BACKFILL_JOB = 'backfill';

/**
 * The watchdog over the backfill chain.
 *
 * ⚠️ **A self-enqueuing chain has no owner.** If one link fails to queue the next — a bug, a
 * machine killed between the run and the `add`, a job that exhausts its attempts — nothing in
 * the system notices: the queue is empty, which is indistinguishable from finished. That is
 * exactly how the import stood still from 7 to 9 October with 479 slices pending. This job is
 * the thing that asks, on a schedule, whether there is outstanding work with no chain running,
 * and starts one if so. It is cheap and almost always a no-op.
 */
export const BACKFILL_SWEEP_JOB = 'backfill-sweep';

/** How often the corpus refreshes. Literature does not move hourly. */
export const INGEST_EVERY_MS = 12 * 60 * 60 * 1000;

/**
 * How often to check the chain is alive.
 *
 * Fifteen minutes is far more often than the chain should ever need rescuing, and still cheap:
 * when all is well it is one `count(*)` and one queue inspection.
 */
export const BACKFILL_SWEEP_EVERY_MS = 15 * 60 * 1000;

/**
 * The ingestion queue (EPIC-I), on the same BullMQ infrastructure as verification and
 * notifications.
 *
 * A repeatable job rather than a cron container: the schedule then lives with the code that
 * runs it and survives a deploy, and the same queue takes a manual kick from the admin
 * endpoint without a second code path.
 *
 * `attempts: 2` and not more, deliberately. A failed run is not urgent — the corpus is
 * already stored and the feed keeps serving — and the ingest window overlaps by a
 * fortnight, so the *next* scheduled run re-covers anything a failure missed. Hammering a
 * free public API on our schedule is the worse outcome.
 */
@Global()
@Module({
  providers: [
    {
      provide: INGESTION_QUEUE,
      inject: [REDIS],
      useFactory: (connection: Redis) =>
        new Queue(INGESTION_QUEUE_NAME, {
          connection,
          defaultJobOptions: {
            attempts: 2,
            backoff: { type: 'exponential', delay: 60_000 },
            removeOnComplete: 50,
            removeOnFail: 100,
          },
        }),
    },
  ],
  exports: [INGESTION_QUEUE],
})
export class IngestionQueueModule {}
