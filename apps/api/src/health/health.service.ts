import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import { DRIZZLE, type Database } from '../db/db.module';
import { REDIS } from '../redis/redis.module';
import { appMeta } from '../db/schema';

/**
 * A probe must never outlast this. The Redis client is configured with
 * `maxRetriesPerRequest: null` for BullMQ's benefit, which means a command issued
 * against an unreachable server queues *forever* rather than rejecting — so an
 * un-raced PING would hang the health endpoint instead of reporting it down. That is
 * the exact failure this check exists to catch, so the timeout is load-bearing.
 */
const PROBE_TIMEOUT_MS = 2000;

function withTimeout<T>(work: Promise<T>, ms = PROBE_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Probe timed out after ${ms}ms`)), ms).unref(),
    ),
  ]);
}

export type HealthReport = {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  time: string;
  db: { reachable: boolean; migrationsApplied: boolean };
  redis: { reachable: boolean };
};

@Injectable()
export class HealthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /**
   * Proves the full stack: Postgres reachable + migrated, and Redis reachable.
   *
   * Redis is a hard dependency, not a nice-to-have — registration enqueues the
   * verification job (EPIC-A §5) and blocks on it, so without Redis the whole
   * onboarding path stops. It is checked here because a green deploy and an `ok`
   * health response previously said nothing at all about it.
   */
  async check(): Promise<HealthReport> {
    const [db, redis] = await Promise.all([this.checkDb(), this.checkRedis()]);

    return {
      status: db.reachable && db.migrationsApplied && redis.reachable ? 'ok' : 'degraded',
      service: 'askapeer-api',
      version: db.version,
      time: new Date().toISOString(),
      db: { reachable: db.reachable, migrationsApplied: db.migrationsApplied },
      redis,
    };
  }

  private async checkDb() {
    try {
      return await withTimeout(
        (async () => {
          await this.db.execute(sql`select 1`);

          const schemaCheck = await this.db.execute<{ exists: boolean }>(
            sql`select exists(select 1 from information_schema.schemata where schema_name = 'config') as exists`,
          );
          const migrationsApplied = schemaCheck.rows[0]?.exists ?? false;

          const rows = await this.db.select().from(appMeta).where(eq(appMeta.key, 'app.version'));
          return { reachable: true, migrationsApplied, version: rows[0]?.value ?? 'unknown' };
        })(),
      );
    } catch {
      return { reachable: false, migrationsApplied: false, version: 'unknown' };
    }
  }

  private async checkRedis() {
    try {
      await withTimeout(this.redis.ping());
      return { reachable: true };
    } catch {
      return { reachable: false };
    }
  }
}
