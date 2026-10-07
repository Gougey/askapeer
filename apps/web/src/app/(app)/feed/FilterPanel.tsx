'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EVIDENCE_TYPES } from '@/lib/evidence';
import type { FeedFilters, FeedSort } from '@/lib/research-feed';

/** Relative, never a pair of dates: an absolute range saved as a setting is wrong next year. */
const PERIODS = [1, 5, 10, 15] as const;

/**
 * What Clear returns the panel to: no keyword, any type, any time, newest first.
 *
 * ⚠️ **Clear resets the controls; it does not navigate.** It used to be a link back to
 * `/feed`, which looked broken the moment the panel began remembering the last criteria used
 * — you pressed Clear, the page reloaded, and your previous keyword came straight back,
 * because an unasked visit is exactly when the remembered criteria are applied. Emptying the
 * fields where they stand is what the button was always taken to mean.
 */
const BLANK = { q: '', evidence: '', years: '', sort: 'newest' as FeedSort };

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
 * ⚠️ **It opens only when there is nothing to show**, and closes on Apply. A member with no
 * criteria has nothing else on the page to do, so the panel prompts them; a member returning
 * to results they already had wants the results, so it stays a summary line.
 *
 * ⚠️ **The summary says "Search", not "Filter".** Filtering is what it did when this screen had
 * a feed of its own to narrow. It has not had one since interests came out: with nothing set
 * the panel is where a search *begins*, so calling it a filter described a page that no longer
 * exists.
 */
