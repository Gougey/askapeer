/**
 * The Discussions search's URL parsing, pinned.
 *
 * The same lesson as `verify-feed-filters.ts`: the API refuses a value it does not recognise,
 * `apiGet` throws on the 400, and the member gets an error page. Old `/search` links redirect
 * here with whatever they carried, so this page sees URLs nobody here wrote.
 *
 * The rule: **nothing the API would reject may leave the parser**, and only criteria that
 * survive count as a search, because an empty search returns nothing where the list should be.
 *
 * Run: npm run verify:discussion-filters -w apps/web
 */
import { strict as assert } from 'node:assert';
import { discussionFilterParams, parseDiscussionFilters } from '../src/lib/discussion-filters';

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

const A = '5ff0c8f0-cf01-5858-9531-3d948b33f3f5'; // uuid5, as the taxonomy's ids are
const B = '8f154a67-48e9-5121-9939-30cd821acf0e';
const C = 'facea412-97a9-5f0d-a0cc-64ee53f72e62';
const D = '11111111-2222-5333-8444-555555555555';

check('a bare visit is the list', () => {
  assert.equal(parseDiscussionFilters({}).asked, false);
});
check('a list page cursor alone is not a search', () => {
  assert.equal(parseDiscussionFilters({ cursor: 'abc' }).asked, false);
});
check('a keyword is trimmed, and blank is nothing', () => {
  assert.equal(parseDiscussionFilters({ q: '  knee ' }).q, 'knee');
  assert.equal(parseDiscussionFilters({ q: '   ' }).asked, false);
});
check('a keyword longer than the API accepts is cut, not sent', () => {
  assert.equal(parseDiscussionFilters({ q: 'x'.repeat(500) }).q?.length, 200);
});
check('one tag arrives as a string and is still a tag', () => {
  assert.deepEqual(parseDiscussionFilters({ tag: A }).tags, [A]);
  assert.equal(parseDiscussionFilters({ tag: A }).asked, true);
});
check('an empty or malformed tag is dropped: this exact value took My Research down', () => {
  assert.deepEqual(parseDiscussionFilters({ tag: '' }).tags, []);
  assert.deepEqual(parseDiscussionFilters({ tag: ['not-a-uuid', A] }).tags, [A]);
});
check('a URL of nothing but rubbish falls back to the list', () => {
  assert.equal(parseDiscussionFilters({ tag: 'rubbish', type: 'poll', sort: 'best' }).asked, false);
});
check('no more than the three tags the API allows, and no repeats', () => {
  assert.deepEqual(parseDiscussionFilters({ tag: [A, A, B, C, D] }).tags, [A, B, C]);
});
check('an unknown type is dropped', () => {
  assert.equal(parseDiscussionFilters({ type: 'poll' }).type, undefined);
  assert.equal(parseDiscussionFilters({ type: 'case_discussion' }).type, 'case_discussion');
});
check('a sort needs a keyword', () => {
  assert.equal(parseDiscussionFilters({ sort: 'relevance' }).sort, undefined);
  assert.equal(parseDiscussionFilters({ q: 'knee', sort: 'newest' }).sort, 'newest');
  assert.equal(parseDiscussionFilters({ sort: 'relevance' }).asked, false);
});
check('the same criteria always give the same scroll-history key', () => {
  const one = discussionFilterParams(parseDiscussionFilters({ q: 'knee', tag: [A, B] })).toString();
  const two = discussionFilterParams(parseDiscussionFilters({ q: ' knee ', tag: [A, B], cursor: '20' })).toString();
  assert.equal(one, two);
  assert.notEqual(one, discussionFilterParams(parseDiscussionFilters({ q: 'knee' })).toString());
});

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall discussion-filter checks passed');
