'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { EVIDENCE_TYPES, type Evidence } from '@/lib/evidence';

/**
 * Narrow the feed to one rung of the evidence ladder — Andrew's request, on the screen where
 * the literature is actually browsed rather than in the shared search box.
 *
 * **A native `<select>`, deliberately.** It sits on the heading row where there is space for
 * one control and no more, and the platform picker is better than anything we would build for
 * it: reachable by keyboard, announced correctly, and on a phone it opens the OS wheel instead
 * of a list we would have to keep inside the viewport ourselves.
 *
 * The choice rides in the URL rather than in state, so a filtered feed is shareable and the
 * back button behaves. Changing it drops `cursor` — a new filter means a new first page, and
 * carrying an old offset across would land the member in the middle of a list they have not
 * seen the start of.
 */
export function EvidenceFilter({ value }: { value: Evidence | '' }) {
  const t = useTranslations('feed');
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <label className="flex items-center" style={{ gap: 'var(--space-2)' }}>
      <span className="sr-only">{t('evidenceFilterLabel')}</span>
      <select
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          start(() => router.push(next === '' ? '/feed' : `/feed?evidence=${next}`));
        }}
        className="rounded-lg border font-medium disabled:opacity-60"
        style={{
          // 16px or iOS zooms the whole page on focus (style guide §4.2); the control is kept
          // compact by its padding rather than by shrinking the text.
          fontSize: '16px',
          minHeight: '44px',
          padding: '0 var(--space-2)',
          borderColor: 'var(--color-border-strong)',
          background: 'var(--color-surface)',
          color: value === '' ? 'var(--color-muted)' : 'var(--color-fg)',
        }}
      >
        <option value="">{t('evidenceAll')}</option>
        {EVIDENCE_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(`evidence.${type}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
