import { resolve } from 'node:path';
import * as dotenv from 'dotenv';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { Pool } from 'pg';
import { CLEAR, KEEP, QUEUES_TO_EMPTY, REDIS_PATTERNS, SCHEMAS, unclassified } from './clear-down-plan';

/**
 * The closed pilot's operator tool. Compiled into `dist/`, because the production image has no
 * TypeScript runner and Redis is only reachable from inside Fly — so it runs on the API machine,
 * which already holds both credentials:
 *
 *   flyctl ssh console -a askapeer-api -C "node dist/cli/pilot.js allowlist list"
 *
 * Locally: `npx tsx src/cli/pilot.ts …` from `apps/api` (reads the repo's `.env`).
 *
 *   allowlist list                       who is invited, and whether they have registered
 *   allowlist add a@x.com b@y.com        invite (comma- or space-separated)
 *   allowlist remove a@x.com             uninvite (does not touch an existing account)
 *   clear-down                           dry run: what would go, what stays
 *   clear-down --execute --confirm=DB@HOST
 *
 * ⚠️ The list output deliberately shows **no handle**. Email next to handle is a de-anonymisation,
 * which on this platform is only ever done through the audited reveal-identity action.
 */
dotenv.config({ path: resolve(process.cwd(), '../../.env') });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main(): Promise<void> {
  const [command, sub, ...rest] = process.argv.slice(2);
  const url = process.env.DATABASE_URL ?? 'postgres://askapeer:askapeer@localhost:5432/askapeer';
  const pool = new Pool({ connectionString: url });
  try {
    if (command === 'allowlist' && sub === 'list') return await listAllowlist(pool);
    if (command === 'allowlist' && sub === 'add') return await addAllowlist(pool, emails(rest));
    if (command === 'allowlist' && sub === 'remove') return await removeAllowlist(pool, emails(rest));
    if (command === 'clear-down') return await clearDown(pool, url, [sub, ...rest].filter(Boolean));
    usage();
  } finally {
    await pool.end();
  }
}

function usage(): never {
  console.error(
    'Usage: pilot allowlist list | allowlist add <emails> | allowlist remove <emails> | clear-down [--execute --confirm=DB@HOST]',
  );
  process.exit(2);
}

/** Lower-cased and trimmed, matching `RegisterDto`. Any malformed address stops the command. */
function emails(args: string[]): string[] {
  const list = args.flatMap((a) => a.split(',')).map((e) => e.trim().toLowerCase()).filter(Boolean);
  const bad = list.filter((e) => !EMAIL.test(e));
  if (list.length === 0) usage();
  if (bad.length > 0) {
    console.error(`Not an email address: ${bad.join(', ')} — nothing was changed.`);
    process.exit(1);
  }
  return [...new Set(list)];
}

async function listAllowlist(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ email: string; added_at: Date; status: string | null }>(`
    select a.email, a.added_at, m.verification_status as status
      from config.pilot_allowlist a
      left join identity.members m on m.email = a.email
     order by a.added_at, a.email`);
  const gate = await pool.query<{ value: string }>(
    `select value from config.settings where key = 'access.pilot_allowlist_active'`,
  );
  console.log(`Pilot gate: ${gate.rows[0]?.value === 'true' ? 'ON (invitation only)' : 'OFF (open registration)'}`);
  for (const r of rows) {
    console.log(`${r.email.padEnd(40)} ${(r.status ?? 'not registered').padEnd(20)} invited ${r.added_at.toISOString().slice(0, 10)}`);
  }
  const registered = rows.filter((r) => r.status).length;
  console.log(`${rows.length} invited, ${registered} registered. (Admins in ADMIN_EMAILS are always admitted.)`);
}

async function addAllowlist(pool: Pool, list: string[]): Promise<void> {
  const { rows } = await pool.query<{ email: string }>(
    `insert into config.pilot_allowlist (email) select unnest($1::text[])
     on conflict do nothing returning email`,
    [list],
  );
  const added = new Set(rows.map((r) => r.email));
  for (const e of list) console.log(`${added.has(e) ? 'added  ' : 'already'} ${e}`);
  console.log(`${added.size} added, ${list.length - added.size} already on the list.`);
}

async function removeAllowlist(pool: Pool, list: string[]): Promise<void> {
  const { rows } = await pool.query<{ email: string }>(
    `delete from config.pilot_allowlist where email = any($1::text[]) returning email`,
    [list],
  );
  console.log(`${rows.length} removed. An account already registered is not affected — suspend it from the admin console.`);
}

