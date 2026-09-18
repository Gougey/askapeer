import { getTranslations } from 'next-intl/server';
import type { CaseDetail } from '@/lib/cases';

/**
 * A published case discussion's body (screen C4, EPIC-E §7).
 *
 * Renders the structured template as its labelled fields rather than as `post.body` — the
 * flattened copy that exists for the search index. The labels are the clinical reading
 * order Andrew's review settled on, and keeping them means a reader can scan straight to
 * the objective findings instead of hunting through prose.
 *
 * The disclaimer is not decoration and is not dismissible: PRD §10.5 requires it on every
 * case discussion, and it is placed *above* the clinical content so it is read before the
 * material it qualifies rather than after.
 */
export async function CaseBody({
  detail,
  disclaimer,
}: {
  detail: CaseDetail;
  disclaimer: string;
}) {
  const t = await getTranslations('caseThread');

  const fields = [
    ['presentingCondition', detail.presentingCondition],
    ['historyPresentingCondition', detail.historyPresentingCondition],
    ['objectiveFindings', detail.objectiveFindings],
    ['communityQuestion', detail.communityQuestion],
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <p
        className="border px-3 py-2 text-xs"
        style={{
          borderColor: 'var(--color-border-strong)',
          borderRadius: 'var(--radius)',
          color: 'var(--color-muted)',
        }}
      >
        {disclaimer}
      </p>

      {/* The age band and timeline are the page heading (see the thread page) — they are
          not repeated here. */}
      {fields.map(([key, value]) => (
        <section key={key} className="flex flex-col gap-1">
          <h2 className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
            {t(`fields.${key}`)}
          </h2>
          {/* Member-authored prose: rendered as text with newlines preserved, never as
              markup — the same rule the question body follows. */}
          <p className="whitespace-pre-wrap text-sm">{value}</p>
        </section>
      ))}

      {/*
        No attestation line. It used to sit here, reading "The author has attested that this
        case is de-identified" — and Andrew asked for it to go after testing, because on the
        page it reads as a claim being made *to the reader*, who is a verified clinician and
        neither the audience for it nor able to act on it.

        Only the display goes. `attested_at` is still recorded against the member's verified
        identity and still gates publication (PRD §10.5 asks for the attestation to be taken
        and kept, not shown), the correction loop still forces a re-attestation, and the
        audit trail is untouched. If a moderator ever needs to see it, the field is there —
        no admin screen renders case fields today, so there was nowhere to move it to.
      */}
    </div>
  );
}
