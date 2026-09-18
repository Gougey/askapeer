'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import type { AgeBand, CaseDetail, CasePolicy } from '@/lib/cases';
import { correctCaseAction } from './actions';

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
 * **The attestation is part of the form, not a step after it.** A case's wording is what the
 * de-identification promise was made about, so new wording needs a new promise — and asking
 * for it separately would leave a window, however short, in which the published text and the
 * attestation describing it disagree. The save button stays disabled until the box is ticked,
 * which is the same gate publishing uses.
 *
 * The checklist is not re-asked. It was completed when the case was published and the author
 * is correcting that case, not composing a new one; re-confirming the *promise* against the
 * new text is the guarantee that matters, and six more ticks to fix a typo is the kind of
 * friction that stops people fixing typos.
 *
 * Longer than the question's edit panel for an unavoidable reason: a case has no single body
 * to correct, it has six fields, and showing only the one you meant to change would hide the
 * text the attestation is about.
 */
export function EditCaseAffordance({
  postId,
  detail,
  policy,
}: {
  postId: string;
  detail: CaseDetail;
  policy: CasePolicy;
}) {
  const t = useTranslations('discussions');
  const tc = useTranslations('caseCompose');
  const [open, setOpen] = useState(false);
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

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await correctCaseAction(postId, {
        ageBand,
        onsetDays: Number(onsetDays),
        ...fields,
        attestationText: policy.attestationText,
        confirmed,
      });
      // A refused save keeps the panel open with the text intact — the member has to be able
      // to recover what they wrote if the window shut under them.
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs underline"
        style={{ color: 'var(--color-muted)' }}
      >
        {t('edit')}
      </button>
    );
  }

  const complete =
    confirmed &&
    onsetDays.trim() !== '' &&
    Number(onsetDays) >= 0 &&
    Object.values(fields).every((value) => value.trim() !== '');

  return (
    <div className="flex w-full flex-col" style={{ gap: 'var(--space-3)' }}>
      <div className="flex flex-wrap" style={{ gap: 'var(--space-3)' }}>
        <label className="flex flex-col gap-1">
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
        <label className="flex flex-col gap-1">
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

      {error && (
        <p className="text-xs" style={{ color: 'var(--color-bad)' }} role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || !complete}
          className="px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'var(--color-accent)', borderRadius: 'var(--radius)' }}
        >
          {pending ? t('savingEdit') : t('saveEdit')}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirmed(false);
            setOpen(false);
          }}
          disabled={pending}
          className="text-xs underline"
          style={{ color: 'var(--color-muted)' }}
        >
          {t('cancelEdit')}
        </button>
      </div>
    </div>
  );
}
