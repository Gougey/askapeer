/**
 * The evidence ladder, shared across the client/server boundary.
 *
 * **It lives here rather than beside the control that uses it**, and that is the whole point
 * of the file. It started as an export of `EvidenceFilter.tsx`, which carries `'use client'`
 * — and every export of a client module becomes a *client reference* when a server component
 * imports it, not the value itself. The feed page's `EVIDENCE_TYPES.includes(...)` therefore
 * type-checked, built cleanly, and threw `EVIDENCE_TYPES.includes is not a function` on the
 * first real render.
 *
 * A plain module with no imports and no directive is importable from both sides as itself.
 * Keep it that way: anything added here must stay free of server-only and client-only code.
 */
export const EVIDENCE_TYPES = [
  'systematic_review',
  'randomised_trial',
  'cohort_study',
  'case_report',
  'other',
] as const;

export type Evidence = (typeof EVIDENCE_TYPES)[number];

/** Is this an evidence type we recognise? Narrows an untrusted `?evidence=` in one step. */
export function isEvidence(value: string | undefined): value is Evidence {
  return value !== undefined && (EVIDENCE_TYPES as readonly string[]).includes(value);
}
