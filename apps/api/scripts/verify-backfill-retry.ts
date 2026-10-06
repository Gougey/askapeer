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
import { retryAfterMs, retryable } from '../src/research-feed/backfill.service';

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
  ]) {
    assert.equal(retryable(message), false, message);
  }
});

check('5xx is the server struggling, not this slice being wrong', () => {
  /*
   * ⚠️ This assertion used to say the opposite, on the reasoning that a source erroring on one
   * query would do it again. That holds for a 4xx, which is about the request. It is wrong for
   * a 5xx, which is about the server — and it cost 80 slices: after a quota burst OpenAlex
   * answered 503 all night, every one written off permanently, while Europe PMC took 92 slices
   * without a murmur.
   */
  for (const message of [
    'OpenAlex HTTP 500',
    'OpenAlex HTTP 502',
    'OpenAlex HTTP 503',
    'OpenAlex HTTP 504',
    'Europe PMC HTTP 503',
    'OpenAlex HTTP 503 retry-after 900s',
  ]) {
    assert.equal(retryable(message), true, message);
  }
});

check('a 4xx that is about the request is still written off', () => {
  // The distinction the 5xx change must not blur: these will fail identically next time.
  for (const message of ['OpenAlex HTTP 404', 'Europe PMC HTTP 400', 'OpenAlex HTTP 422']) {
    assert.equal(retryable(message), false, message);
  }
});

check('a long Retry-After is read back, so the source can be rested', () => {
  /*
   * ⚠️ OpenAlex asked for 9,051 seconds — two and a half hours — and the first version slept
   * on it inside the request. The worker has one slot, so that single sleep stopped the whole
   * backfill, Europe PMC included, and would have outlived its job lock many times over.
   * A number this size is a daily quota, not a pause: it has to come back as data.
   */
  assert.equal(retryAfterMs('OpenAlex HTTP 429 retry-after 9051s'), 9_051_000);
  assert.equal(retryAfterMs('OpenAlex HTTP 429 retry-after 30s'), 30_000);
});

check('an ordinary refusal carries no rest period', () => {
  for (const message of ['OpenAlex HTTP 429', 'fetch failed', 'Europe PMC HTTP 500']) {
    assert.equal(retryAfterMs(message), null, message);
  }
});

check('a message carrying a rest period is still retryable', () => {
  // Both halves have to agree, or the slice is rested *and* written off.
  assert.equal(retryable('OpenAlex HTTP 429 retry-after 9051s'), true);
});

if (failures > 0) {
  console.error(`\n${failures} backfill-retry check(s) failed.`);
  process.exit(1);
}
console.log('PASS');
