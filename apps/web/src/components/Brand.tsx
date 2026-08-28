import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { BackControl } from './BackControl';
/**
 * Brand marks. The logo is navy, so on dark backgrounds a light variant is swapped in
 * via <picture> + prefers-color-scheme (the red "a" is preserved in both). See the
 * style guide §1.2.
 */

/** The full lockup (mark + wordmark) for brand moments: auth, onboarding, holding. */
export function BrandLockup({ className = 'h-20 w-auto' }: { className?: string }) {
  return (
    <picture>
      <source srcSet="/brand/askapeer-lockup-dark.png" media="(prefers-color-scheme: dark)" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/askapeer-lockup.png" alt="AskaPeer" className={className} />
    </picture>
  );
}

/**
 * The slim in-app top bar: the mark (bubbles) + the "AskaPeer" wordmark. Sticky, so the
 * brand stays present as the member scrolls. Sits above the per-screen title.
 */
export async function AppBar() {
  const t = await getTranslations('shell');
  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-2.5 px-4"
      style={{
        /*
         * minHeight rather than height, plus the status-bar inset as padding: installed to
         * the home screen the page runs under the status bar, so without this the wordmark
         * sits behind the clock. Both are no-ops in a normal browser tab, where the inset
         * is 0 and the bar stays exactly 52px.
         */
        minHeight: 'var(--appbar-h)',
        paddingTop: 'env(safe-area-inset-top)',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/*
        The way out of any non-tab screen. It lives here rather than on each screen so
        every screen gets one by construction — the two screens that had their own back
        link were the two somebody remembered, which is not a pattern.

        It renders nothing on the four tab destinations, so the bar is unchanged there.
      */}
      <BackControl />
      <picture>
        <source srcSet="/brand/askapeer-mark-dark.png" media="(prefers-color-scheme: dark)" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/askapeer-mark.png" alt="" className="h-7 w-auto" />
      </picture>
      <span className="text-lg font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>
        Ask<span style={{ color: 'var(--color-spark)' }}>a</span>Peer
      </span>
      {/*
        Search lives here, not in the bottom nav (S17).

        It used to sit as a CTA on Discussions, on the reasoning that searching is something
        you do *to* discussions. That held while discussions were the only searchable corpus;
        with the literature searchable too (S16) it is a shell-level action, and the app bar
        is where one goes without disturbing the five agreed tabs — the Create FAB is centred
        on there being exactly five, so a sixth is not the cheap change it looks like.
      */}
      <Link
        href="/search"
        aria-label={t('search')}
        className="ml-auto flex items-center justify-center"
        style={{ color: 'var(--color-muted)', minWidth: 44, minHeight: 44 }}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="size-[22px]"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </Link>
    </header>
  );
}
