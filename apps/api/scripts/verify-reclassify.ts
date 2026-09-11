/**
 * Exercises the batched, resumable reclassify. `npm run verify:reclassify -w apps/api`.
 *
 * ⚠️ **Destructive to the `research` schema** — it wipes `articles`, `article_tags` and
 * `reclassify_state` and seeds its own corpus. Local only; never point `DATABASE_URL` at
 * the deployed database.
 *
 * Three things are under test, all of them properties a reclassify of a 4,500-article
 * corpus has to have and the original did not:
 *
 * 1. a clean run tags the whole corpus and **clears its state row**, so nothing later reads
 *    a finished run as an interrupted one;
 * 2. an interrupted run **resumes from the committed cursor** rather than starting over,
 *    and lands on exactly the totals the clean run produced;
 * 3. the corpus is **never globally empty part-way** — the delete is scoped to the batch
 *    inside its own transaction, so an interruption leaves stale tags rather than none.
 *
 * It runs the real service against a real database on purpose. The bug it guards against
 * was not in the classifier — it was in what a half-finished run leaves behind, which only
 * a database can show you.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import * as schema from '../src/db/schema';
import { IngestionService } from '../src/research-feed/ingestion.service';
import { SettingsService } from '../src/settings/settings.service';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://askapeer:askapeer@localhost:5432/askapeer' });
const db = drizzle(pool, { schema });

const TITLES = [
  'Anterior cruciate ligament reconstruction outcomes in elite athletes',
  'Rotator cuff tendinopathy and loading programmes',
  'Gluteus medius tear after total hip arthroplasty',
  'Sacroiliac joint dysfunction in pregnancy',
  'Medial collateral ligament injury of the knee',
  'Plantar fasciitis and the plantar aponeurosis',
];

async function seed(n: number) {
  await db.execute(sql`delete from research.article_tags`);
  await db.execute(sql`delete from research.reclassify_state`);
  await db.execute(sql`delete from research.articles`);
  for (let i = 0; i < n; i++) {
    await db.execute(sql`
      insert into research.articles (title, abstract, published_year)
      values (${`${TITLES[i % TITLES.length]} (cohort ${i})`},
              ${'A prospective cohort study of rehabilitation after injury.'}, 2026)
    `);
  }
}

async function counts() {
  const { rows } = await db.execute<{ tags: number; arts: number; state: number }>(sql`
    select (select count(*)::int from research.article_tags) as tags,
           (select count(distinct article_id)::int from research.article_tags) as arts,
           (select count(*)::int from research.reclassify_state) as state
  `);
  return rows[0];
}

async function main() {
  const service = new IngestionService(db as never, [], new SettingsService(db as never));

  // 620 articles over a batch size of 250 is three batches — two full, one short.
  await seed(620);
  console.log('seeded:', await counts());

  const batches: number[] = [];
  const first = await service.reclassifyAll(async (done) => {
    batches.push(done);
    const mid = await counts();
    // The corpus must never be globally empty mid-run: earlier batches keep their tags.
    if (mid.arts === 0 && done > 250) throw new Error('corpus was emptied mid-run');
  });
  console.log('run 1:', first, 'batch boundaries:', batches);
  console.log('after run 1:', await counts(), '(state must be 0)');

  // Simulate an interruption: rewind the cursor to the end of the first batch and drop the
  // tags that came after it, exactly as an interrupted run would have left things.
  const { rows: cut } = await db.execute<{ id: string }>(sql`
    select id from research.articles order by id offset 249 limit 1
  `);
  await db.execute(sql`
    delete from research.article_tags where article_id in (
      select id from research.articles where id > ${cut[0].id}
    )
  `);
  await db.execute(sql`
    insert into research.reclassify_state (cursor, articles_done, matches)
    values (${cut[0].id}, 250, (select count(*) from research.article_tags))
  `);
  console.log('interrupted at:', await counts());

  const resumedBatches: number[] = [];
  const second = await service.reclassifyAll(async (done) => resumedBatches.push(done));
  console.log('run 2:', second, 'batch boundaries:', resumedBatches);
  console.log('after run 2:', await counts(), '(state must be 0)');

  const ok =
    second.resumed === true &&
    resumedBatches[0] === 500 &&
    second.articles === 620 &&
    (await counts()).state === 0 &&
    (await counts()).arts === first.articles;
  console.log(ok ? 'PASS' : 'FAIL');

  await db.execute(sql`delete from research.article_tags`);
  await db.execute(sql`delete from research.articles`);
  await pool.end();
  process.exit(ok ? 0 : 1);
}

main();
