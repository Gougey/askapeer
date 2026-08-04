'use client';

import { useActionState, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { InterestOption } from '@/lib/research-feed';
import { saveInterestsAction, type InterestsState } from './actions';

const MAX_INTERESTS = 30;

/**
 * Choosing what the research feed is about (screen F5).
 *
 * **Not the composer's tag picker, deliberately.** That one drills through the 588-node
 * taxonomy, which is right when you are labelling a case — precision matters and you know
 * what you are looking for. Here it would be wrong: only **227 of those 588 tags have ever
 * matched an article**, so most of that tree returns nothing however carefully a member
 * navigates it, and hunting through it to find out is a bad way to learn that.
 *
 * So this offers what the corpus actually contains, commonest first, with the article count
 * on each chip. Picking *Achilles tendinopathy* shows there are 32 articles behind it
 * rather than leaving the member to guess — and the ordering means the first screenful is
 * the useful part of the taxonomy rather than its alphabetical beginning.
 */
export function InterestPicker({
  options,
  initialSelected,
}: {
  options: InterestOption[];
  initialSelected: string[];
}) {
  const t = useTranslations('interests');
  const [state, action, pending] = useActionState<InterestsState, FormData>(saveInterestsAction, {
    status: 'idle',
  });
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (o) => o.name.toLowerCase().includes(needle) || o.region.toLowerCase().includes(needle),
    );
  }, [options, query]);

  const atLimit = selected.length >= MAX_INTERESTS;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : atLimit
          ? current
          : [...current, id],
    );
  }

  return (
    <form action={action} className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
      {selected.map((id) => (
        <input key={id} type="hidden" name="tag" value={id} />
      ))}

      <label className="flex flex-col gap-1">
        <span className="sr-only">{t('searchLabel')}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          autoCapitalize="none"
          autoCorrect="off"
          className="border px-3 py-2"
          // 16px minimum or iOS zooms the page on focus.
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--radius)',
            fontSize: '16px',
          }}
        />
      </label>

      <p className="text-sm" style={{ color: atLimit ? 'var(--color-bad)' : 'var(--color-muted)' }}>
        {atLimit ? t('limitReached', { max: MAX_INTERESTS }) : t('count', { count: selected.length })}
      </p>

      <ul className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
        {visible.map((option) => {
          const on = selected.includes(option.id);
          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => toggle(option.id)}
                aria-pressed={on}
                // Disabled only when adding would exceed the cap — never when deselecting,
                // or a member who hit the limit could not get back under it.
                disabled={!on && atLimit}
                className="border px-3 py-2 text-sm disabled:opacity-40"
                style={{
                  borderRadius: 'var(--radius-pill)',
                  borderColor: on ? 'var(--color-accent)' : 'var(--color-border-strong)',
                  background: on ? 'var(--color-navy-tint)' : 'transparent',
                  color: on ? 'var(--color-accent)' : 'var(--color-fg)',
                  fontWeight: on ? 600 : 400,
                }}
              >
                {option.name}{' '}
                <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
                  {option.articleCount}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {visible.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t('noMatches')}
        </p>
      )}

      {state.status === 'error' && (
        <p className="text-sm" role="alert" style={{ color: 'var(--color-bad)' }}>
          {state.message}
        </p>
      )}
      {state.status === 'saved' && (
        <p className="text-sm" role="status" style={{ color: 'var(--color-ok)' }}>
          {t('saved')}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full px-3 py-3 font-medium text-white disabled:opacity-60"
        style={{ background: 'var(--color-accent)', borderRadius: 'var(--radius)' }}
      >
        {pending ? t('saving') : t('save')}
      </button>
    </form>
  );
}
