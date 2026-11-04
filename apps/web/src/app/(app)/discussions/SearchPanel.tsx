'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TagPicker } from '@/components/TagPicker';
import {
  DISCUSSION_TYPES,
  MAX_TAG_FILTERS,
  type DiscussionFilters,
} from '@/lib/discussion-filters';
import type { Tag } from '@/lib/forum';
import { loadTags } from './load-more';

type Sort = 'relevance' | 'newest';

/**
 * The Discussions search panel, built to match the one on My Research (November 2026).
 *
 * Search used to live behind a magnifying glass in the app bar and reach both corpora at once.
 * Andrew's testing showed the tag filter there working against him on papers, and My Research
 * had by then become a better way to search the literature than the combined screen, so each
 * tab now searches its own corpus from a panel at the top. It works the same way as
 * `FilterPanel`: a fold in place above the results, and Apply is a GET form, so a search is a
 * real URL that can be bookmarked, sent to a colleague and undone by the back button.
 *
 * ⚠️ **Three differences from My Research, each deliberate.** It carries tags, because here an
 * author chose them, where on papers a classifier did. It stays shut until asked, because this
 * page has a list to show, where My Research is blank until asked. And nothing is remembered:
 * the last search is not reapplied on returning, because that would replace the list of what
 * is new with an old question.
 *
 * ⚠️ **The tags load when the panel opens.** The vocabulary is 272 KB, and this is the page
 * members land on most; sending it with every visit, for a panel most visits never open, is a
 * real cost on a phone. A page that is already showing a search has it from the server.
 */
export function SearchPanel({
  filters,
  initialTags,
  open,
}: {
  filters: DiscussionFilters;
  initialTags: Tag[] | null;
  open: boolean;
}) {
  const t = useTranslations('discussions');
  const anyCriteria = Boolean(filters.q || filters.tags.length > 0 || filters.type);

  const [tags, setTags] = useState(initialTags);
  const [tagsFailed, setTagsFailed] = useState(false);
  const ensureTags = () => {
    if (tags) return;
    setTagsFailed(false);
    loadTags()
      .then(setTags)
      .catch(() => setTagsFailed(true));
  };

  const [q, setQ] = useState(filters.q ?? '');
  const [type, setType] = useState<string>(filters.type ?? '');
  const [sort, setSort] = useState<Sort>(filters.sort ?? (filters.q ? 'relevance' : 'newest'));
  /** The same rule as My Research: a keyword suggests Relevance until the member chooses. */
  const [sortChosen, setSortChosen] = useState(false);
  const onQuery = (value: string) => {
    setQ(value);
    if (value.trim() === '') setSort('newest');
    else if (!sortChosen) setSort('relevance');
  };

  /*
   * Clear empties the controls where they stand and does not navigate, as on My Research.
   * The picker holds its own selection, seeded once on mounting, so it is remounted empty.
   */
  const [selectedTags, setSelectedTags] = useState(filters.tags);
  const [pickerKey, setPickerKey] = useState(0);
  const clear = () => {
    setQ('');
    setType('');
    setSort('newest');
    setSortChosen(false);
    setSelectedTags([]);
    setPickerKey((key) => key + 1);
  };

  // See `FilterPanel`: a real form submission keeps the old page up while the new one loads,
  // and going back restores a frozen page mid-submit, with its button still spinning.
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) setSubmitting(false);
    };
    window.addEventListener('pageshow', restored);
    return () => window.removeEventListener('pageshow', restored);
  }, []);

  const field = {
    background: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius)',
  };

  return (
    <details
      open={open}
      className="border"
      style={{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius)' }}
      onToggle={(event) => {
        if (event.currentTarget.open) ensureTags();
      }}
    >
      <summary
        className="filter-summary flex items-center justify-between px-3 py-2 text-sm font-medium"
        style={{ color: 'var(--color-accent)' }}
      >
        <span>{anyCriteria ? t('searchAmend') : t('search')}</span>
        <span className="filter-caret" aria-hidden="true">▾</span>
      </summary>

      <div className="filter-panel">
        <form
          action="/discussions"
          method="get"
          className="flex flex-col px-3 pb-3"
          style={{ gap: 'var(--space-3)' }}
          // Empty fields stay out of the URL: disabled controls are not submitted. The sort has
          // nothing to do without a keyword, so it stays out then too.
          onSubmit={(event) => {
            setSubmitting(true);
            const noWords = q.trim() === '';
            const left = [...event.currentTarget.elements].filter(
              (node): node is HTMLInputElement | HTMLSelectElement =>
                (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) &&
                node.name !== '' &&
                (node.value === '' || (node.name === 'sort' && noWords)),
            );
            for (const node of left) node.disabled = true;
            setTimeout(() => {
              for (const node of left) node.disabled = false;
            }, 0);
          }}
        >
          <label className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
            <span className="text-sm font-medium">{t('keywordLabel')}</span>
            <input
              name="q"
              type="search"
              value={q}
              onChange={(event) => onQuery(event.target.value)}
              placeholder={t('keywordPlaceholder')}
              autoCapitalize="none"
              autoCorrect="off"
              className="border px-3 py-2"
              style={field}
            />
          </label>

          {tags ? (
            <TagPicker
              key={pickerKey}
              tags={tags}
              max={MAX_TAG_FILTERS}
              fieldName="tag"
              initialSelectedIds={selectedTags}
              heading={null}
              hint={null}
              addLabel={t('addTags')}
            />
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              {tagsFailed ? t('tagsFailed') : t('tagsLoading')}
            </p>
          )}

          <div className="grid grid-cols-2" style={{ gap: 'var(--space-2)' }}>
            <label className="flex min-w-0 flex-col" style={{ gap: 'var(--space-1)' }}>
              <span className="text-sm font-medium">{t('typeLabel')}</span>
              <select
                name="type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="w-full border px-2 py-2"
                style={field}
              >
                <option value="">{t('anyType')}</option>
                {DISCUSSION_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {t(`type.${value}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-0 flex-col" style={{ gap: 'var(--space-1)' }}>
              <span className="text-sm font-medium">{t('sortLabel')}</span>
              <select
                name="sort"
                value={sort}
                onChange={(event) => {
                  setSortChosen(true);
                  setSort(event.target.value as Sort);
                }}
                className="w-full border px-2 py-2"
                style={field}
              >
                <option value="newest">{t('sortNewest')}</option>
                <option value="relevance" disabled={q.trim() === ''}>
                  {t('sortRelevance')}
                </option>
              </select>
            </label>
          </div>

          <div className="flex" style={{ gap: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={clear}
              className="flex-1 border px-3 py-2 text-center text-sm font-medium"
              style={{ borderColor: 'var(--color-border-strong)', borderRadius: 'var(--radius)' }}
            >
              {t('clear')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-3 py-2 text-sm font-medium text-white disabled:opacity-80"
              style={{ background: 'var(--color-accent)', borderRadius: 'var(--radius)' }}
            >
              {submitting ? (
                <span
                  className="inline-flex items-center justify-center"
                  style={{ gap: 'var(--space-2)' }}
                  role="status"
                >
                  <span className="spinner" aria-hidden="true" />
                  {t('searching')}
                </span>
              ) : (
                t('apply')
              )}
            </button>
          </div>
        </form>
      </div>
    </details>
  );
}
