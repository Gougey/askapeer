'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const POLL_MS = 4000;

/**
 * Keeps the holding page live while the verification worker runs (S2).
 *
 * Polling rather than a socket: the wait is normally seconds, the payload is one
 * enum, and a websocket would be infrastructure carried for the rest of the product
 * to serve a screen each member sees once. The pre-handle status-change email is the
 * real fallback for anyone who closes the tab.
 */
export function StatusPoller({ current }: { current: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch('/api/verification-status', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const { verificationStatus } = (await res.json()) as { verificationStatus: string };
        if (cancelled || verificationStatus === current) return;
        // The page itself decides where an approved member goes next (A6) — refreshing
        // is enough. No token rotation needed here: a pending-scoped session is exactly
        // what the handle step expects, and claiming a handle is what mints the full one.
        router.refresh();
      } catch {
        // A failed poll is not worth surfacing — the next tick retries.
      }
    };

    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [current, router]);

  return null;
}
