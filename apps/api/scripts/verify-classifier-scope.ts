/**
 * Scope terms do what they were added for. `npm run verify:scope -w apps/api`.
 *
 * No database and no network: `classify` is a pure function, so this is a real test and
 * cheap enough to run in CI beside the linters.
 *
 * The case it exists for is the one the live corpus produced. Six joints have a medial
 * collateral ligament, and the literature names the joint nowhere near the ligament —
 * "Influence of Concomitant MCL Injury" with "knee" in the abstract, if at all. Before scope
 * terms, `Knee MCL` matched 2 of the 25 articles mentioning the MCL; the bare phrase would
 * have matched all 25 on all six tags.
 */
import { classify, prepareTaxonomy, tokenise, type ClassifiableTag } from '../src/research-feed/classifier';

/**
 * A plural must stem to whatever its singular stems to, or a tag never matches the form the
 * paper happens to use. The original rules took "es" off wholesale, so "fractures" became
 * "fractur" while "fracture" stayed whole — silently costing every word whose singular ends
 * in `e`, which in this vocabulary is knee, muscle, fracture, rupture and many more.
 */
const PLURALS: [string, string][] = [
  ['knee', 'knees'],
  ['fracture', 'fractures'],
  ['muscle', 'muscles'],
  ['rupture', 'ruptures'],
  ['tendinopathy', 'tendinopathies'],
  ['tear', 'tears'],
  ['injury', 'injuries'],
  ['ligament', 'ligaments'],
  ['toe', 'toes'],
];

const KNEE_MCL: ClassifiableTag = {
  id: 'knee-mcl',
  name: 'Knee MCL',
  synonyms: ['knee medial collateral ligament', 'tibial collateral ligament', 'MCL', 'medial collateral ligament'],
  scopeTerms: ['knee', 'tibial'],
  depth: 4,
};

const TOE_MCL: ClassifiableTag = {
  id: 'toe-mcl',
  name: 'Toe MTP MCL',
  synonyms: ['toe MTP medial collateral ligament', 'medial collateral ligament'],
  scopeTerms: ['toe', 'lesser metatarsophalangeal'],
  depth: 5,
};

/** A tag with no scope terms must behave exactly as it did before the column existed. */
const ACL: ClassifiableTag = {
  id: 'acl',
  name: 'Anterior cruciate ligament',
  synonyms: ['ACL'],
  depth: 4,
};

const taxonomy = prepareTaxonomy([KNEE_MCL, TOE_MCL, ACL]);
const matched = (title: string, abstract: string | null) =>
  classify({ title, abstract }, taxonomy)
    .map((m) => m.tagId)
    .sort();

type Case = { name: string; title: string; abstract: string | null; expect: string[] };

const CASES: Case[] = [
  {
    name: 'the real one — joint named only in the abstract, far from the ligament',
    title: 'Risk of Revision and Patient-Reported Outcomes After ACL Reconstruction: Influence of Concomitant MCL Injury',
    abstract: 'Patients undergoing anterior cruciate ligament reconstruction of the knee were followed for two years.',
    expect: ['acl', 'knee-mcl'],
  },
  {
    name: 'the toe paper must not land in the knee',
    title: 'Medial collateral ligament repair of the lesser metatarsophalangeal joints',
    abstract: 'A case series of toe instability managed operatively.',
    expect: ['toe-mcl'],
  },
  {
    name: 'the knee paper must not land in the toes',
    title: 'Outcomes of medial collateral ligament reconstruction',
    abstract: 'Thirty knees were assessed at one year.',
    expect: ['knee-mcl'],
  },
  {
    name: 'no joint named anywhere — neither tag may claim it',
    title: 'Rehabilitation after collateral ligament injury',
    abstract: 'A narrative review of medial collateral ligament management.',
    expect: [],
  },
  {
    name: 'the anatomical term Andrew named still reaches the knee tag',
    title: 'Tibial collateral ligament bursitis: a report of three cases',
    abstract: null,
    expect: ['knee-mcl'],
  },
  {
    name: 'a scopeless tag is untouched',
    title: 'Anterior cruciate ligament injury prevention in adolescent athletes',
    abstract: 'A cluster randomised trial.',
    expect: ['acl'],
  },
];

let failed = 0;
for (const [singular, plural] of PLURALS) {
  const [a] = tokenise(singular);
  const [b] = tokenise(plural);
  const ok = a === b;
  if (!ok) failed += 1;
  console.log(`${ok ? 'pass' : 'FAIL'}  "${singular}" and "${plural}" stem alike`);
  if (!ok) console.log(`        "${singular}" -> ${a}, "${plural}" -> ${b}`);
}

for (const c of CASES) {
  const got = matched(c.title, c.abstract);
  const want = [...c.expect].sort();
  const ok = got.length === want.length && got.every((id, i) => id === want[i]);
  if (!ok) failed += 1;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${c.name}`);
  if (!ok) console.log(`        expected [${want.join(', ')}] but got [${got.join(', ')}]`);
}

console.log(failed === 0 ? "PASS" : `FAIL — ${failed} check(s)`);
process.exit(failed === 0 ? 0 : 1);
