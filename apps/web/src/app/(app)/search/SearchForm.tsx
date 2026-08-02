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
 * and drill-down over the same ~600-node taxonomy.
 *
 * **The query stands alone; the filters are folded away.** They are *narrowing* controls,
 * and narrowing is not what makes tags valuable here — a tag's name and synonyms are
 * already folded into the free-text match, which is what takes "knee" from 4 hits to 10.
 * Hiding the picker costs nothing in recall and gives the query the screen, instead of
 * making a member scroll past a control they rarely want to reach the button they always
 * do.
 *
 * A native `<details>` rather than React state: keyboard support and no-JS behaviour come
 * free, and `open` can be decided on the server. That decision is the important one — a
 * search arriving with filters in the URL (a bookmark, a link, the back button) opens
 * expanded, because otherwise you land on a plain box, see suspiciously few results, and
 * have nothing on screen explaining why.
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

  // Drives both the open state and the label. Counted here rather than passed in, so the
  // two can never disagree about what "active" means.
  const activeFilters = (initialCategory ? 1 : 0) + initialTagIds.length;

  const field = {
    background: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius)',
  };

  return (
    <form
      action="/search"
      method="get"
      className="flex flex-col gap-4"
      /*
       * Keep empty fields out of the URL.
       *
       * A GET form submits every control it owns, so searching from the collapsed panel
       * produced `/search?q=achilles&category=` — a dangling parameter on the URL a member
       * might paste to a colleague. Disabled controls are not submitted, so emptying them
       * an instant before submit is enough; they are re-enabled immediately so the form
       * still works if the navigation is cancelled or the member comes back.
       *
       * Progressive enhancement, not a requirement: with no JavaScript the parameter
       * reappears and nothing breaks, because the page treats an empty value as absent.
       */
      onSubmit={(event) => {
        const form = event.currentTarget;
        const emptied = [...form.elements].filter(
          (el): el is HTMLInputElement | HTMLSelectElement =>
            (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) &&
            el.name !== '' &&
            el.value === '',
        );
        for (const el of emptied) el.disabled = true;
        setTimeout(() => {
          for (const el of emptied) el.disabled = false;
        }, 0);
      }}
    >
      <label className="flex flex-col gap-1">
        {/*
          Visually hidden, not deleted. The screen already says "Search" as its heading and
          again on the button, and a third one above the box was noise — but the input still
          needs an accessible name, and a placeholder is not one: it disappears the moment
          anyone types, and assistive technology does not treat it as a label.
        */}
        <span className="sr-only">{t('queryLabel')}</span>
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

      <details
        open={activeFilters > 0}
        className="border"
        style={{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius)' }}
      >
        <summary
          className="cursor-pointer select-none px-3 py-2 text-sm font-medium"
          style={{ color: 'var(--color-accent)' }}
        >
          {/* The count is on the label, not only inside: an active filter has to be
              visible while the panel is shut, or narrow results look like no results. */}
          {activeFilters > 0 ? t('advancedWithCount', { count: activeFilters }) : t('advanced')}
        </summary>

        <div
          className="flex flex-col border-t"
          style={{ gap: 'var(--space-4)', padding: 'var(--space-3)', borderColor: 'var(--color-border)' }}
        >
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
        </div>
      </details>

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
