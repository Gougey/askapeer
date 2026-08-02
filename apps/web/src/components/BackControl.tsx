'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

/**
 * The way out of any screen that is not a tab.
 *
 * This exists because the app is **installed standalone** — no browser chrome, no browser
 * back button, and on iOS no edge-swipe either. A screen with no explicit way back is a
 * dead end there in a way it never is in a tab. Four screens were exactly that, including
 * a thread opened from search results: you could read the first result and then had no
 * route back to the second.
 *
 * **History first, parent second.** `router.back()` is what a member means by "back" —
 * it returns them to the list they came from, at the scroll position and, crucially, with
 * the query they typed. A search is a URL (`/search?q=knee&tag=…`), so history back
 * restores the whole result set for free; an "up" link to a fixed parent would drop the
 * query and quietly reset the search.
 *
 * The parent is the fallback for the case history cannot serve: a cold start straight
 * into a deep link — a notification opened from the home screen, a shared thread URL —
 * where `back()` would either do nothing or leave the app entirely.
 */

/** The four tab destinations. A back control on a tab is noise: the nav is the way out. */
const ROOTS = new Set(['/feed', '/discussions', '/activity', '/profile']);

/**
 * Where to land when there is no history to go back to.
 *
 * Ordered most-specific first, because `/activity/drafts` must not be matched by the
 * `/activity` rule. `/create/case/:id` returns to the drafts list rather than the empty
 * composer — a member resuming a draft came from their drafts, and sending them to a blank
 * form would look like their work had gone.
 */
const PARENTS: [RegExp, string][] = [
  [/^\/create\/case\/[^/]+$/, '/activity/drafts'],
  [/^\/create\/case$/, '/create'],
  [/^\/create$/, '/discussions'],
  [/^\/discussions\/[^/]+$/, '/discussions'],
  [/^\/search$/, '/discussions'],
  [/^\/activity\/notices\/[^/]+$/, '/activity'],
  [/^\/activity\/(mine|drafts)$/, '/activity'],
  [/^\/settings\/notifications$/, '/settings'],
  [/^\/settings$/, '/profile'],
];

function parentOf(pathname: string): string {
  return PARENTS.find(([pattern]) => pattern.test(pathname))?.[1] ?? '/discussions';
}

/**
 * The screen this session started on.
 *
 * `window.history.length` looked like the way to ask "is there anywhere to go back to?",
 * and it is not: a tab that has been anywhere at all — even `about:blank` — reports a
 * length above 1, so `back()` fired and left the app. A browser test caught it landing on
 * a blank page, which in a standalone install is an app with nothing in it and no way out.
 *
 * Session entry is the honest signal. Anywhere other than where this session began, there
 * is in-app history and `back()` is right. *On* that first screen, `back()` would leave
 * the app, so the parent route is used instead.
 *
 * The trade: navigating away from the entry screen and returning to it makes back go
 * "up" rather than retracing. That is a smaller surprise than a blank screen, and it can
 * never strand anyone.
 */
const ENTRY_KEY = 'ap:entryPath';

export function BackControl() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('shell');

  // Runs on every screen, including the tabs — this component mounts app-wide and only
  // *renders* nothing on a root, so the entry screen is recorded even when it is a tab.
  useEffect(() => {
    if (sessionStorage.getItem(ENTRY_KEY) === null) sessionStorage.setItem(ENTRY_KEY, pathname);
  }, [pathname]);

  if (ROOTS.has(pathname)) return null;

  /*
   * Composing is abandoned, not navigated away from, so it says so. The control is
   * otherwise identical — a member should not have to learn two mechanisms because one of
   * them happens to discard a draft.
   */
  const isComposer = pathname.startsWith('/create');
  const label = isComposer ? t('cancel') : t('back');

  return (
    <button
      type="button"
      onClick={() => {
        const entry = sessionStorage.getItem(ENTRY_KEY);
        // Anywhere but the screen this session opened on, there is in-app history to
        // retrace — and retracing is what restores a search's query, scroll and results.
        if (entry !== null && entry !== pathname) router.back();
        else router.push(parentOf(pathname));
      }}
      aria-label={label}
      className="-ml-1 flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold"
      style={{ color: 'var(--color-accent)' }}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {/* The chevron alone is ambiguous on a composer, where the consequence is losing
          work rather than changing screen — so that one case carries its word. */}
      {isComposer && <span>{label}</span>}
    </button>
  );
}
