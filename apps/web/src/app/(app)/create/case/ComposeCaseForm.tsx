'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { Category, Tag } from '@/lib/forum';
import type { CaseDetail, CasePolicy } from '@/lib/cases';
import { TagPicker } from '../TagPicker';
import { submitCaseAction, type CaseComposeState } from './actions';

const MAX_TAGS = 5;
const FIELD_MAX = 4_000;

/** The four prose fields, in the order Andrew's template asks them. */
const TEMPLATE_FIELDS = [
  'presentingCondition',
  'historyPresentingCondition',
  'objectiveFindings',
  'communityQuestion',
] as const;

const fieldStyle = {
  background: 'var(--color-surface)',
  borderColor: 'var(--color-border)',
  borderRadius: 'var(--radius)',
};

function PublishButton({ disabled }: { disabled: boolean }) {
  const t = useTranslations('caseCompose');
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="intent"
      value="publish"
      disabled={disabled || pending}
      className="w-full px-3 py-3 font-medium text-white disabled:opacity-50"
      style={{ background: 'var(--color-accent)', borderRadius: 'var(--radius)' }}
    >
      {pending ? t('publishing') : t('publish')}
    </button>
  );
}

function SaveDraftButton() {
  const t = useTranslations('caseCompose');
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="intent"
      value="draft"
      disabled={pending}
      className="w-full border px-3 py-2 text-sm font-medium disabled:opacity-50"
      style={{ borderColor: 'var(--color-border-strong)', borderRadius: 'var(--radius)' }}
    >
      {t('saveDraft')}
    </button>
  );
}

/**
 * The case-discussion composer (screens D3/D4) — the platform's highest-risk surface, and
 * the one place where the "no patient-identifiable information" policy stops being a
 * promise and becomes a mechanism.
 *
 * Two kinds of enforcement are layered here, and they are not interchangeable:
 *
 * 1. **Structural** — age is a three-option select and the timeline is a number of days.
 *    There is no field on this form that will accept a date of birth or a calendar date,
 *    so checklist items 3 and 4 are not things a member is trusted to have done. This is
 *    the half that works even when someone ticks without reading.
 * 2. **Attested** — the six-item checklist and the attestation, which cover what only the
 *    author can know (that the prose names nobody, no clinic, no club).
 *
 * The publish button stays disabled until every item and the attestation are confirmed
 * (style guide §8.12 — never bypassable). That gate is a courtesy: the API re-checks all
 * of it server-side, so bypassing the button achieves nothing.
 */
