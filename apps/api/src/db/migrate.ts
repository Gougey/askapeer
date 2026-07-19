import { resolve } from 'node:path';
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { appMeta } from './schema';

// Standalone migration runner (used by `npm run db:migrate` and, later, CI/deploy).
dotenv.config({ path: resolve(process.cwd(), '../../.env') });

const version = process.env.npm_package_version ?? '0.0.0';

async function main(): Promise<void> {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgres://askapeer:askapeer@localhost:5432/askapeer',
  });
  const db = drizzle(pool);

  console.log('Running migrations…');
  // __dirname works for both `tsx src/db/migrate.ts` (dev) and the compiled
  // dist/db/migrate.js (prod release_command): ../../drizzle == apps/api/drizzle.
  await migrate(db, { migrationsFolder: resolve(__dirname, '..', '..', 'drizzle') });

  // Seed a single app-version row so the health check proves a real table round-trip.
  await db
    .insert(appMeta)
    .values({ key: 'app.version', value: version })
    .onConflictDoUpdate({ target: appMeta.key, set: { value: version } });

  const [{ now }] = await db.execute<{ now: string }>(sql`select now()::text as now`).then((r) => r.rows);
  console.log(`Migrations applied. DB time: ${now}`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
