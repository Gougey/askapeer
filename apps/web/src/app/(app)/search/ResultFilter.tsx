'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/**
 * Each option carries its own destination, already built.
 *
 * **The server cannot hand a client component a function.** This took `hrefFor(value)` at
 * first, which is the natural shape and is rejected at render: *"Functions cannot be passed
 * directly to Client Components"*. Only serialisable props cross the boundary, so the page
 * builds every href up front — which it can, because the set of options is known.
 */
export type FilterOption = { value: string; label: string; href: string; colour?: string };

/**
 * A refinement applied *to a set of results*, sitting at the top of the tab it belongs to.
 *
 * **This is where the search stopped contradicting itself.** Category and evidence type used
 * to live together in the pre-search Advanced panel, which meant every search was configured
 * with controls that could not both apply: category is forum vocabulary and cannot reach a
 * paper, evidence type is a property of a paper and means nothing to a discussion. Whichever
 * tab you landed on, half the panel was inert, and the Papers pane carried a line of copy
 * apologising for it.
 *
 * Query and tags stay ahead of the search, because both corpora can answer them. What only
 * one corpus can answer belongs to that corpus's results — so a control is now visible only
 * where it works, and no apology is needed.
 *
 * Changing it drops `cursor`: a refinement is a new first page, and keeping an old offset
 * would drop the member into the middle of a list they have not seen the top of.
 */
export function ResultFilter({
  name,
  label,
  value,
  options,
  allLabel,
  allHref,
}: {
  name: string;
  label: string;
  value: string;
  options: FilterOption[];
  allLabel: string;
  allHref: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const selected = options.find((option) => option.value === value);

  return (
    <label className="flex items-center" style={{ gap: 'var(--space-2)' }}>
      <span className="sr-only">{label}</span>
      <select
        name={name}
        value={value}
        disabled={pending}
        onChange={(event) => {
          const chosen = options.find((option) => option.value === event.target.value);
          start(() => router.push(chosen?.href ?? allHref));
        }}
        className="rounded-lg border font-medium disabled:opacity-60"
        style={{
          // 16px, or iOS zooms the page the moment it takes focus (style guide §4.2).
          fontSize: '16px',
          minHeight: '44px',
          padding: '0 var(--space-2)',
          borderColor: 'var(--color-border-strong)',
          background: 'var(--color-surface)',
          color: selected?.colour ?? (value === '' ? 'var(--color-muted)' : 'var(--color-fg)'),
        }}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} style={{ color: option.colour }}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
