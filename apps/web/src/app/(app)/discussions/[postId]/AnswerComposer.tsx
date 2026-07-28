'use client';

import { useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { createAnswerAction, type AnswerState } from './actions';
import { useExclusivePanel } from './ExclusivePanels';

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      style={{ background: 'var(--color-accent)' }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Compose an answer, or a reply when `parentCommentId` is set (X3). Carries the
 * domain-mandated anonymity reminder in every posting surface (EPIC-C §13.5, G-7).
 *
 * On success a reply hands control back to its parent via `onDone` (which closes it);
 * the persistent top-level composer instead collapses to a confirmation, so posting
 * feels finished rather than re-prompting with an empty box.
 */
export function AnswerComposer({
  postId,
  parentCommentId = null,
  onDone,
}: {
  postId: string;
  parentCommentId?: string | null;
  onDone?: () => void;
}) {
  const t = useTranslations('discussions');
  const isReply = parentCommentId !== null;
  const formRef = useRef<HTMLFormElement>(null);
  const [posted, setPosted] = useState(false);
  const [state, formAction] = useActionState<AnswerState, FormData>(
    async (prev, formData) => {
      const result = await createAnswerAction(postId, parentCommentId, prev, formData);
      if (result.status === 'idle') {
        formRef.current?.reset();
        onDone?.();
        setPosted(true);
      }
      return result;
    },
    { status: 'idle' },
  );

  // Top-level composer, just posted: confirm and stand down rather than sit open.
  if (posted && !isReply) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm" style={{ color: 'var(--color-ok)' }}>
          ✓ {t('answerPosted')}
        </p>
        <button
          type="button"
          onClick={() => setPosted(false)}
          className="text-sm underline"
          style={{ color: 'var(--color-accent)' }}
        >
          {t('addAnother')}
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <textarea
        name="body"
        rows={isReply ? 2 : 4}
        required
        placeholder={isReply ? t('replyPlaceholder') : t('answerPlaceholder')}
        className="rounded-lg border px-3 py-2 text-sm"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
      />
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
        {t('anonymityReminder')}
      </p>
      {state.status === 'error' && (
        <p className="text-xs" style={{ color: 'var(--color-bad)' }} role="alert">
          {t(`answerError.${state.reason ?? 'unavailable'}`)}
        </p>
      )}
      <div className="flex items-center gap-3">
        <SubmitButton
          label={isReply ? t('postReply') : t('postAnswer')}
          pendingLabel={t('posting')}
        />
        {/*
          Only where there is something to go back to. The reply composer is revealed by an
          affordance and needs a way out — the report panel beside it has one, and without
          this a member who opened Reply by mistake had no way to close it. The top-level
          answer composer is persistent: it is the section, so "cancel" would have nothing
          to dismiss.
        */}
        {onDone && <CancelButton label={t('cancel')} onCancel={onDone} />}
      </div>
    </form>
  );
}

/** Disabled mid-flight: the reply is already away, so offering to back out would mislead. */
function CancelButton({ label, onCancel }: { label: string; onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      onClick={onCancel}
      disabled={pending}
      className="text-sm underline disabled:opacity-50"
      style={{ color: 'var(--color-muted)' }}
    >
      {label}
    </button>
  );
}

/** A "Reply" affordance that reveals an inline reply composer under an answer. */
export function ReplyAffordance({ postId, parentCommentId }: { postId: string; parentCommentId: string }) {
  const t = useTranslations('discussions');
  const panel = useExclusivePanel();

  // A sibling panel (Report) has the row — see ExclusivePanels for why this hides rather
  // than closing the other one.
  if (panel.hidden) return null;

  if (!panel.isOpen) {
    return (
      <button
        type="button"
        onClick={panel.open}
        className="text-xs underline"
        style={{ color: 'var(--color-muted)' }}
      >
        {t('reply')}
      </button>
    );
  }
  return (
    <div className="mt-2 w-full">
      <AnswerComposer postId={postId} parentCommentId={parentCommentId} onDone={panel.close} />
    </div>
  );
}
