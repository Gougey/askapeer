'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { Category, Tag } from '@/lib/forum';
import { createPostAction, type ComposeState } from './actions';
import { ConfirmPostDialog } from './ConfirmPostDialog';
import { TagPicker } from './TagPicker';

/** Matches the API's ArrayMaxSize — the limit is explained here, enforced there. */
const MAX_TAGS = 5;
const TITLE_MAX = 200;

/**
 * Opens the anonymity gate rather than submitting. The actual submit lives inside the
 * dialog, so the last thing a member does before publishing is answer the warning.
 */
function ReviewButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  const t = useTranslations('compose');
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className="rounded-lg px-3 py-2 font-medium text-white disabled:opacity-50"
      style={{ background: 'var(--color-accent)' }}
    >
      {t('publish')}
    </button>
  );
}

export function ComposeQuestionForm({
  categories,
  tags,
}: {
  categories: Category[];
  tags: Tag[];
}) {
  const t = useTranslations('compose');
  const [state, formAction] = useActionState<ComposeState, FormData>(createPostAction, {
    status: 'idle',
  });
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const categoryRef = useRef<HTMLSelectElement>(null);

  /*
   * React resets the form once an action settles. A controlled <input> survives that,
   * because React writes the value through to the DOM attribute the reset restores from —
   * a controlled <select> does not, since no <option> carries `selected`, so it snaps back
   * to the first option (our empty placeholder). The member then sees a failed post *and*
   * their category silently cleared, which reads as a second, phantom mistake.
   *
   * So re-assert the selection after the reset. Only the select needs this.
   */
  useEffect(() => {
    if (categoryRef.current && categoryRef.current.value !== categoryId) {
      categoryRef.current.value = categoryId;
    }
  }, [state, categoryId]);

  /*
   * Close the gate if the post was rejected. The error renders on the form, so leaving the
   * dialog up would hide the only explanation of what went wrong behind the thing that
   * caused it. A successful post never reaches here — the action redirects.
   */
  useEffect(() => {
    if (state.status === 'error') setConfirming(false);
  }, [state]);

  const complete = categoryId !== '' && title.trim() !== '' && body.trim() !== '';

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/*
        The zero-tolerance anonymity reminder — domain-mandated in every posting UI
        (EPIC-C §13.5, gap G-7), so it stays here above the fields, where it is read
        before anything is typed rather than after.

        Reduced to a single line, with the full warning moved to the gate that opens on
        "Post question" (ConfirmPostDialog). The standing block cost roughly a fifth of a
        phone screen and, being unchanging, stopped being read. Split this way the rule is
        present while composing *and* unavoidable at the moment of commitment, which is the
        last point disclosure can still be prevented. Matches the reply composer, which
        already carries a one-line form of the same reminder.
      */}
      <p className="text-sm" style={{ color: 'var(--color-bad)' }}>
        {t('anonymity.inline')}
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t('category')}</span>
        <select
          ref={categoryRef}
          name="categoryId"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border px-3 py-2"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
        >
          <option value="">{t('categoryPlaceholder')}</option>
          {/*
            Categories reserved for case discussions are not offered here. A clinical case
            has its own composer and its own de-identification gate, so listing it as a
            choice for a quick question invites exactly the post that should have gone the
            other route. The API refuses one too — this only keeps the list honest.
          */}
          {categories
            .filter((category) => category.postType !== 'case_discussion')
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t('title')}</span>
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder={t('titlePlaceholder')}
          className="rounded-lg border px-3 py-2"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t('body')}</span>
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          placeholder={t('bodyPlaceholder')}
          className="rounded-lg border px-3 py-2"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
        />
      </label>

      <TagPicker tags={tags} max={MAX_TAGS} />

      {state.status === 'error' && (
        <p className="text-sm" style={{ color: 'var(--color-bad)' }} role="alert">
          {t(`error.${state.reason ?? 'unavailable'}`)}
        </p>
      )}

      <ReviewButton disabled={!complete} onClick={() => setConfirming(true)} />

      {/*
        Rendered inside the <form> deliberately: its confirm button is a real submit, so
        publishing still travels the same server action and the same pending state.
      */}
      {confirming && <ConfirmPostDialog onCancel={() => setConfirming(false)} />}
    </form>
  );
}