export function ComposeCaseForm({
  tags,
  policy,
  draft,
}: {
  tags: Tag[];
  policy: CasePolicy;
  /** Present when resuming a saved draft or a case sent back for correction. */
  draft?: { postId: string; status: string; detail: CaseDetail; tagIds: string[] };
}) {
  const t = useTranslations('caseCompose');
  const [state, formAction] = useActionState<CaseComposeState, FormData>(submitCaseAction, {
    status: 'idle',
  });

  const [ageBand, setAgeBand] = useState(draft?.detail.ageBand ?? '');
  const [onsetDays, setOnsetDays] = useState(
    draft ? String(draft.detail.onsetDays) : '',
  );
  const [fields, setFields] = useState<Record<string, string>>({
    presentingCondition: draft?.detail.presentingCondition ?? '',
    historyPresentingCondition: draft?.detail.historyPresentingCondition ?? '',
    objectiveFindings: draft?.detail.objectiveFindings ?? '',
    communityQuestion: draft?.detail.communityQuestion ?? '',
  });

  /*
   * The checklist always starts empty, even when resuming a draft that had it complete.
   *
   * Re-ticking is the point. The confirmations describe *this* text, and a member
   * returning to a draft is returning to change it — carrying the ticks forward would let
   * them publish altered content on the strength of a confirmation made about something
   * else. The API takes the same view and clears the stored state on every edit.
   */
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [attested, setAttested] = useState(false);

  const detailsComplete =
    ageBand !== '' &&
    onsetDays.trim() !== '' &&
    Number(onsetDays) >= 0 &&
    TEMPLATE_FIELDS.every((f) => fields[f].trim() !== '');

  const confirmedCount = policy.checklist.filter((i) => checked[i.key]).length;
  const gateOpen = detailsComplete && confirmedCount === policy.checklist.length && attested;
  const outstanding = policy.checklist.length - confirmedCount + (attested ? 0 : 1);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {draft && <input type="hidden" name="postId" value={draft.postId} />}
      {policy.checklist.map((item) => (
        <input key={item.key} type="hidden" name="checklistKeys" value={item.key} />
      ))}
      <input type="hidden" name="attestationText" value={policy.attestationText} />

      {draft?.status === 'needs_correction' && (
        <p
          className="border px-3 py-2 text-sm"
          style={{
            borderColor: 'var(--color-bad)',
            borderRadius: 'var(--radius)',
            color: 'var(--color-bad)',
          }}
          role="status"
        >
          {t('needsCorrection')}
        </p>
      )}

      <p className="text-sm" style={{ color: 'var(--color-bad)' }}>
        {t('anonymity')}
      </p>

      {/*
        No category picker. A case discussion is a clinical case by definition, so the
        category is resolved server-side — asking for it here would make the member restate
        what choosing "Case discussion" on the previous control already said.
      */}

      {/*
        The structural half of de-identification, kept visually together and labelled as
        enforced. A member who understands *why* these two fields are shaped like this is a
        member who reads the rest of the checklist.
      */}
      <fieldset
        className="flex flex-col gap-3 border px-3 py-3"
        style={{ borderColor: 'var(--color-border-strong)', borderRadius: 'var(--radius)' }}
      >
        <legend className="px-1 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
          {t('structural.legend')}
        </legend>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t('ageBand')}</span>
            <select
              name="ageBand"
              value={ageBand}
              onChange={(e) => setAgeBand(e.target.value)}
              className="border px-3 py-2"
              style={fieldStyle}
            >
              <option value="">{t('ageBandPlaceholder')}</option>
              {(Object.keys(policy.ageBands) as (keyof typeof policy.ageBands)[]).map((band) => (
                <option key={band} value={band}>
                  {policy.ageBands[band]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t('onsetDays')}</span>
            <input
              name="onsetDays"
              type="number"
              inputMode="numeric"
              min={0}
              max={36500}
              value={onsetDays}
              onChange={(e) => setOnsetDays(e.target.value)}
              placeholder={t('onsetDaysPlaceholder')}
              className="border px-3 py-2"
              style={fieldStyle}
            />
          </label>
        </div>

        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {t('structural.hint')}
        </p>
      </fieldset>

      {TEMPLATE_FIELDS.map((field) => (
        <label key={field} className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t(`fields.${field}.label`)}</span>
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {t(`fields.${field}.hint`)}
          </span>
          <textarea
            name={field}
            value={fields[field]}
            onChange={(e) => setFields((prev) => ({ ...prev, [field]: e.target.value }))}
            maxLength={FIELD_MAX}
            rows={4}
            className="border px-3 py-2"
            style={fieldStyle}
          />
        </label>
      ))}

      <TagPicker tags={tags} max={MAX_TAGS} initialSelectedIds={draft?.tagIds} />

      {/* The checklist. Rendered from the API's copy of the policy, so it can never show
          a different list from the one the publish route gates on. */}
      <fieldset
        className="flex flex-col gap-2 border px-3 py-3"
        style={{ borderColor: 'var(--color-border-strong)', borderRadius: 'var(--radius)' }}
      >
        <legend className="px-1 text-sm font-medium">{t('checklist.legend')}</legend>
        {policy.checklist.map((item) => (
          <label key={item.key} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="checklist"
              value={item.key}
              checked={checked[item.key] ?? false}
              onChange={(e) =>
                setChecked((prev) => ({ ...prev, [item.key]: e.target.checked }))
              }
              className="mt-1"
            />
            <span>{item.label}</span>
          </label>
        ))}
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {t('checklist.textOnlyNote', { count: policy.checklist.length })}
        </p>
      </fieldset>

      {/* The attestation. Bound to the member's verified identity, not their handle —
          which is stated plainly, because that is what makes it mean anything. */}
      <fieldset
        className="flex flex-col gap-2 border px-3 py-3"
        style={{
          borderColor: 'var(--color-border-strong)',
          borderRadius: 'var(--radius)',
          background: 'var(--color-surface)',
        }}
      >
        <legend className="px-1 text-sm font-medium">{t('attestation.legend')}</legend>
        <p className="text-sm">{policy.attestationText}</p>
        <label className="flex items-start gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="attested"
            checked={attested}
            onChange={(e) => setAttested(e.target.checked)}
            className="mt-1"
          />
          <span>{t('attestation.confirm')}</span>
        </label>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {t('attestation.recorded')}
        </p>
      </fieldset>

      {state.status === 'error' && (
        <p className="text-sm" style={{ color: 'var(--color-bad)' }} role="alert">
          {t(`error.${state.reason ?? 'unavailable'}`)}
          {state.draftId && ` ${t('error.draftKept')}`}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <PublishButton disabled={!gateOpen} />
        <p className="text-center text-xs" style={{ color: 'var(--color-muted)' }} aria-live="polite">
          {!detailsComplete
            ? t('gate.incomplete')
            : gateOpen
              ? t('gate.ready')
              : t('gate.outstanding', { count: outstanding })}
        </p>
        <SaveDraftButton />
        <p className="text-center text-xs" style={{ color: 'var(--color-muted)' }}>
          {t('visibility')}
        </p>
      </div>
    </form>
  );
}
