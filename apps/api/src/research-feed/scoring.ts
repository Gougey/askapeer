/**
 * Evidence type and the intrinsic (member-independent) half of the ranking.
 *
 * The split is the load-bearing design decision of this slice: topic match depends on a
 * member's interests and cannot be precomputed, but everything here can be, and is,
 * computed exactly once per article at ingestion.
 */

export type EvidenceType =
  | 'systematic_review'
  | 'randomised_trial'
  | 'cohort_study'
  | 'case_report'
  | 'other';

/**
 * The evidence ladder. Weights are what an intrinsic score is made of, and they are
 * deliberately close together: evidence quality *breaks ties* between articles a member
 * already cares about — it never promotes an irrelevant one.
 */
export const EVIDENCE_WEIGHT: Record<EvidenceType, number> = {
  systematic_review: 1,
  randomised_trial: 0.8,
  cohort_study: 0.6,
  case_report: 0.35,
  other: 0.3,
};

/**
 * Map a source's publication-type strings onto the ladder.
 *
 * Ordered most-specific first, because sources routinely return several types at once — a
 * paper is commonly tagged both "Journal Article" and "Randomized Controlled Trial", and
 * taking the first match in source order would systematically flatten everything to
 * `other`. Europe PMC's `pubTypeList` is the useful signal here; OpenAlex's `type` is
 * coarse and usually just says "article".
 */
const PATTERNS: [EvidenceType, RegExp][] = [
  ['systematic_review', /systematic review|meta[- ]analysis|cochrane/i],
  ['randomised_trial', /randomi[sz]ed controlled trial|randomi[sz]ed trial|\brct\b|clinical trial/i],
  ['cohort_study', /cohort|longitudinal|prospective stud|observational stud|case[- ]control/i],
  ['case_report', /case report|case series/i],
];

export function normaliseEvidenceType(pubTypes: string[], title = ''): EvidenceType {
  const haystack = [...pubTypes, title].join(' ');
  for (const [type, pattern] of PATTERNS) {
    if (pattern.test(haystack)) return type;
  }
  return 'other';
}

/**
 * The stored half of the score: evidence weight plus a small open-access bonus.
 *
 * **Recency is deliberately absent.** It is a function of time, so storing it means the
 * whole corpus silently rots between recomputes — a score written in January quietly
 * describes a January-shaped world in June. The feed query applies decay against
 * `published_date` at read time instead, where it is always correct.
 *
 * The open-access nudge is small and is about usefulness, not quality: an article a member
 * can actually read is worth more to them than one behind a paywall, all else equal.
 */
export function intrinsicScore(input: { evidenceType: EvidenceType; openAccess: boolean }): number {
  const base = EVIDENCE_WEIGHT[input.evidenceType];
  return Math.round((base + (input.openAccess ? 0.15 : 0)) * 100) / 100;
}
