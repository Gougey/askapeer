'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { Tag } from '@/lib/forum';
import { createPostAction, type ComposeState } from './actions';
import { ConfirmPostDialog } from './ConfirmPostDialog';
import { TagPicker } from '@/components/TagPicker';

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
  tags,
}: {
  tags: Tag[];
}) {
  const t = useTranslations('compose');
  const [state, formAction] = useActionState<ComposeState, FormData>(createPostAction, {
    status: 'idle',
  });
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);

  /*
   * Close the gate if the post was rejected. The error renders on the form, so leaving the
   * dialog up would hide the only explanation of what went wrong behind the thing that
   * caused it. A successful post never reaches here — the action redirects.
   */
  useEffect(() => {
    if (state.status === 'error') setConfirming(false);
  }, [state]);

  const complete = title.trim() !== '' && body.trim() !== '';

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

      {/*
        No category field. It used to sit here and Andrew asked for it to go after testing:
        the fastest path in the product — tapping "+" to ask a question — opened with a
        five-way taxonomy decision whose most common answer was called "General", which is
        a choice that teaches nothing and costs a beat of confidence.

        The clinical meaning lives in the tags now. What was left of the category was the
        *kind* of post, and this composer already knows that: it is the question one. The
        API resolves it (`questionCategoryId`) rather than taking it from here, so a client
        cannot file a question anywhere else by accident.
      */}

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
