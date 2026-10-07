/**
 * No mail may be attempted to an address that cannot exist.
 *
 * ⚠️ A sender-reputation control, not tidiness. Measured on live: **8 bounces in 81 sends, a
 * 9.9% bounce rate** — every one of them a seeded demo account at `@demo.askapeer.invalid`,
 * and ~10% is where Postmark starts acting on a sender. Every real member's sign-in code
 * travels on that reputation, so a demo account must not be able to spend it.
 *
 * The rule is by reserved domain rather than by naming the demo one, because the next seed
 * will invent a different domain and the rule is the same for all of them.
 *
 * Run: npm run verify:undeliverable -w apps/api
 */
import { strict as assert } from 'node:assert';
import { isUndeliverable } from '../src/notifications/email/undeliverable';

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

check('the demo accounts that cost 9.9% of our bounce rate', () => {
  for (const address of [
    'returntoplay@demo.askapeer.invalid',
    'kneegeek_99@demo.askapeer.invalid',
    'HandTherapyH@DEMO.ASKAPEER.INVALID',
  ]) {
    assert.equal(isUndeliverable(address), true, address);
  }
});

check('every reserved domain in RFC 2606 and RFC 6761', () => {
  for (const address of [
    'a@something.invalid',
    'a@invalid',
    'a@host.test',
    'a@thing.example',
    'a@localhost',
    'a@example.com',
    'a@example.net',
    'a@example.org',
  ]) {
    assert.equal(isUndeliverable(address), true, address);
  }
});

check('a trailing dot or stray case does not smuggle one through', () => {
  assert.equal(isUndeliverable('a@demo.askapeer.invalid.'), true);
  assert.equal(isUndeliverable('  A@Demo.Askapeer.Invalid  '), true);
});

check('malformed input is refused rather than attempted', () => {
  for (const address of ['', 'not-an-address', 'a@', '@b.com']) {
    assert.equal(isUndeliverable(address), true, JSON.stringify(address));
  }
});

check('⚠️ real addresses still send — the rule must not be greedy', () => {
  for (const address of [
    'shadeyhall@gmail.com',
    'andrew@nhs.net',
    'a.person@physio.co.uk',
    'someone@invalidate.com',
    'someone@notexample.com',
    'someone@testing.org',
    'no-reply@mail.askapeer.co.uk',
  ]) {
    assert.equal(isUndeliverable(address), false, address);
  }
});

if (failures > 0) {
  console.error(`\n${failures} undeliverable check(s) failed.`);
  process.exit(1);
}
console.log('PASS');
