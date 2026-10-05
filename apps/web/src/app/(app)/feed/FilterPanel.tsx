'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { EVIDENCE_TYPES } from '@/lib/evidence';
import type { FeedFilters } from '@/lib/research-feed';
import { saveFeedCriteriaAction, type CriteriaState } from './actions';

/** Relative, never a pair of dates: an absolute range saved as a setting is wrong next year. */
const PERIODS = [1, 2, 3, 5] as const;

/**
 * The My Research criteria panel.
 *
 * **A panel, not a modal**, and the only thing that decides what this screen shows. It slides
 * down in place above the results it changes; Apply is a navigation, so a set of criteria is a
 * real URL — bookmarkable, sendable to a colleague, and undone by the back button — and the
 * page around it stays a server component with no client copy of the results to drift.
 *
 * ⚠️ **There is no clinical-areas row any more.** The panel used to carry a tag picker that
 * overrode the member's stored interests for a view, and saving wrote those tags back as the
 * interests. After testing, Adrian took interests out of this screen altogether: My Research
 * answers the keyword, type of paper, period and sort, and nothing else. The corpus is still
 * classified against the taxonomy — that is what puts the chips on a card and what the
 * magnifier search narrows by — but no part of a member's profile reaches this page.
 *
 * ⚠️ **It opens on arrival and closes on Apply.** Arriving is the moment the controls matter,
 * because there is nothing else on screen yet; once a question has been asked the results are
 * the point, so the panel folds back to its summary line rather than standing over them.
 */
export function FilterPanel({ filters, open }: { filters: FeedFilters; open: boolean }) {
  const t = useTranslations('feed');
  const form = useRef<HTMLFormElement>(null);
  const [state, save, saving] = useActionState<CriteriaState, FormData>(saveFeedCriteriaAction, {
    status: 'idle',
  });
  const [, startTransition] = useTransition();

  /*
   * One thing needs client state, and only because a *control* depends on it: relevance is
   * not an ordering without words to rank by.
   */
  const [query, setQuery] = useState(filters.q ?? '');

  const active =
    (filters.q ? 1 : 0) +
    (filters.evidence ? 1 : 0) +
    (filters.years ? 1 : 0) +
    (filters.sort && filters.sort !== 'recommended' ? 1 : 0);

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
    const data = new FormData(form.current!);
    startTransition(() => save(data));
  };

  return (
    <details
      open={open}
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
           * `/feed?q=&evidence=` is both a dangling parameter on a URL someone may paste and,
           * worse, a value the API refuses outright. Disabled controls are not submitted, so
           * emptying them an instant before submit is enough; they are re-enabled immediately
           * in case the navigation is cancelled.
           *
           * An enhancement, not a requirement: with no JavaScript the parameters reappear and
           * `parseFeedFilters` drops them, which is why that function exists.
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
            "This URL is a search", sent even when every other control is empty — which is
            exactly the case it exists for. My Research shows nothing until something is
            asked, so an Apply with no criteria (meaning: the whole corpus) has to be
            distinguishable from an untouched visit.
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
            The three dropdowns share a line, as asked. They are narrow at phone width and the
            selects truncate their options rather than wrap, which is the trade the single row
            buys: all three choices visible at once without scrolling the panel.
          */}
          <div className="grid grid-cols-3" style={{ gap: 'var(--space-2)' }}>
            <label className="flex min-w-0 flex-col" style={{ gap: 'var(--space-1)' }}>
              <span className="text-sm font-medium">{t('evidenceLabel')}</span>
              <select
                name="evidence"
                defaultValue={filters.evidence ?? ''}
                className="w-full border px-2 py-2 text-base"
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

            <label className="flex min-w-0 flex-col" style={{ gap: 'var(--space-1)' }}>
              <span className="text-sm font-medium">{t('periodLabel')}</span>
              <select
                name="years"
                defaultValue={filters.years ? String(filters.years) : ''}
                className="w-full border px-2 py-2 text-base"
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

            <label className="flex min-w-0 flex-col" style={{ gap: 'var(--space-1)' }}>
              <span className="text-sm font-medium">{t('sortLabel')}</span>
              <select
                name="sort"
                defaultValue={filters.sort ?? 'recommended'}
                className="w-full border px-2 py-2 text-base"
                style={field}
              >
                {/*
                  "Recommended", not "For you": the ordering is evidence weight, recency decay
                  and a nudge for being placeable in the taxonomy — a judgement about the
                  paper, identical for every member. The interest-match term that earned the
                  old name is gone with the interests.
                */}
                <option value="recommended">{t('sortRecommended')}</option>
                <option value="newest">{t('sortNewest')}</option>
                {/*
                  Relevance ranks words, so without a keyword it is not an ordering at all —
                  `ts_rank` of an empty query is zero for every row. Offered only once there is
                  something to rank by; the API falls back if it arrives anyway.
                */}
                <option value="relevance" disabled={query.trim() === ''}>
                  {t('sortRelevance')}
                </option>
              </select>
            </label>
          </div>

          {/*
            Said on the control rather than in a release note. Every article in the corpus is
            from this year — the ingest began in August and only fetches forward — so the
            period cannot narrow anything yet. Without the line it looks broken rather than
            early.
          */}
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {t('periodNote')}
          </p>

          <div className="flex" style={{ gap: 'var(--space-2)' }}>
            {/* Back to the empty screen, which is where a visit starts. */}
            <a
              href="/feed"
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

          {state.status === 'error' && (
            <p className="text-sm" role="alert" style={{ color: 'var(--color-bad)' }}>
              {state.message}
            </p>
          )}
          {state.status === 'saved' && (
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
            {saving ? t('savingCriteria') : t('saveCriteria')}
          </button>
        </form>
      </div>
    </details>
  );
}
