/**
 * The Research feed's URL parsing, pinned.
 *
 * The parser is a pure function precisely so this can be checked here rather than found on
 * live — which is how it *was* found. `/feed?…&tag=` reached the API as
 * `each value in tag must be a UUID`, the API answered 400, `apiGet` threw, and the member
 * got an error page instead of a feed. `tag` was the one filter passed through unchecked
 * while `q`, `evidence`, `years` and `sort` were all sanitised.
 *
 * The rule this locks down: **nothing the API would reject may leave the parser**, and a URL
 * that asked for something still counts as having asked even when every value in it was
 * rubbish — otherwise a bad filter silently falls back to the member's saved settings and
 * says nothing about it.
 *
 * Run: npm run verify:feed-filters -w apps/web
 */
import { strict as assert } from 'node:assert';
import { parseFeedFilters } from '../src/lib/feed-filters';

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

check('an empty value never reaches the API — the crash this exists for', () => {
  /*
   * The shape a browser submits before hydration, or with JavaScript off. An empty value is
   * not "no filter" to the API: `evidence=` is refused outright, and `years=` fails the
   * minimum. Each one is a 400 and an error page unless it is dropped here.
   */
  const parsed = parseFeedFilters({ f: '1', q: '', evidence: '', years: '', sort: '' });
  assert.equal(parsed.q, undefined);
  assert.equal(parsed.evidence, undefined);
  assert.equal(parsed.years, undefined);
  assert.equal(parsed.sort, undefined);
  assert.equal(parsed.asked, true);
});

check('an unknown evidence type or sort is dropped', () => {
  assert.equal(parseFeedFilters({ evidence: 'meta_analysis' }).evidence, undefined);
  assert.equal(parseFeedFilters({ sort: 'kudos' }).sort, undefined);
});

check('the period is clamped to what the API accepts', () => {
  assert.equal(parseFeedFilters({ years: '0' }).years, undefined);
  assert.equal(parseFeedFilters({ years: '-1' }).years, undefined);
  assert.equal(parseFeedFilters({ years: 'two' }).years, undefined);
  assert.equal(parseFeedFilters({ years: '2.5' }).years, undefined);
  /*
   * ⚠️ The ceiling moved from 5 to 15 with the 25-year backfill, and four places have to agree
   * on it: this parser, the DTO's `@Max`, the `feed_preferences` CHECK constraint, and the
   * options the panel offers. A value past it is refused by the API with a 400, which the page
   * turns into an error screen — so the parser must drop it rather than forward it.
   */
  assert.equal(parseFeedFilters({ years: '16' }).years, undefined);
  assert.equal(parseFeedFilters({ years: '15' }).years, 15);
  // Not only the four the panel offers: an older bookmark asking for 4 is a good question.
  assert.equal(parseFeedFilters({ years: '4' }).years, 4);
  assert.equal(parseFeedFilters({ years: '2' }).years, 2);
});

check('a whitespace-only keyword is not a keyword, and did not ask for anything', () => {
  const parsed = parseFeedFilters({ q: '   ' });
  assert.equal(parsed.q, undefined);
  assert.equal(parsed.asked, false);
});

check('an untouched URL has asked for nothing, so the saved settings apply', () => {
  assert.equal(parseFeedFilters({}).asked, false);
  assert.equal(parseFeedFilters({ cursor: '20' }).asked, false);
});

check('f alone is an Apply with no criteria — the whole corpus, not an untouched screen', () => {
  // ⚠️ Load-bearing: My Research shows nothing until something is asked, so "applied with
  // every field empty" has to be distinguishable from "just arrived".
  assert.equal(parseFeedFilters({ f: '1' }).asked, true);
});

check('a URL of pure rubbish has still asked, so the member is not shown an empty screen', () => {
  const parsed = parseFeedFilters({ evidence: 'meta_analysis', years: '99', sort: 'kudos' });
  assert.equal(parsed.asked, true);
  assert.equal(parsed.evidence, undefined);
  assert.equal(parsed.years, undefined);
  assert.equal(parsed.sort, undefined);
});

if (failures > 0) {
  console.error(`\n${failures} feed-filter check(s) failed.`);
  process.exit(1);
}
console.log('PASS');
