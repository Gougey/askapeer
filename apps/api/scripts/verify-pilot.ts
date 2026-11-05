/**
 * The closed pilot's two rules hold. `npm run verify:pilot -w apps/api`.
 *
 * No database: who is admitted (`admission`) and whether the clear-down knows every table it
 * might touch (`unclassified`) are both pure. The second is the one that matters most — a
 * table added after the clear-down was written must stop it, not be silently kept or emptied.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { admission } from '../src/auth/pilot-allowlist.service';
import { CLEAR, KEEP, SCHEMAS, unclassified } from '../src/cli/clear-down-plan';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n      expected ${JSON.stringify(expected)}\n      got      ${JSON.stringify(actual)}`}`);
}

// --- Admission.
check('gate off: everyone takes the ordinary pipeline', admission({ gateActive: false, onList: false, isAdmin: false }), 'open');
check('gate on, invited: approved on registration', admission({ gateActive: true, onList: true, isAdmin: false }), 'pilot');
check('gate on, admin not on the list: still admitted', admission({ gateActive: true, onList: false, isAdmin: true }), 'pilot');
check('gate on, a stranger: refused', admission({ gateActive: true, onList: false, isAdmin: false }), 'closed');

// --- The clear-down's lists.
const all = [...CLEAR, ...KEEP];
check('the lists never overlap', CLEAR.filter((t) => (KEEP as readonly string[]).includes(t)), []);
check('the research corpus and vocabulary are kept', ['research.articles', 'research.article_tags', 'community.tags', 'community.search_abbreviations'].every((t) => (KEEP as readonly string[]).includes(t)), true);
check('every member table is cleared', ['identity.members', 'community.handles', 'community.posts'].every((t) => (CLEAR as readonly string[]).includes(t)), true);
check('the invitation list survives a clear-down', (KEEP as readonly string[]).includes('config.pilot_allowlist'), true);
check('a database matching the lists passes', unclassified(all), { unknown: [], missing: [] });
check(
  'a new table stops the run',
  unclassified([...all, 'community.direct_messages']),
  { unknown: ['community.direct_messages'], missing: [] },
);
check(
  'a dropped table stops the run',
  unclassified(all.filter((t) => t !== 'community.follows')),
  { unknown: [], missing: ['community.follows'] },
);

/*
 * ⚠️ **The tool's own guard only speaks up on the day it is run**, which is the worst day to learn
 * a table was never classified. Migration 0060 added `community.search_abbreviations`, nothing
 * noticed, and it was only found while planning the live run. So the migrations are read here:
 * every table they create in scope has to be on a list before the change can merge.
 */
const drizzle = resolve(__dirname, '../drizzle');
const created = readdirSync(drizzle)
  .filter((file) => file.endsWith('.sql'))
  .flatMap((file) =>
    [
      ...readFileSync(resolve(drizzle, file), 'utf8').matchAll(
        /CREATE (?:MATERIALIZED VIEW|TABLE)(?: IF NOT EXISTS)? "?([a-z_]+)"?\."?([a-z_]+)"?/gi,
      ),
    ].map(([, schema, table]) => `${schema}.${table}`),
  )
  .filter((name) => (SCHEMAS as readonly string[]).includes(name.split('.')[0]));
check('the migrations create at least the tables on the lists', created.length >= all.length, true);
check('every table the migrations create is cleared or kept', unclassified(created), { unknown: [], missing: [] });

if (failures > 0) {
  console.error(`\n${failures} pilot check(s) failed.`);
  process.exit(1);
}
console.log('\nAll pilot checks passed.');
