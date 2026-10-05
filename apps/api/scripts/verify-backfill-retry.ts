/**
 * "Slow down" must never be recorded as "broken".
 *
 * The first live backfill asked OpenAlex for pages as fast as it could store them, was
 * rate-limited within minutes, and wrote **67 slices off as failed** — 67 source-years of
 * literature silently abandoned, because nothing ever retries a failure. Europe PMC beside it
 * did not drop a request.
 *
 * The rule this pins: a refusal that is about *this moment* leaves the slice retryable, and
 * only a fault that is about *this slice* writes it off. Pure function, checked here rather
 * than rediscovered on a ten-hour run.
 *
 * Run: npm run verify:backfill-retry -w apps/api
 */
import { strict as assert } from 'node:assert';
import { retryable } from '../src/research-feed/backfill.service';

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

check('the 429 that cost 67 slices is retryable', () => {
  assert.equal(retryable('OpenAlex HTTP 429'), true);
});

check('transport trouble is this moment, not this slice', () => {
  for (const message of [
    'Europe PMC HTTP 429',
    'fetch failed',
    'The operation was aborted',
    'connect ETIMEDOUT 10.0.0.1:443',
    'read ECONNRESET',
    'socket hang up',
    'Too Many Requests — rate limit exceeded',
  ]) {
    assert.equal(retryable(message), true, message);
  }
});

check('a real fault is written off rather than retried forever', () => {
  for (const message of [
    'no such source: semantic-scholar',
    'OpenAlex HTTP 404',
    'Europe PMC HTTP 400',
    'invalid input syntax for type uuid',
    'null value in column "title" violates not-null constraint',
  ]) {
    assert.equal(retryable(message), false, message);
  }
});

check('a 500 is not quietly retried for ever either', () => {
  // Deliberate: a source erroring on *this query* will do so again, and an endless retry
  // would hide it. A human deciding to re-run beats a loop that never reports.
  assert.equal(retryable('OpenAlex HTTP 500'), false);
});

if (failures > 0) {
  console.error(`\n${failures} backfill-retry check(s) failed.`);
  process.exit(1);
}
console.log('PASS');
