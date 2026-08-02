'use client';

import { useTranslations } from 'next-intl';
import { TagPicker } from '@/components/TagPicker';
import type { Category, Tag } from '@/lib/forum';

/** The API caps `?tag=` at three; more than that and a result set is empty by construction. */
const MAX_TAG_FILTERS = 3;

/**
 * The search controls (screen C3).
 *
 * A **GET form**, not a client-side fetch. The picker already submits its selection as
 * hidden inputs, so pointing it at `name="tag"` turns the existing control into a filter
 * with no new plumbing — and the result is a real URL. A search you can bookmark, send to
 * a colleague, or reload without losing is worth more here than avoiding a page load, and
 * it keeps working with no JavaScript.
 *
 * The tag picker is the composer's, reused rather than reimplemented: the same type-ahead
 * and drill-down over the same ~600-node taxonomy. A member who has tagged a post already
 * knows how to narrow a search, and the subtree expansion behind `?tag=` means picking a
 * region does what picking a region looks like it should.
 */
export function SearchForm({
  categories,
  tags,
  initialQuery,
  initialCategory,
  initialTagIds,
}: {
  categories: Category[];
  tags: Tag[];
  initialQuery: string;
  initialCategory: string;
  initialTagIds: string[];
}) {
  const t = useTranslations('search');

  const field = {
    background: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius)',
  };

  return (
    <form action="/search" method="get" className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t('queryLabel')}</span>
        <input
          name="q"
          type="search"
          defaultValue={initialQuery}
          placeholder={t('queryPlaceholder')}
          autoCapitalize="none"
          autoCorrect="off"
          className="border px-3 py-2"
          style={field}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t('categoryLabel')}</span>
        <select
          name="category"
          defaultValue={initialCategory}
          className="border px-3 py-2"
          style={field}
        >
          <option value="">{t('anyCategory')}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <TagPicker
        tags={tags}
        max={MAX_TAG_FILTERS}
        fieldName="tag"
        initialSelectedIds={initialTagIds}
        heading={t('tagsLabel')}
        hint={t('tagsHint')}
      />

      <button
        type="submit"
        className="w-full px-3 py-3 font-medium text-white"
        style={{ background: 'var(--color-accent)', borderRadius: 'var(--radius)' }}
      >
        {t('submit')}
      </button>
    </form>
  );
}