export function FilterPanel({
  filters,
  open,
  anyCriteria,
}: {
  filters: FeedFilters;
  open: boolean;
  /** Whether anything is actually set — decides which of the two labels the summary shows. */
  anyCriteria: boolean;
}) {
  const t = useTranslations('feed');

  /*
   * All four controls are held in state rather than left uncontrolled, which they were until
   * Clear needed to exist: a `type="reset"` restores each field's *default*, and the defaults
   * here are the member's last-used criteria — the very thing Clear is for getting rid of.
   *
   * The keyword is also what decides whether Relevance is offerable, since `ts_rank` of an
   * empty query is zero for every row.
   */
  const [criteria, setCriteria] = useState({
    q: filters.q ?? '',
    evidence: filters.evidence ?? '',
    years: filters.years ? String(filters.years) : '',
    sort: (filters.sort ?? 'newest') as FeedSort,
  });
  const set = <K extends keyof typeof criteria>(key: K, value: (typeof criteria)[K]) =>
    setCriteria((current) => ({ ...current, [key]: value }));

  /*
   * **Typing a keyword switches the sort to Relevance; clearing it switches back.**
   *
   * Andy's complaint was that a word mentioned deep in an abstract pulled in papers it was
   * not really about. That is true, and it was an *ordering* problem rather than a matching
   * one: the index already ranks a title match well above an abstract match, but the default
   * sort is Newest, which throws that away and interleaves the two by date. Measured on the
   * corpus, sorting by relevance puts 18 of the top 20 "return to play" results in the title
   * — while leaving the abstract matches reachable underneath, which deleting them would not.
   *
   * ⚠️ **It stops as soon as the member touches the sort themselves.** Testing the first
   * version caught this: choose Newest deliberately with a keyword in the box, type one more
   * character, and it flipped you back to Relevance — a control that argues with you. A
   * suggestion may only be made while nobody has expressed a preference.
   *
   * The reverse flip is not a nicety and happens either way: relevance ranks nothing without
   * words, and its option disables itself when the keyword goes, which would otherwise leave
   * a disabled option selected.
   */
  const [sortChosen, setSortChosen] = useState(false);

  /*
   * **Apply is a real form submission**, so the browser keeps the current page on screen while
   * it fetches the next one. That is usually a virtue — nothing flashes — but a keyword search
   * over 145,000 articles takes a second or more, and for that second the screen looks like it
   * ignored the press. This is the only thing that says otherwise.
   */
  const [submitting, setSubmitting] = useState(false);

  /*
   * ⚠️ **Clear it when the page is restored from the back/forward cache.** Going back lands on
   * a document that was mid-submit when it was frozen, and without this the member returns to
   * a button spinning for a navigation that finished, or was abandoned, long ago. `pageshow`
   * with `persisted` is the only event that fires for a bfcache restore.
   */
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) setSubmitting(false);
    };
    window.addEventListener('pageshow', restored);
    return () => window.removeEventListener('pageshow', restored);
  }, []);
  const onQuery = (value: string) =>
    setCriteria((current) => ({
      ...current,
      q: value,
      sort:
        value.trim() !== '' && current.sort === 'newest' && !sortChosen
          ? 'relevance'
          : value.trim() === '' && current.sort === 'relevance'
            ? 'newest'
            : current.sort,
    }));

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
    >
      <summary
        className="filter-summary flex items-center justify-between px-3 py-2 text-sm font-medium"
        style={{ color: 'var(--color-accent)' }}
      >
        {/*
          Two labels, because the control does two jobs and the member needs to know which one
          is in front of them: with nothing set it is how you start, and with a search running
          it is how you start another or adjust this one.
        */}
        <span>{anyCriteria ? t('searchAmend') : t('search')}</span>
        {/* Points down closed, up open — the caret has to agree with the panel. */}
        <span className="filter-caret" aria-hidden="true">▾</span>
      </summary>

      <div className="filter-panel">
        <form
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
            /*
             * State, not `button.disabled`. Disabling a submit button from inside its own
             * submit handler cancels the submission in some browsers; a React state update is
             * applied after the handler returns, by which time the navigation has begun.
             */
            setSubmitting(true);
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
              value={criteria.q}
              onChange={(event) => onQuery(event.target.value)}
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
          {/*
            ⚠️ **These three are `text-sm`, below the 16px the input-zoom guard asks for.**
            Adrian asked for a smaller font because a chosen option was being truncated in a
            third of a phone's width. The trade is real and is the thing that guard exists to
            prevent: iOS Safari zooms the page when a control under 16px is tapped. It is
            least bad here — a `<select>` opens a native picker rather than a keyboard, so the
            zoom is brief and nothing reflows under a caret — but if it proves annoying on
            device the fix is shorter option labels, not a viewport lock.
          */}
          <div className="grid grid-cols-3" style={{ gap: 'var(--space-2)' }}>
            <label className="flex min-w-0 flex-col" style={{ gap: 'var(--space-1)' }}>
              <span className="text-sm font-medium">{t('evidenceLabel')}</span>
              <select
                name="evidence"
                value={criteria.evidence}
                onChange={(event) => set('evidence', event.target.value)}
                className="w-full border px-2 py-2 text-sm" /* input-zoom-allow — see below */
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
                value={criteria.years}
                onChange={(event) => set('years', event.target.value)}
                className="w-full border px-2 py-2 text-sm" /* input-zoom-allow — see below */
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
                value={criteria.sort}
                onChange={(event) => {
                  setSortChosen(true);
                  set('sort', event.target.value as FeedSort);
                }}
                className="w-full border px-2 py-2 text-sm" /* input-zoom-allow — see below */
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
                <option value="relevance" disabled={criteria.q.trim() === ''}>
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
            <button
              type="button"
              onClick={() => {
                // Clear means clear, including the memory of a preference expressed.
                setSortChosen(false);
                setCriteria({ ...BLANK });
              }}
              className="flex-1 border px-3 py-2 text-center text-sm font-medium"
              style={{ borderColor: 'var(--color-border-strong)', borderRadius: 'var(--radius)' }}
            >
              {t('clearFilters')}
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
                  /* Announced once, so a screen reader says what the spinner shows. */
                  role="status"
                >
                  <span className="spinner" aria-hidden="true" />
                  {t('searching')}
                </span>
              ) : (
                t('applyFilters')
              )}
            </button>
          </div>

        </form>
      </div>
    </details>
  );
}
