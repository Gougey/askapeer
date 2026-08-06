import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { SegmentedControl } from '@/components/SegmentedControl';

/**
 * The Activity tab's panes (screens E1 and E2, plus EPIC-E's private drafts) share a
 * heading and the segmented control that moves between them (style guide §8.9, which
 * names this pattern).
 *
 * They are separate routes rather than one screen with state, so each is addressable, a
 * refresh keeps you where you were, and a notification deep-link can return you to the
 * inbox rather than to whichever pane happened to be showing.
 *
 * Drafts sits here rather than under Discussions because Activity is the member's own
 * material: an unpublished case is not part of the community's content and must not appear
 * anywhere that implies it is.
 */
export default async function ActivityLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('activity');

  return (
    <main className="flex flex-col" style={{ gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <h1 className="text-xl font-semibold">{t('heading')}</h1>
      <SegmentedControl
        // Four segments fit at 390px (checked on device, 2026-08-06) — but only with the
        // short labels below. "Notifications" was already shortened to "Inbox" when the
        // fourth arrived; a wrapping segmented control is the same failure the
        // top-contributor badge was withdrawn for.
        segments={[
          { href: '/activity', label: t('tabs.notifications') },
          { href: '/activity/mine', label: t('tabs.mine') },
          { href: '/activity/following', label: t('tabs.following') },
          { href: '/activity/drafts', label: t('tabs.drafts') },
        ]}
      />
      {children}
    </main>
  );
}
