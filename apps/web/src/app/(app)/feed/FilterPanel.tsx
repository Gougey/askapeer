'use client';

import { useActionState, useCallback, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { TagPicker } from '@/components/TagPicker';
import { EVIDENCE_TYPES } from '@/lib/evidence';
import type { Tag } from '@/lib/forum';
import type { FeedFilters } from '@/lib/research-feed';
import { saveFeedCriteriaAction, type CriteriaState } from './actions';

/** Matches the API's cap, which is also the interests cap — saving writes these through. */
const MAX_TAGS = 100;

/** Relative, never a pair of dates: an absolute range saved as a setting is wrong next year. */
const PERIODS = [1, 2, 3, 5] as const;

/**
 * The Research filter panel (Andrew's review item 6).
 *
 * **A panel, not a modal.** Filtering is an adjustment to what you are already reading, and
 * a modal makes it an errand — so this slides down in place, above the cards it changes.
 * The magnifier search is untouched and still answers a different question: search reaches
 * the whole corpus because the reason to type a word is usually that it is *outside* what
 * you follow, while this narrows the feed that is already yours.
 *
 * **A plain GET form.** Apply is a navigation, so a filtered feed is a real URL — it can be
 * bookmarked, sent to a colleague, and undone with the back button — and the whole screen
 * stays a server component with no client copy of the results to drift. The same choice
 * search made, for the same reasons.
 *
 * ⚠️ **Tags here *replace* the member's clinical interests for this view**, rather than
 * narrowing within them. That is Andrew's "change tags on that page rather than clinic
 * interests" read literally: the panel is a way to look somewhere else for a moment without
 * disturbing what you follow. Clearing the tag row returns the feed to the standing
 * interests — which is also why an empty row must never be saved as "no interests".
 */
export function FilterPanel({
  tags,
  filters,
  active,
}: {
  tags: Tag[];
  /** Whatever the URL asked for, or the standing settings when it asked for nothing. */
  filters: FeedFilters;
  /**
   * How many of these are actually narrowing *this* view.
   *
   * Counted by the page rather than from `filters`, because the two differ in one case that
   * matters: the chip row shows a member's standing interests, since they are genuinely what
   * is shaping the page — but they are not a filter, and counting them would label every
   * ordinary visit "Filter (1 on)".
   */
  active: number;
}) {
  const t = useTranslations('feed');
  const form = useRef<HTMLFormElement>(null);
  const [state, save, saving] = useActionState<CriteriaState, FormData>(saveFeedCriteriaAction, {
    status: 'idle',
  });
  const [, startTransition] = useTransition();

  /*
   * Only two things need client state, and both because a *control* depends on them rather
   * than the results: relevance is not an ordering without words to rank by, and the
   * overwrite warning only applies when tags have actually been chosen.
   */
  const [query, setQuery] = useState(filters.q ?? '');
  const [chosenTags, setChosenTags] = useState<string[]>(filters.tags ?? []);
  const [confirming, setConfirming] = useState(false);
  const onSelectionChange = useCallback((ids: string[]) => {
    setChosenTags(ids);
    setConfirming(false);
  }, []);

  const field = {
    background: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--radius)',
  };

  /*
   * Save is deliberately *not* the form's submit: Apply is, and Apply is a navigation. The
   * action is dispatched by hand with the same FormData the GET form would have sent, so the
   * two buttons read one set of controls and cannot disagree about what is on screen.
   */
  const onSave = () => {
    if (chosenTags.length > 0 && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    const data = new FormData(form.current!);
    startTransition(() => save(data));
  };

  return (
    /*
     * **Always starts closed, including on a feed that is filtered.**
     *
     * It used to open itself whenever the URL carried filters, on the reasoning that a short
     * list with no visible explanation looks broken. That reasoning was wrong twice over.
     * Pressing Apply is a request to *see the results*, and leaving the panel standing over
     * them is the control refusing to get out of the way — so it now shrinks back the moment
     * it has done its job. And the explanation was never the open panel: it is the count on
     * the summary, which says "Filter (2 on)" while taking one line instead of a screenful.
     */
    <details
      className="border"
      style={{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius)' }}
    >
      <summary
        className="filter-summary flex items-center justify-between px-3 py-2 text-sm font-medium"
        style={{ color: 'var(--color-accent)' }}
      >
        {/* The count is the honest version of an "active" dot: it says how much is on. */}
        <span>{active > 0 ? t('filterCount', { count: active }) : t('filter')}</span>
        {/* Points down closed, up open — the caret has to agree with the panel. */}
        <span className="filter-caret" aria-hidden="true">▾</span>
      </summary>

      <div className="filter-panel">
        <form
          ref={form}
          action="/feed"
          method="get"
          className="flex flex-col px-3 pb-3"
          style={{ gap: 'var(--space-3)' }}
          /*
           * Keep empty fields out of the URL — a GET form submits every control it owns, and
           * `/feed?q=&evidence=` is a dangling parameter on a URL someone may paste. Disabled
           * controls are not submitted, so emptying them an instant before submit is enough.
           * Same trick as the search form, and equally an enhancement: without JavaScript the
           * parameters reappear and the page treats an empty value as absent.
           */
          onSubmit={(event) => {
            const el = event.currentTarget;
            const emptied = [...el.elements].filter(
              (node): node is HTMLInputElement | HTMLSelectElement =>
                (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) &&
                node.name !== '' &&
                node.value === '',
            );
            for (const node of emptied) node.disabled = true;
            setTimeout(() => {
              for (const node of emptied) node.disabled = false;
            }, 0);
          }}
        >
          {/*
            "This URL is the whole truth", sent even when every other control is empty.
            Without it the API cannot tell *nothing asked for* from *deliberately cleared*,
            and a member who saved standing criteria and then cleared the panel would watch
            the saved criteria come straight back.
          */}
          <input type="hidden" name="f" value="1" />

          <label className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
            <span className="text-sm font-medium">{t('keywordLabel')}</span>
            <input
              name="q"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('keywordPlaceholder')}
              autoCapitalize="none"
              autoCorrect="off"
              className="border px-3 py-2"
              style={field}
            />
          </label>

          {/*
            The tag picker is itself a bottom sheet, so it stays a chip row that *opens* the
            sheet rather than being inlined here — a sheet over a panel is one layer too many,
            and this control already knows how to do the drill-down and the type-ahead.
          */}
          <TagPicker
            tags={tags}
            max={MAX_TAGS}
            fieldName="tag"
            initialSelectedIds={filters.tags ?? []}
            heading={t('tagsLabel')}
            hint={t('tagsHint')}
            addLabel={t('addTags')}
            onSelectionChange={onSelectionChange}
          />

          <div className="grid grid-cols-2" style={{ gap: 'var(--space-3)' }}>
            <label className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
              <span className="text-sm font-medium">{t('evidenceLabel')}</span>
              <select
                name="evidence"
                defaultValue={filters.evidence ?? ''}
                className="border px-3 py-2 text-base"
                style={field}
              >
                <option value="">{t('anyEvidence')}</option>
                {EVIDENCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`evidence.${type}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
              <span className="text-sm font-medium">{t('periodLabel')}</span>
              <select
                name="years"
                defaultValue={filters.years ? String(filters.years) : ''}
                className="border px-3 py-2 text-base"
                style={field}
              >
                <option value="">{t('anyPeriod')}</option>
                {PERIODS.map((years) => (
                  <option key={years} value={years}>
                    {t('periodYears', { count: years })}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/*
            Said on the control rather than in a release note. Every article in the corpus is
            from 2026 — the ingest began in August and only fetches forward — so this cannot
            narrow anything yet. Without the line it looks broken rather than early.
          */}
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {t('periodNote')}
          </p>

          <fieldset className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
            <legend className="text-sm font-medium">{t('sortLabel')}</legend>
            <select
              name="sort"
              defaultValue={filters.sort ?? 'for_you'}
              className="border px-3 py-2 text-base"
              style={field}
            >
              <option value="for_you">{t('sortForYou')}</option>
              <option value="newest">{t('sortNewest')}</option>
              {/*
                Relevance ranks words, so without a keyword it is not an ordering at all —
                `ts_rank` of an empty query is zero for every row. Offered only once there is
                something to rank by; the API falls back to "For you" if it arrives anyway.
              */}
              <option value="relevance" disabled={query.trim() === ''}>
                {t('sortRelevance')}
              </option>
            </select>
          </fieldset>

          <div className="flex" style={{ gap: 'var(--space-2)' }}>
            <a
              href="/feed?f=1"
              className="flex-1 border px-3 py-2 text-center text-sm font-medium"
              style={{ borderColor: 'var(--color-border-strong)', borderRadius: 'var(--radius)' }}
            >
              {t('clearFilters')}
            </a>
            <button
              type="submit"
              className="flex-1 px-3 py-2 text-sm font-medium text-white"
              style={{ background: 'var(--color-accent)', borderRadius: 'var(--radius)' }}
            >
              {t('applyFilters')}
            </button>
          </div>

          {/*
            ⚠️ Saving with tags chosen **overwrites** the member's clinical interests, because
            interests have exactly one home and a second copy would let the Settings screen and
            this panel disagree. So the first press asks, and the second one does it — a
            confirmation in the page rather than a browser dialogue, which is dismissible by
            reflex and says nothing about what is at stake.
          */}
          {confirming && (
            <p className="text-sm font-medium" role="status" style={{ color: 'var(--color-accent)' }}>
              {t('saveOverwritesInterests')}
            </p>
          )}
          {state.status === 'error' && (
            <p className="text-sm" role="alert" style={{ color: 'var(--color-bad)' }}>
              {state.message}
            </p>
          )}
          {state.status === 'saved' && !confirming && (
            <p className="text-sm" role="status" style={{ color: 'var(--color-ok)' }}>
              {t('criteriaSaved')}
            </p>
          )}

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="border px-3 py-2 text-sm font-medium disabled:opacity-60"
            style={{
              borderColor: 'var(--color-border-strong)',
              borderRadius: 'var(--radius)',
              color: 'var(--color-accent)',
            }}
          >
            {saving ? t('savingCriteria') : confirming ? t('confirmSaveCriteria') : t('saveCriteria')}
          </button>
        </form>
      </div>
    </details>
  );
}
