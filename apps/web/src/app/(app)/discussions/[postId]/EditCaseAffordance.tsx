'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { AgeBand, CaseDetail, CasePolicy } from '@/lib/cases';
import { correctCaseAction } from './actions';
import { SaveRow } from './EditAffordance';

/** The four prose fields, in the order Andrew's template asks them. */
const TEMPLATE_FIELDS = [
  'presentingCondition',
  'historyPresentingCondition',
  'objectiveFindings',
  'communityQuestion',
] as const;

const FIELD_MAX = 4_000;

const fieldStyle = {
  background: 'var(--color-surface)',
  borderColor: 'var(--color-border)',
  borderRadius: 'var(--radius)',
};

/**
 * Correcting a published case discussion, inside the edit window.
 *
 * **The form replaces the case, and looks like the composer that made it.** Andrew's first
 * look at this found the opposite: the four fields rendered as text, then the same four again
 * as inputs beneath them, in a narrow column beside the kudos control. A correction should
 * present as the case you wrote, with the fields open for typing — which also means the age
 * band and onset lead, as they do in the composer, rather than trailing the prose.
 *
 * **The attestation is part of the form, not a step after it.** A case's wording is what the
 * de-identification promise was made about, so new wording needs a new promise — and asking
 * for it separately would leave a window, however short, in which the published text and the
 * attestation describing it disagree. Save stays disabled until the box is ticked, which is
 * the same gate publishing uses.
 *
 * The checklist is not re-asked. It was completed when the case was published and the author
 * is correcting that case, not composing a new one; re-confirming the *promise* against the
 * new text is the guarantee that matters, and six more ticks to fix a typo is the kind of
 * friction that stops people fixing typos.
 */
export function EditableCaseBody({
  postId,
  detail,
  policy,
  canEdit,
  children,
}: {
  postId: string;
  detail: CaseDetail;
  policy: CasePolicy | null;
  canEdit: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('discussions');
  const [open, setOpen] = useState(false);

  // Without the policy there is no attestation wording to show, and the server would refuse
  // the save — so the affordance is not offered rather than offered and broken.
  if (!open) {
    return (
      <>
        {children}
        {canEdit && policy && (
          <div className="mt-2 flex">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-xs underline"
              style={{ color: 'var(--color-muted)' }}
            >
              {t('edit')}
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <CaseForm
      postId={postId}
      detail={detail}
      policy={policy!}
      onClose={() => setOpen(false)}
    />
  );
}

function CaseForm({
  postId,
  detail,
  policy,
  onClose,
}: {
  postId: string;
  detail: CaseDetail;
  policy: CasePolicy;
  onClose: () => void;
}) {
  const tc = useTranslations('caseCompose');
  const [ageBand, setAgeBand] = useState<AgeBand>(detail.ageBand);
  const [onsetDays, setOnsetDays] = useState(String(detail.onsetDays));
  const [fields, setFields] = useState({
    presentingCondition: detail.presentingCondition,
    historyPresentingCondition: detail.historyPresentingCondition,
    objectiveFindings: detail.objectiveFindings,
    communityQuestion: detail.communityQuestion,
  });
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await correctCaseAction(postId, {
        ageBand,
        onsetDays: Number(onsetDays),
        ...fields,
        attestationText: policy.attestationText,
        confirmed,
      });
      // A refused save keeps the form open with the text intact — the member has to be able
      // to recover what they wrote if the window shut under them.
      if (result?.error) setError(result.error);
      else onClose();
    });

  const incomplete =
    !confirmed ||
    onsetDays.trim() === '' ||
    Number.isNaN(Number(onsetDays)) ||
    Number(onsetDays) < 0 ||
    Object.values(fields).some((value) => value.trim() === '');

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
      {/* Age band and onset lead, as they do in the composer: they are the case's heading,
          and reading the prose without them is reading it without its subject. */}
      <div className="flex flex-wrap" style={{ gap: 'var(--space-3)' }}>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">{tc('ageBand')}</span>
          <select
            value={ageBand}
            onChange={(e) => setAgeBand(e.target.value as AgeBand)}
            className="border px-3 py-2 text-base"
            style={fieldStyle}
          >
            {(Object.keys(policy.ageBands) as AgeBand[]).map((band) => (
              <option key={band} value={band}>
                {policy.ageBands[band]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">{tc('onsetDays')}</span>
          <input
            inputMode="numeric"
            value={onsetDays}
            onChange={(e) => setOnsetDays(e.target.value)}
            className="border px-3 py-2 text-base"
            style={fieldStyle}
          />
        </label>
      </div>

      {TEMPLATE_FIELDS.map((field) => (
        <label key={field} className="flex flex-col gap-1">
          <span className="text-sm font-medium">{tc(`fields.${field}.label`)}</span>
          <textarea
            value={fields[field]}
            onChange={(e) => setFields((prev) => ({ ...prev, [field]: e.target.value }))}
            maxLength={FIELD_MAX}
            rows={4}
            className="border px-3 py-2 text-base"
            style={fieldStyle}
          />
        </label>
      ))}

      {/* The promise, re-made against the text above. Worded by the policy, never by this
          component: the server rejects an attestation whose wording it did not issue. */}
      <label
        className="flex items-start border px-3 py-2"
        style={{ ...fieldStyle, gap: 'var(--space-2)', borderColor: 'var(--color-warn)' }}
      >
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1"
        />
        <span className="text-sm">{policy.attestationText}</span>
      </label>

      <SaveRow
        pending={pending}
        disabled={incomplete}
        error={error}
        onSave={save}
        onCancel={onClose}
      />
    </div>
  );
}
