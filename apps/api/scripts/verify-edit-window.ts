/**
 * The edit window behaves as agreed. `npm run verify:edit-window -w apps/api`.
 *
 * No database and no network — `editRefusal` is a pure function, which is the whole reason
 * the rule was extracted into one. The `canEdit` the API advertises and the check it enforces
 * both call it, so a disagreement between what the member is offered and what the server
 * allows is impossible by construction rather than by care.
 *
 * The rule: **editable until something responds, and never beyond 24 hours.** Both halves are
 * necessary. Engagement is the real gate — a kudos endorses *that* text, an answer replies to
 * *that* question — and 24 hours is the backstop for reading, which leaves no trace to gate
 * on.
 */
import { EDIT_WINDOW_MS, editRefusal, type EditRefusal } from '../src/forum/edit-window';

const NOW = new Date('2026-09-18T12:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

type Case = {
  name: string;
  input: Parameters<typeof editRefusal>[0];
  expect: EditRefusal | null;
};

const base = { editable: true, isAuthor: true, hasEngagement: false, now: NOW };

const CASES: Case[] = [
  {
    name: 'the ordinary case — your own, fresh, untouched',
    input: { ...base, createdAt: ago(5 * MINUTE) },
    expect: null,
  },
  {
    name: 'someone else\'s is never editable',
    input: { ...base, isAuthor: false, createdAt: ago(5 * MINUTE) },
    expect: 'not_author',
  },
  {
    name: 'a kudos, an answer or a report closes it immediately',
    input: { ...base, hasEngagement: true, createdAt: ago(1 * MINUTE) },
    expect: 'has_engagement',
  },
  {
    name: 'a case discussion is never editable here — it goes through the correction loop',
    input: { ...base, editable: false, createdAt: ago(1 * MINUTE) },
    expect: 'not_editable',
  },
  {
    name: 'untouched but a day old: the backstop closes it',
    input: { ...base, createdAt: ago(25 * HOUR) },
    expect: 'window_closed',
  },
  {
    name: 'just inside 24 hours',
    input: { ...base, createdAt: ago(EDIT_WINDOW_MS - MINUTE) },
    expect: null,
  },
  {
    name: 'exactly 24 hours is outside — the window is closed at the boundary, not at it plus one',
    input: { ...base, createdAt: ago(EDIT_WINDOW_MS) },
    expect: 'window_closed',
  },
  {
    name: 'both expired: engagement is the more useful thing to say',
    input: { ...base, hasEngagement: true, createdAt: ago(30 * HOUR) },
    expect: 'has_engagement',
  },
  {
    name: 'not the author *and* engaged: authorship is reported first, since it never changes',
    input: { ...base, isAuthor: false, hasEngagement: true, createdAt: ago(1 * MINUTE) },
    expect: 'not_author',
  },
];

let failed = 0;
for (const c of CASES) {
  const got = editRefusal(c.input);
  const ok = got === c.expect;
  if (!ok) failed += 1;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${c.name}`);
  if (!ok) console.log(`        expected ${String(c.expect)} but got ${String(got)}`);
}

console.log(failed === 0 ? 'PASS' : `FAIL — ${failed} of ${CASES.length}`);
process.exit(failed === 0 ? 0 : 1);
