/**
 * "Nothing I can do right now" must never be recorded as "nothing left to do".
 *
 * The backfill is a chain: each job does a bounded piece of work and enqueues the next, and it
 * enqueues the next **only when the run says it is not done**. So `done` is not a status line,
 * it is the kill switch for the whole import.
 *
 * On 2026-10-07 at 16:21 it was thrown by accident. OpenAlex hit its daily quota and went into
 * `coolingUntil`; the slice query excludes a resting source; Europe PMC's last slice was sitting
 * in `running` and was not yet ten minutes stale. Nothing was selectable, so the run answered
 * `done` — with **479 slices pending** — and the import was dead for forty-two hours. An empty
 * queue, no failed job, nothing in the log: it was found by counting rows.
 *
 * The rule this pins: only an empty worklist ends the chain. Everything else is a wait.
 *
 * Run: npm run verify:backfill-chain -w apps/api
 */
import { strict as assert } from 'node:assert';
import { chainNextStep } from '../src/research-feed/backfill.service';

const NOW = 1_760_000_000_000;
const MINUTE = 60_000;

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

check('the 7 October stall: a rested source with work behind it is a wait, not an ending', () => {
  const step = chainNextStep({
    outstanding: 479,
    restingUntil: [NOW + 150 * MINUTE], // OpenAlex asked for two and a half hours
    nextStaleAt: null,
    now: NOW,
  });
  assert.equal(step.done, false, 'reported done with 479 slices pending');
});

check('a slice abandoned a minute ago is nine minutes from reclaim, not lost', () => {
  const step = chainNextStep({
    outstanding: 1,
    restingUntil: [],
    nextStaleAt: NOW + 9 * MINUTE,
    now: NOW,
  });
  assert.equal(step.done, false);
  assert.equal(step.done === false && step.retryInMs, 9 * MINUTE);
});

check('an empty worklist is the one thing that ends the chain', () => {
  assert.equal(
    chainNextStep({ outstanding: 0, restingUntil: [NOW + MINUTE], nextStaleAt: null, now: NOW })
      .done,
    true,
  );
  assert.equal(
    chainNextStep({ outstanding: 0, restingUntil: [], nextStaleAt: null, now: NOW }).done,
    true,
  );
});

check('expired cooldowns are not waited on', () => {
  // A deploy clears `coolingUntil` anyway; a stale timestamp must not add a delay on top.
  const step = chainNextStep({
    outstanding: 5,
    restingUntil: [NOW - MINUTE, NOW - 60 * MINUTE],
    nextStaleAt: null,
    now: NOW,
  });
  assert.equal(step.done, false);
  assert.equal(step.done === false && step.retryInMs, 30_000, 'should fall back to the floor');
});

check('the wait is the soonest thing that frees up', () => {
  const step = chainNextStep({
    outstanding: 9,
    restingUntil: [NOW + 8 * MINUTE, NOW + 2 * MINUTE],
    nextStaleAt: NOW + 5 * MINUTE,
    now: NOW,
  });
  assert.equal(step.done === false && step.retryInMs, 2 * MINUTE);
});

check('a long quota is re-checked rather than slept through', () => {
  /*
   * ⚠️ OpenAlex once asked for 9,051 seconds. The chain must not take a two-and-a-half-hour nap
   * on one delayed job: `coolingUntil` is in memory, so a deploy in between clears it and the
   * source is usable long before the timer says. Wake sooner, re-decide, cost nothing.
   */
  const step = chainNextStep({
    outstanding: 100,
    restingUntil: [NOW + 9_051_000],
    nextStaleAt: null,
    now: NOW,
  });
  assert.equal(step.done === false && step.retryInMs, 10 * MINUTE);
});

check('a floor stops a selection bug becoming a spin', () => {
  const step = chainNextStep({
    outstanding: 1,
    restingUntil: [NOW + 1],
    nextStaleAt: null,
    now: NOW,
  });
  assert.ok(step.done === false && step.retryInMs >= 30_000);
});

if (failures > 0) {
  console.error(`\n${failures} backfill-chain check(s) failed.`);
  process.exit(1);
}
console.log('PASS');
