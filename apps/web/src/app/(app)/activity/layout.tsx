import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { SegmentedControl } from '@/components/SegmentedControl';

/**
 * The Activity tab's two panes (screens E1 and E2) share a heading and the segmented
 * control that moves between them (style guide §8.9, which names this exact pair).
 *
 * They are two routes rather than one screen with state, so each is addressable, a
 * refresh keeps you where you were, and a notification deep-link can return you to the
 * inbox rather than to whichever pane happened to be showing.
 */
export default async function ActivityLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('activity');

  return (
    <main className="flex flex-col" style={{ gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <h1 className="text-xl font-semibold">{t('heading')}</h1>
      <SegmentedControl
        segments={[
          { href: '/activity', label: t('tabs.notifications') },
          { href: '/activity/mine', label: t('tabs.mine') },
        ]}
      />
      {children}
    </main>
  );
}
