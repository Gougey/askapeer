'use client';

import { useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { createAnswerAction, type AnswerState } from './actions';

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
 * domain-mandated anonymity reminder in every posting surface (EPIC-C §13.5, G-7) — here
 * as a one-line note so it's present without dominating a quick reply.
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
  const [state, formAction] = useActionState<AnswerState, FormData>(
    async (prev, formData) => {
      const result = await createAnswerAction(postId, parentCommentId, prev, formData);
      if (result.status === 'idle') {
        formRef.current?.reset();
        onDone?.();
      }
      return result;
    },
    { status: 'idle' },
  );

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
      <SubmitButton
        label={isReply ? t('postReply') : t('postAnswer')}
        pendingLabel={t('posting')}
      />
    </form>
  );
}

/** A "Reply" affordance that reveals an inline reply composer under an answer. */
export function ReplyAffordance({ postId, parentCommentId }: { postId: string; parentCommentId: string }) {
  const t = useTranslations('discussions');
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs underline"
        style={{ color: 'var(--color-muted)' }}
      >
        {t('reply')}
      </button>
    );
  }
  return (
    <div className="mt-2">
      <AnswerComposer postId={postId} parentCommentId={parentCommentId} onDone={() => setOpen(false)} />
    </div>
  );
}
