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
export function AppBar() {
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
      <picture>
        <source srcSet="/brand/askapeer-mark-dark.png" media="(prefers-color-scheme: dark)" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/askapeer-mark.png" alt="" className="h-7 w-auto" />
      </picture>
      <span className="text-lg font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>
        Ask<span style={{ color: 'var(--color-spark)' }}>a</span>Peer
      </span>
    </header>
  );
}
