'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { reportAction, type ReportState, type ReportTarget } from './actions';

/** EPIC-F §4 order — the two priority categories first, then the working set. */
const CATEGORIES = [
  'identifiable_patient_information',
  'anonymity_violation',
  'harassment',
  'spam',
  'other',
] as const;

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      style={{ background: 'var(--color-bad)' }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Report a post, comment, or handle (screen X1). A quiet text affordance that expands to
 * a category picker + optional context. Reporting a handle is itself a sensitive act, so
 * the anonymity reminder rides along here too. On success it collapses to a confirmation
 * rather than re-prompting — a report is a one-shot, not something you tune and resend.
 */
export function ReportButton({ target, targetId }: { target: ReportTarget; targetId: string }) {
  const t = useTranslations('report');
  const [open, setOpen] = useState(false);
  const triggerLabel = target === 'handle' ? t('reportHandle') : t('report');
  const [state, formAction] = useActionState<ReportState, FormData>(
    (prev, formData) => reportAction(target, targetId, prev, formData),
    { status: 'idle' },
  );

  if (state.status === 'submitted') {
    return (
      <span className="text-xs" style={{ color: 'var(--color-ok)' }}>
        ✓ {t('submitted')}
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs underline disabled:opacity-60"
        style={{ color: 'var(--color-muted)' }}
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-2 flex w-full flex-col gap-2 rounded-xl border p-3"
      style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-surface)' }}
    >
      <p className="text-xs font-semibold">{t('heading')}</p>
      <fieldset className="flex flex-col gap-1">
        {/* Ordered priority-first (EPIC-F §4). The priority *tier* is a queue concern the
            moderation side derives from the category — not something a reporter needs a
            badge for, so no tier marker is shown member-side. */}
        {CATEGORIES.map((cat, i) => (
          <label key={cat} className="flex items-start gap-2 text-xs">
            <input type="radio" name="category" value={cat} required={i === 0} className="mt-0.5" />
            <span>{t(`categories.${cat}`)}</span>
          </label>
        ))}
      </fieldset>
      <textarea
        name="comment"
        rows={2}
        maxLength={2000}
        placeholder={t('commentPlaceholder')}
        className="rounded-lg border px-3 py-2 text-xs"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
      />
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
        {t('anonymityReminder')}
      </p>
      {state.status === 'error' && (
        <p className="text-xs" style={{ color: 'var(--color-bad)' }} role="alert">
          {t(`error.${state.reason ?? 'unavailable'}`)}
        </p>
      )}
      <div className="flex items-center gap-3">
        <SubmitButton label={t('submit')} pendingLabel={t('submitting')} />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs underline"
          style={{ color: 'var(--color-muted)' }}
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
