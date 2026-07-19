import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { appMeta } from '../db/schema';

@Injectable()
export class HealthService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Proves the full stack: DB reachable, migration applied, typed round-trip. */
  async check() {
    await this.db.execute(sql`select 1`);

    const schemaCheck = await this.db.execute<{ exists: boolean }>(
      sql`select exists(select 1 from information_schema.schemata where schema_name = 'config') as exists`,
    );
    const migrationsApplied = schemaCheck.rows[0]?.exists ?? false;

    const rows = await this.db
      .select()
      .from(appMeta)
      .where(eq(appMeta.key, 'app.version'));
    const version = rows[0]?.value ?? 'unknown';

    return {
      status: 'ok' as const,
      service: 'askapeer-api',
      version,
      time: new Date().toISOString(),
      db: { reachable: true, migrationsApplied },
    };
  }
}
