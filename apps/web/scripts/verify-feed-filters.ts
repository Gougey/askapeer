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

check('an empty tag parameter never reaches the API — the crash this exists for', () => {
  const parsed = parseFeedFilters({ f: '1', tag: '' });
  assert.deepEqual(parsed.tags, []);
  assert.equal(parsed.asked, true, 'an empty tag still means the URL asked to be filtered');
});

check('a tag that is not a UUID is dropped, and its siblings survive', () => {
  const good = '2777a125-7524-5837-8fb4-9c2fe3df3f4b';
  assert.deepEqual(parseFeedFilters({ tag: ['', good, 'not-a-uuid'] }).tags, [good]);
});

check('uuid5 ids are accepted — the taxonomy has no v4 in it', () => {
  // Version nibble 5, exactly as migration 0010 derives them.
  assert.equal(parseFeedFilters({ tag: '13817ae4-4642-5c85-97c8-8636221345cb' }).tags.length, 1);
});

check('an id the API would refuse is dropped, variant nibble and all', () => {
  // `Hand joints` as migration 0045 wrote it: the fourth group starts `d`, which is not a
  // legal RFC 4122 variant, so `@IsUUID` refuses it and the page must not forward it.
  assert.deepEqual(parseFeedFilters({ tag: '8e5293b4-af61-5032-d375-61aea0802c55' }).tags, []);
  // …and as migration 0047 re-keyed it.
  assert.equal(parseFeedFilters({ tag: 'f77b8e1a-65a8-5ef2-bb35-7470b6ef0ee6' }).tags.length, 1);
});

check('a repeated tag is deduplicated', () => {
  const id = 'a30aa659-e562-5f1e-9272-f418e2987a60';
  assert.deepEqual(parseFeedFilters({ tag: [id, id] }).tags, [id]);
});

check('one tag arrives as a string, several as an array', () => {
  const id = 'a30aa659-e562-5f1e-9272-f418e2987a60';
  assert.deepEqual(parseFeedFilters({ tag: id }).tags, [id]);
});

check('empty evidence, years and sort are dropped rather than forwarded', () => {
  // The shape a browser submits before hydration, or with JavaScript off.
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
  assert.equal(parseFeedFilters({ years: '6' }).years, undefined);
  assert.equal(parseFeedFilters({ years: '-1' }).years, undefined);
  assert.equal(parseFeedFilters({ years: 'two' }).years, undefined);
  assert.equal(parseFeedFilters({ years: '2.5' }).years, undefined);
  // Not only the four the panel offers: an older bookmark asking for 4 is a good question.
  assert.equal(parseFeedFilters({ years: '4' }).years, 4);
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

check('f alone means the panel was cleared, which is not the same as untouched', () => {
  assert.equal(parseFeedFilters({ f: '1' }).asked, true);
});

if (failures > 0) {
  console.error(`\n${failures} feed-filter check(s) failed.`);
  process.exit(1);
}
console.log('PASS');
