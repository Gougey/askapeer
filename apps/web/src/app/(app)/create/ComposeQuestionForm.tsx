'use client';

import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import type { Category, Tag } from '@/lib/forum';
import { createPostAction, type ComposeState } from './actions';

/** Matches the API's ArrayMaxSize — the limit is explained here, enforced there. */
const MAX_TAGS = 5;
const TITLE_MAX = 200;

const FACET_ORDER = ['region', 'muscle', 'structure', 'pathology'] as const;

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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  /**
   * Grouped for scanning, not filtering: regions sit under their limb, everything else
   * under its facet. The vocabulary is select-only (FD-4), so this is the whole list.
   */
  const groups = useMemo(() => {
    const byGroup = new Map<string, Tag[]>();
    for (const tag of tags) {
      const key = tag.facet === 'region' ? (tag.parentName ?? t('facet.region')) : t(`facet.${tag.facet}`);
      byGroup.set(key, [...(byGroup.get(key) ?? []), tag]);
    }
    return [...byGroup.entries()].sort(([a], [b]) => indexOfFacet(a, t) - indexOfFacet(b, t));
  }, [tags, t]);

  function toggleTag(id: string) {
    setSelectedTags((current) =>
      current.includes(id)
        ? current.filter((tagId) => tagId !== id)
        : current.length >= MAX_TAGS
          ? current
          : [...current, id],
    );
  }

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

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{t('tags')}</legend>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {t('tagsHint', { max: MAX_TAGS })}
        </p>
        {groups.map(([group, groupTags]) => (
          <div key={group} className="flex flex-col gap-1">
            <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
              {group}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {groupTags.map((tag) => {
                const checked = selectedTags.includes(tag.id);
                return (
                  <label
                    key={tag.id}
                    className="cursor-pointer rounded-full border px-2.5 py-1 text-xs"
                    style={{
                      borderColor: checked ? 'var(--color-accent)' : 'var(--color-muted)',
                      color: checked ? 'var(--color-accent)' : 'var(--color-fg)',
                    }}
                  >
                    <input
                      type="checkbox"
                      name="tagIds"
                      value={tag.id}
                      checked={checked}
                      onChange={() => toggleTag(tag.id)}
                      className="sr-only"
                    />
                    {tag.name}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>

      {state.status === 'error' && (
        <p className="text-sm" style={{ color: 'var(--color-bad)' }} role="alert">
          {t(`error.${state.reason ?? 'unavailable'}`)}
        </p>
      )}

      <PublishButton disabled={!complete} />
    </form>
  );
}

/** Keeps the facet groups in clinical order (regions first) rather than insertion order. */
function indexOfFacet(label: string, t: (key: string) => string): number {
  const index = FACET_ORDER.findIndex((facet) => t(`facet.${facet}`) === label);
  // Limb groupings ("Upper limb") aren't facet labels — they belong with the regions.
  return index === -1 ? 0 : index;
}
