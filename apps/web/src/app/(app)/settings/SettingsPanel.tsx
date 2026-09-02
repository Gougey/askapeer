import type { ReactNode } from 'react';

/**
 * The card the settings screen's standalone controls sit in — heading, explanation, action.
 *
 * Extracted when the second one arrived. The chrome was written once for "sign out
 * everywhere" and would have been copied for the ordinary sign-out beside it, which is
 * exactly how the app ended up with two segmented-control treatments: duplicated markup
 * drifts, and nobody notices until the two look different.
 */
export function SettingsPanel({
  heading,
  body,
  children,
}: {
  heading: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section
      className="flex flex-col border"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--space-4)',
        gap: 'var(--space-2)',
      }}
    >
      <h2 className="text-sm font-semibold">{heading}</h2>
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
        {body}
      </p>
      {children}
    </section>
  );
}