async function counts(pool: Pool, tables: readonly string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const t of tables) {
    const { rows } = await pool.query<{ n: string }>(`select count(*) as n from ${t}`);
    out.set(t, Number(rows[0].n));
  }
  return out;
}

async function clearDown(pool: Pool, url: string, args: string[]): Promise<void> {
  const execute = args.includes('--execute');
  const confirm = args.find((a) => a.startsWith('--confirm='))?.slice('--confirm='.length);
  const parsed = new URL(url);
  const target = `${parsed.pathname.replace(/^\//, '')}@${parsed.hostname}`;

  // Every table and materialised view in scope must be on one list or the other.
  const { rows: present } = await pool.query<{ name: string }>(
    `select n.nspname || '.' || c.relname as name
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = any($1::text[]) and c.relkind in ('r', 'm', 'p')`,
    [SCHEMAS],
  );
  const { unknown, missing } = unclassified(present.map((r) => r.name));
  if (unknown.length > 0 || missing.length > 0) {
    if (unknown.length) console.error(`Not classified as clear or keep: ${unknown.join(', ')}`);
    if (missing.length) console.error(`Listed but not in this database: ${missing.join(', ')}`);
    console.error('Update src/cli/clear-down-plan.ts before running. Nothing was changed.');
    process.exit(1);
  }

  const before = await counts(pool, [...CLEAR, ...KEEP]);
  const redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
  try {
    const keys = await scanKeys(redis);
    const queues = QUEUES_TO_EMPTY.map((name) => new Queue(name, { connection: redis }));
    const jobCounts = await Promise.all(queues.map((q) => q.getJobCountByTypes('waiting', 'delayed', 'failed', 'completed')));

    console.log(`Database: ${target}\n\nWILL BE EMPTIED`);
    for (const t of CLEAR) console.log(`  ${t.padEnd(40)} ${before.get(t)}`);
    console.log('\nKEPT');
    for (const t of KEEP) console.log(`  ${t.padEnd(40)} ${before.get(t)}`);
    console.log(`\nRedis: ${keys.length} key(s) matching ${REDIS_PATTERNS.join(', ')}`);
    QUEUES_TO_EMPTY.forEach((q, i) => console.log(`Queue ${q}: ${jobCounts[i]} job(s)`));

    if (!execute) {
      console.log(`\nDry run — nothing changed. To run it:\n  clear-down --execute --confirm=${target}`);
      await Promise.all(queues.map((q) => q.close()));
      return;
    }
    // The confirmation names the database, so a command pasted into the wrong terminal fails.
    if (confirm !== target) {
      console.error(`\n--confirm must be exactly ${target}. Nothing was changed.`);
      process.exit(1);
    }

    /*
     * One TRUNCATE, no CASCADE. Without CASCADE Postgres refuses if any *kept* table still
     * references a cleared one — so a foreign key added later cannot quietly widen what this
     * empties. It is one statement in one transaction: it all goes, or none of it does.
     */
    await pool.query(`truncate ${CLEAR.join(', ')}`);
    for (const q of queues) {
      await q.drain(true);
      await q.clean(0, 0, 'failed');
      await q.clean(0, 0, 'completed');
      await q.close();
    }
    if (keys.length > 0) await redis.del(...keys);

    const after = await counts(pool, [...CLEAR, ...KEEP]);
    const leftover = CLEAR.filter((t) => after.get(t) !== 0);
    const changed = KEEP.filter((t) => after.get(t) !== before.get(t));
    console.log('\nDone.');
    console.log(`  emptied: ${CLEAR.length} tables${leftover.length ? ` — NOT EMPTY: ${leftover.join(', ')}` : ', all now 0'}`);
    console.log(`  kept:    ${KEEP.length} tables${changed.length ? ` — CHANGED: ${changed.join(', ')}` : ', counts unchanged'}`);
    console.log(`  articles: ${after.get('research.articles')}`);
    if (leftover.length || changed.length) process.exit(1);
  } finally {
    redis.disconnect();
  }
}

async function scanKeys(redis: IORedis): Promise<string[]> {
  const found: string[] = [];
  for (const pattern of REDIS_PATTERNS) {
    let cursor = '0';
    do {
      const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
      found.push(...batch);
      cursor = next;
    } while (cursor !== '0');
  }
  return found;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
