/**
 * The closed pilot's two rules hold. `npm run verify:pilot -w apps/api`.
 *
 * No database: who is admitted (`admission`) and whether the clear-down knows every table it
 * might touch (`unclassified`) are both pure. The second is the one that matters most — a
 * table added after the clear-down was written must stop it, not be silently kept or emptied.
 */
import { admission } from '../src/auth/pilot-allowlist.service';
import { CLEAR, KEEP, unclassified } from '../src/cli/clear-down-plan';

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
check('the research corpus is kept', ['research.articles', 'research.article_tags', 'community.tags'].every((t) => (KEEP as readonly string[]).includes(t)), true);
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

if (failures > 0) {
  console.error(`\n${failures} pilot check(s) failed.`);
  process.exit(1);
}
console.log('\nAll pilot checks passed.');
