'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

export type InfinitePage = { node: ReactNode; nextCursor: string | null };

/**
 * Loads the next page as it comes into view, and keeps what it has loaded.
 *
 * **Keeping is the hard part, not loading.** Naive infinite scroll re-creates the problem
 * it is meant to solve: scroll to the fortieth post, open it, come back, and you are at
 * the top of the first twenty with your place gone — which is exactly the complaint that
 * started this work. So the loaded pages are written to `sessionStorage` as a list of
 * cursors, and on mount they are replayed before the browser restores scroll. Coming back
 * rebuilds the list you were looking at rather than the list you started with.
 *
 * The pages themselves are **rendered on the server** and arrive as React elements from a
 * server action, so there is no client copy of a card to drift from the server one.
 *
 * Accessibility and no-JS both keep a real link: the observer is an enhancement over a
 * working `<a href>`, never a replacement for it. Without JavaScript the link pages the
 * old way; with it, the link stays as a manual fallback for anyone who would rather press
 * something than scroll, and for the case where the observer never fires because the
 * viewport is taller than the content.
 */
export function InfiniteList({
  children,
  initialCursor,
  loadMore,
  storageKey,
  fallbackHref,
}: {
  /** Page one, server-rendered by the page that owns this list. */
  children: ReactNode;
  initialCursor: string | null;
  loadMore: (cursor: string) => Promise<InfinitePage>;
  /** Where the replay list lives. One key per list, so two lists never share a history. */
  storageKey: string;
  /** The no-JS route to the next page — kept working, and used if the action fails. */
  fallbackHref: string | null;
}) {
  const t = useTranslations('pagination');
  const [pages, setPages] = useState<ReactNode[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  // Guards the replay: without it, React 18's double-invoked effects in development
  // append every restored page twice.
  const replayed = useRef(false);
  /*
   * True while the saved pages are being replayed.
   *
   * The scroll recorder below must not run during that window. It did, and it cost the
   * whole feature: as each replayed page landed the browser fired `scroll`, the recorder
   * overwrote the saved position with wherever the half-built page happened to be, and the
   * restore then aimed at that. Measured 6212px short of where the member had been —
   * the list came back and the place did not.
   */
  const restoring = useRef(false);
  const targetY = useRef(0);

  const fetchPage = useCallback(
    async (at: string): Promise<string | null> => {
      const { node, nextCursor } = await loadMore(at);
      if (node) setPages((prev) => [...prev, node]);
      setCursor(nextCursor);
      return nextCursor;
    },
    [loadMore],
  );

  // Replay whatever this list had loaded when it was last left.
  useEffect(() => {
    if (replayed.current) return;
    replayed.current = true;
    const saved: string[] = JSON.parse(sessionStorage.getItem(storageKey) ?? '[]');
    if (saved.length === 0) return;

    // Read the target *before* anything can scroll, and hold the recorder off until the
    // restore is done — see `restoring` above for what happens otherwise.
    targetY.current = Number(sessionStorage.getItem(`${storageKey}:y`) ?? '0');
    restoring.current = true;

    (async () => {
      setLoading(true);
      for (const at of saved) await fetchPage(at);
      setLoading(false);

      /*
       * Scroll restoration and content loading are a race, and the content loses: the
       * browser restores scroll as soon as the document is ready, long before these pages
       * arrive, so it clamps to a page still one screen tall.
       *
       * Re-applying once is not enough either — the replayed cards are laid out over
       * several frames, so an early `scrollTo` clamps to a document that has not finished
       * growing. This keeps asking until the page is tall enough to honour the request.
       */
      let attempts = 0;
      const settle = () => {
        window.scrollTo(0, targetY.current);
        const reached = Math.abs(window.scrollY - targetY.current) < 4;
        if (reached || ++attempts > 40) {
          restoring.current = false;
          return;
        }
        requestAnimationFrame(settle);
      };
      if (targetY.current > 0) requestAnimationFrame(settle);
      else restoring.current = false;
    })();
  }, [fetchPage, storageKey]);

  /*
   * Remember where we are, so the replay above has something to restore to.
   *
   * **Debounced, and that is the load-bearing part.** Recording on every scroll event
   * looked obviously right and quietly broke the feature: opening a post makes Next scroll
   * the new route to the top, that fires one last `scroll` on the way out, and the
   * recorder saved 0 over the position the member had reached. The trace showed exactly
   * that — parked at 10438, and `y` already '0' by the time the detail page rendered.
   *
   * A navigation's jump to the top is followed by unmount within a frame or two, so a
   * pending debounced write is cancelled by the cleanup and never lands. Scrolling by hand
   * settles for longer than the delay and is recorded normally — including scrolling
   * deliberately back to the top, which should be remembered.
   *
   * `pagehide` writes immediately instead: the page is going away for real, the position
   * on screen is the true one, and there is no unmount coming to cancel a timer.
   */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const write = () => {
      // Never while replaying: that is the recorder overwriting the very position the
      // replay is trying to reach.
      if (restoring.current) return;
      sessionStorage.setItem(`${storageKey}:y`, String(window.scrollY));
    };
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(write, 200);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', write);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', write);
    };
  }, [storageKey]);

  const loadNext = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);
    try {
      await fetchPage(cursor);
      const saved: string[] = JSON.parse(sessionStorage.getItem(storageKey) ?? '[]');
      sessionStorage.setItem(storageKey, JSON.stringify([...saved, cursor]));
      setFailed(false);
    } catch {
      // A failed page must not silently end the list — the link below becomes the way on.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [cursor, fetchPage, loading, storageKey]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor || failed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadNext();
      },
      // Start fetching before the sentinel is actually on screen, so the next page is
      // usually there by the time the member reaches the end of this one.
      { rootMargin: '600px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, failed, loadNext]);

  return (
    <>
      {children}
      {pages}

      {cursor && (
        <div ref={sentinel} className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
          <p
            className="py-2 text-center text-sm"
            style={{ color: 'var(--color-muted)' }}
            aria-live="polite"
          >
            {loading ? t('loading') : failed ? t('failed') : ''}
          </p>
          {/*
            Always rendered, never only as a noscript: it is the fallback when the action
            errors, the manual option for anyone who does not want to scroll, and the whole
            mechanism when JavaScript is off.
          */}
          {fallbackHref && (
            <a
              href={fallbackHref}
              className="w-full border px-3 py-2 text-center text-sm font-medium"
              style={{
                borderColor: 'var(--color-border-strong)',
                borderRadius: 'var(--radius)',
                color: 'var(--color-accent)',
              }}
            >
              {t('older')}
            </a>
          )}
        </div>
      )}
    </>
  );
}
