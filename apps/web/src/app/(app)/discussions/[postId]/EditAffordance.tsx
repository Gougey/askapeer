'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { editCommentAction, editPostAction } from './actions';

/**
 * Correcting something you have just written (Andrew's testing review, item 1).
 *
 * **The form replaces what it is editing.** These wrappers take the read view as `children`
 * and swap it out, rather than expanding a panel underneath it. The first build did the
 * latter, and on a phone it produced exactly the wrong thing: the case's four fields rendered
 * as text, and then the same four fields again as inputs below them, with the form squeezed
 * into whatever width was left beside the kudos control. An edit should look like the thing
 * you are editing, in the place it already occupies.
 *
 * So the Edit trigger sits with the content rather than in the row of actions below it. Reply,
 * Report and Delete act *on* a post and belong together; editing replaces it, and belongs
 * where the replacement will appear.
 *
 * The control only renders when the server says the window is open, and the server re-checks
 * on save — it can close while the page sits there, if someone answers in the meantime. That
 * refusal is shown in the server's own words, because which half of the rule closed is the
 * only useful part of it.
 */

/** Shared shell: the read view, an Edit trigger, or the form. */
function Editable({
  canEdit,
  children,
  form,
}: {
  canEdit: boolean;
  children: ReactNode;
  form: (close: () => void) => ReactNode;
}) {
  const t = useTranslations('discussions');
  const [open, setOpen] = useState(false);

  if (open) return <>{form(() => setOpen(false))}</>;

  return (
    <>
      {children}
      {canEdit && (
        // Wrapped so the trigger is block-level in both contexts: the post sits in a flex
        // column, a comment card does not.
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

export function EditableQuestionBody({
  postId,
  title,
  body,
  canEdit,
  children,
}: {
  postId: string;
  title: string;
  body: string;
  canEdit: boolean;
  children: ReactNode;
}) {
  return (
    <Editable canEdit={canEdit} form={(close) => (
      <QuestionForm postId={postId} title={title} body={body} onClose={close} />
    )}>
      {children}
    </Editable>
  );
}

export function EditableCommentBody({
  postId,
  commentId,
  body,
  canEdit,
  children,
}: {
  postId: string;
  commentId: string;
  body: string;
  canEdit: boolean;
  children: ReactNode;
}) {
  return (
    <Editable canEdit={canEdit} form={(close) => (
      <CommentForm postId={postId} commentId={commentId} body={body} onClose={close} />
    )}>
      {children}
    </Editable>
  );
}

const fieldStyle = {
  background: 'var(--color-surface)',
  borderColor: 'var(--color-muted)',
  borderRadius: 'var(--radius)',
};

function QuestionForm({
  postId,
  title: initialTitle,
  body: initialBody,
  onClose,
}: {
  postId: string;
  title: string;
  body: string;
  onClose: () => void;
}) {
  const t = useTranslations('discussions');
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await editPostAction(postId, title.trim(), body.trim());
      // A refused save keeps the form open with the text intact: the member has to be able
      // to recover what they wrote if the window shut under them.
      if (result?.error) setError(result.error);
      else onClose();
    });

  const blocked = title.trim() === '' || body.trim() === '';
  const unchanged = title.trim() === initialTitle && body.trim() === initialBody;

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t('editTitle')}</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border px-3 py-2 text-base"
          style={fieldStyle}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t('editBody')}</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          className="border px-3 py-2 text-base"
          style={fieldStyle}
        />
      </label>
      <SaveRow
        pending={pending}
        disabled={blocked || unchanged}
        error={error}
        onSave={save}
        onCancel={onClose}
      />
    </div>
  );
}

function CommentForm({
  postId,
  commentId,
  body: initialBody,
  onClose,
}: {
  postId: string;
  commentId: string;
  body: string;
  onClose: () => void;
}) {
  const t = useTranslations('discussions');
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await editCommentAction(postId, commentId, body.trim());
      if (result?.error) setError(result.error);
      else onClose();
    });

  return (
    <div className="mt-2 flex flex-col" style={{ gap: 'var(--space-3)' }}>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t('editBody')}</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="border px-3 py-2 text-base"
          style={fieldStyle}
        />
      </label>
      <SaveRow
        pending={pending}
        disabled={body.trim() === '' || body.trim() === initialBody}
        error={error}
        onSave={save}
        onCancel={onClose}
      />
    </div>
  );
}

/** Save, cancel and the server's refusal — identical for every kind of edit. */
export function SaveRow({
  pending,
  disabled,
  error,
  onSave,
  onCancel,
}: {
  pending: boolean;
  disabled: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations('discussions');
  return (
    <>
      {error && (
        <p className="text-xs" style={{ color: 'var(--color-bad)' }} role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={pending || disabled}
          className="px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'var(--color-accent)', borderRadius: 'var(--radius)' }}
        >
          {pending ? t('savingEdit') : t('saveEdit')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="text-xs underline"
          style={{ color: 'var(--color-muted)' }}
        >
          {t('cancelEdit')}
        </button>
      </div>
    </>
  );
}
