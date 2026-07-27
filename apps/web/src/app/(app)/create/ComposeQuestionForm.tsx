'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { Category, Tag } from '@/lib/forum';
import { createPostAction, type ComposeState } from './actions';
import { TagPicker } from './TagPicker';

/** Matches the API's ArrayMaxSize — the limit is explained here, enforced there. */
const MAX_TAGS = 5;
const TITLE_MAX = 200;

function PublishButton({ disabled }: { disabled: boolean }) {
  const t = useTranslations('compose');
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-lg px-3 py-2 font-medium text-white disabled:opacity-50"
      style={{ background: 'var(--color-accent)' }}
    >
      {pending ? t('publishing') : t('publish')}
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

  const complete = categoryId !== '' && title.trim() !== '' && body.trim() !== '';

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/*
        The zero-tolerance anonymity reminder. Domain-mandated in every posting UI
        (EPIC-C §13.5, gap G-7) — it is not a dismissible hint, so it renders above the
        fields where it is read before anything is typed, not after.
      */}
      <aside
        className="rounded-lg border p-3 text-sm"
        style={{ borderColor: 'var(--color-bad)', color: 'var(--color-fg)' }}
      >
        <p className="font-medium">{t('anonymity.heading')}</p>
        <p className="mt-1" style={{ color: 'var(--color-muted)' }}>
          {t('anonymity.body')}
        </p>
      </aside>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t('category')}</span>
        <select
          name="categoryId"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border px-3 py-2"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
        >
          <option value="">{t('categoryPlaceholder')}</option>
          {categories.map((category) => (
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

      <PublishButton disabled={!complete} />
    </form>
  );
}
