'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { deleteCommentAction } from './actions';

/** Author self-delete of an answer. Soft delete server-side; the thread revalidates. */
export function DeleteCommentButton({ postId, commentId }: { postId: string; commentId: string }) {
  const t = useTranslations('discussions');
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => deleteCommentAction(postId, commentId))}
      className="text-xs underline disabled:opacity-60"
      style={{ color: 'var(--color-muted)' }}
    >
      {pending ? t('deleting') : t('delete')}
    </button>
  );
}
