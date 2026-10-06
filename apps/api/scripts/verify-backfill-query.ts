/**
 * The rested-source filter must survive being used.
 *
 * ⚠️ This is the guard for a defect that killed a ten-hour import silently. The filter was
 * hand-written as `${column} <> all(${resting}::text[])`, which binds a JS array as a *scalar*
 * — Postgres was handed `('open-alex')::text[]`, an invalid array literal, and **every**
 * `runNext` threw the moment a source was actually rested. BullMQ retried twice, gave up, and
 * nothing re-enqueues a failed job: the chain stopped with 886 slices to go and no error
 * anywhere a person would look. Articles sat at 55,592 for over an hour before anyone noticed.
 *
 * Local testing had not caught it because the resting path only runs once a source refuses us,
 * and a healthy local run never does. So this checks the SQL itself, with no database: the
 * parameters must come out as a list the driver can bind, never one string.
 *
 * Run: npm run verify:backfill-query -w apps/api
 */
import { strict as assert } from 'node:assert';
import { and, desc, eq, notInArray, or, sql } from 'drizzle-orm';
import { QueryBuilder } from 'drizzle-orm/pg-core';
import { backfillSlices } from '../src/db/schema';

let failures = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`pass  ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL  ${name}\n      ${(error as Error).message.split('\n')[0]}`);
  }
}

/** The same shape `BackfillService.runNext` builds, which is the point of checking it. */
function nextSliceSql(resting: string[]) {
  return new QueryBuilder()
    .select()
    .from(backfillSlices)
    .where(
      and(
        or(
          eq(backfillSlices.status, 'pending'),
          and(
            eq(backfillSlices.status, 'running'),
            sql`${backfillSlices.updatedAt} < now() - (${10} * interval '1 minute')`,
          ),
        ),
        resting.length === 0 ? undefined : notInArray(backfillSlices.sourceName, resting),
      ),
    )
    .orderBy(desc(backfillSlices.windowStart))
    .toSQL();
}

check('one rested source binds as a value, not a stringified array', () => {
  const { sql: text, params } = nextSliceSql(['open-alex']);
  assert.ok(
    !/::text\[\]/.test(text),
    'a hand-rolled ::text[] cast is what bound the array as a scalar last time',
  );
  assert.ok(params.includes('open-alex'), `'open-alex' must be a bound parameter: ${params}`);
});

check('two rested sources both reach the query', () => {
  const { params } = nextSliceSql(['open-alex', 'europe-pmc']);
  for (const name of ['open-alex', 'europe-pmc']) {
    assert.ok(params.includes(name), `${name} missing from ${params}`);
  }
});

check('no rested source leaves the clause out entirely', () => {
  const { sql: text, params } = nextSliceSql([]);
  assert.ok(!/source_name/.test(text.split('order by')[0].split('where')[1] ?? ''), text);
  assert.ok(!params.includes('open-alex'));
});

check('the status and staleness conditions survive alongside it', () => {
  const { sql: text } = nextSliceSql(['open-alex']);
  assert.ok(/status/.test(text), 'the pending/running test must still be there');
  assert.ok(/interval/.test(text), 'the stale-slice window must still be there');
});

if (failures > 0) {
  console.error(`\n${failures} backfill-query check(s) failed.`);
  process.exit(1);
}
console.log('PASS');
