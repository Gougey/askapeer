'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { editCommentAction, editPostAction } from './actions';

/**
 * Correcting something you have just written (Andrew's testing review, item 1).
 *
 * **Expands in place, rather than opening a composer.** The thing being fixed is almost
 * always a typo, and sending someone to a separate screen to change one letter loses the
 * context they are correcting it against. It also matches Reply and Report, which already
 * expand into the row beneath.
 *
 * The control only renders when the server says `canEdit`, so a member never sees an Edit
 * button that will refuse them. The server still re-checks — the window can close while the
 * page is open, if someone answers in the meantime — and that refusal is shown here in the
 * server's own words, because which half of the rule closed is the only useful part of it.
 */
export function EditAffordance({
  postId,
  commentId,
  initialTitle,
  initialBody,
}: {
  postId: string;
  /** Absent when editing the question itself. */
  commentId?: string;
  /** Absent for a comment, which has no title. */
  initialTitle?: string;
  initialBody: string;
}) {
  const t = useTranslations('discussions');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle ?? '');
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = commentId
        ? await editCommentAction(postId, commentId, body.trim())
        : await editPostAction(postId, title.trim(), body.trim());
      // A refused save keeps the panel open with the text intact: the member has to be able
      // to copy what they wrote if the window shut under them.
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

  const unchanged = body.trim() === initialBody && title.trim() === (initialTitle ?? '');
  const empty = body.trim() === '' || (initialTitle !== undefined && title.trim() === '');

  return (
    <div className="flex w-full flex-col" style={{ gap: 'var(--space-2)' }}>
      {initialTitle !== undefined && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium">{t('editTitle')}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border px-3 py-2 text-base"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
          />
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium">{t('editBody')}</span>
        {/* 16px minimum, or iOS zooms the page on focus — see the input-size guard. */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="rounded-lg border px-3 py-2 text-base"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
        />
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
          disabled={pending || unchanged || empty}
          className="px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'var(--color-accent)', borderRadius: 'var(--radius)' }}
        >
          {pending ? t('savingEdit') : t('saveEdit')}
        </button>
        <button
          type="button"
          onClick={() => {
            setTitle(initialTitle ?? '');
            setBody(initialBody);
            setError(null);
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
