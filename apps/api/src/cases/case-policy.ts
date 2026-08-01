/**
 * The de-identification policy, as data (EPIC-E §4–§5, PRD §10.2–§10.3).
 *
 * The checklist and the attestation wording live here, in one place, because they are
 * *policy* rather than implementation: the composer renders them, the attest endpoint
 * gates on them, and the attestation record snapshots them. Three copies would drift, and
 * the one that drifted would be the audit record.
 *
 * Changing this file changes what future members are asked to confirm. It does **not**
 * rewrite what past members already confirmed — every attestation stores its own snapshot
 * of the items and the exact text (`identity.case_attestations`), so a policy revision
 * never retro-edits the evidence.
 */

export type ChecklistItem = {
  /** Stable across wording changes — the snapshot's join key, so never renumber or reuse. */
  key: string;
  label: string;
};

/**
 * Six items, not the eight in PRD §10.2.
 *
 * Items 6 and 7 of the policy list cover patient photographs and EXIF metadata, and case
 * discussions are text-only at MVP (image attachments deferred on privacy grounds —
 * `docs/2026-07-14-technical-specs-open-questions.md` §2). Asking a member to confirm
 * something about images they cannot attach trains them to tick without reading, which is
 * the exact failure mode the checklist exists to prevent. They return, with their original
 * keys, when image support lands.
 *
 * Items 3 and 4 are also enforced *structurally* — the composer has no free-text age field
 * and no field that accepts a calendar date (`community.case_details`). They stay on the
 * list anyway: the structural fields stop the obvious route, and the item covers the same
 * information leaking through the prose fields.
 */
export const CHECKLIST_ITEMS: readonly ChecklistItem[] = [
  { key: 'no_names', label: 'No patient names, initials, or aliases' },
  { key: 'no_location', label: 'No address, postcode, or identifying location' },
  { key: 'age_banded', label: 'Age given as a band, not a date of birth' },
  { key: 'dates_relative', label: 'Timelines relative, with no calendar dates' },
  {
    key: 'no_facility',
    label: 'No facility, club, or team that would identify the patient',
  },
  { key: 'no_documents', label: 'No documents containing patient identifiers' },
] as const;

export const CHECKLIST_KEYS: readonly string[] = CHECKLIST_ITEMS.map((i) => i.key);

/**
 * PRD §10.3, verbatim.
 *
 * The second sentence is the one doing the work — it is why a member reads the checklist
 * rather than clicking through it — so it is deliberately not softened.
 *
 * Note what it does and does not say: "**may result in** … referral to my professional
 * regulatory body" states a possible consequence, not an undertaking by the platform to
 * make that referral. That distinction was checked and the wording deliberately kept as
 * it is (case-discussion review, closed 2026-08-01). It may be reworded later; this
 * constant is the only place it would change, and past attestations are unaffected
 * because each stores its own verbatim copy.
 */
export const ATTESTATION_TEXT =
  'I confirm that this case discussion is de-identified in accordance with AskaPeer’s ' +
  'patient privacy policy. I understand that any breach of patient confidentiality is a ' +
  'serious professional and legal matter and may result in permanent removal from the ' +
  'platform and referral to my professional regulatory body.';

/**
 * The standing disclaimer shown on every published case discussion (PRD §10.5, EPIC-E §7).
 * Peer discussion is not clinical advice, and the treating clinician remains responsible.
 */
export const CASE_DISCLAIMER =
  'Peer discussion only. Nothing here is clinical advice, and responsibility for the ' +
  'patient remains with the treating clinician.';

/** The clinical age bands (`community.case_age_band`), with the labels members see. */
export const AGE_BAND_LABELS: Record<'child' | 'youth' | 'adult', string> = {
  child: 'Child (0–11)',
  youth: 'Youth (12–17)',
  adult: 'Adult (18+)',
};
