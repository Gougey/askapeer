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

/** How often the corpus refreshes. Literature does not move hourly. */
export const INGEST_EVERY_MS = 12 * 60 * 60 * 1000;

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
