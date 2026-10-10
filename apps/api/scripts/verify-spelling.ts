/**
 * Search spelling correction behaves as agreed. `npm run verify:spelling -w apps/api`.
 *
 * No database and no network — the deciding half of the correction is pure (`spelling.ts`),
 * and the database only supplies which words are unknown and which dictionary words are near
 * them. The candidate lists below are the shapes the dictionary actually returned when this
 * was built (2026-10-10), including the two it got wrong by trigram similarity alone.
 */
import {
  applyCorrections,
  chooseCorrection,
  correctableWords,
  editDistance,
  type Candidate,
} from '../src/search/spelling';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n      expected ${JSON.stringify(expected)}\n      got      ${JSON.stringify(actual)}`}`);
}

const c = (word: string, ndoc: number): Candidate => ({ word, ndoc });

// --- Edit distance: a swapped pair is one edit, which is the commonest phone typo.
check('transposition is one edit', editDistance('ligamnet', 'ligament'), 1);
check('insertion is one edit', editDistance('fascitis', 'fasciitis'), 1);
check('identical is zero', editDistance('ankle', 'ankle'), 0);

// --- Choosing: nearest wins over most similar by trigrams, then commonest among equals.
check(
  '"ligamnet" → ligament, not the trigram favourite "liga"',
  chooseCorrection('ligamnet', [c('liga', 4), c('ligament', 2779), c('ligaments', 155)]),
  'ligament',
);
check(
  '"ankel" → ankle, not "ankh" (same distance, far fewer papers)',
  chooseCorrection('ankel', [c('ankh', 2), c('ankle', 778), c('ankles', 48)]),
  'ankle',
);
check(
  '"sholder" → shoulder, not "shareholder"',
  chooseCorrection('sholder', [c('shoulder', 1654), c('shareholder', 2), c('holder', 4)]),
  'shoulder',
);
check('a short word is never guessed at', chooseCorrection('ti', [c('tip', 27), c('tis', 7)]), null);
check(
  'nothing near enough is no correction',
  chooseCorrection('zzzzzzz', [c('zygote', 3)]),
  null,
);

// --- Which tokens are words worth asking about.
check(
  'negations, operators and codes are left alone',
  correctableWords('knee -runnr or "patela" ACL-R T2 L4/5'),
  ['knee', 'patela'],
);

// --- Rebuilding the query.
check(
  "Andrew's query: the stray short word is dropped",
  applyCorrections(
    'ankle ligament testing return ti sport',
    new Set(['ti']),
    new Map([['ti', null]]),
  ),
  { query: 'ankle ligament testing return sport', changes: [{ from: 'ti', to: null }] },
);
check(
  'a correction keeps the quotes it was wearing',
  applyCorrections('"plantar fascitis" runners', new Set(['fascitis']), new Map([['fascitis', 'fasciitis']])),
  { query: '"plantar fasciitis" runners', changes: [{ from: 'fascitis', to: 'fasciitis' }] },
);
check(
  'a repeated word is reported once',
  applyCorrections('sholder or sholder', new Set(['sholder']), new Map([['sholder', 'shoulder']])),
  { query: 'shoulder or shoulder', changes: [{ from: 'sholder', to: 'shoulder' }] },
);
check('nothing unknown is no correction', applyCorrections('ankle sprain', new Set(), new Map()), null);
check(
  'nothing left to search for is no correction',
  applyCorrections('xq -knee', new Set(['xq']), new Map([['xq', null]])),
  null,
);

if (failures > 0) {
  console.error(`\n${failures} spelling check(s) failed.`);
  process.exit(1);
}
console.log('\nAll spelling checks passed.');
