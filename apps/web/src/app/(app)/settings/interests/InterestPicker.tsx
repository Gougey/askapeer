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
 * So the *offered set* is chosen by corpus frequency — only tags with real articles behind
 * them — while the *display* is alphabetical. Those are different jobs and were conflated
 * at first: ordering the screen by frequency put the useful tags first but read as random
 * while scrolling, because a member scanning a list has no idea it is sorted by something
 * invisible. The article count stays on every chip, so the information frequency-ordering
 * carried is still there without dictating the order.
 *
 * Grouping by anatomical region would suit clinicians better than A–Z, and the data is
 * already available — but not yet: the taxonomy parks generic condition groups under one
 * specific region (*Tendon Disorders*, *Ligament Injuries* and *Osteoarthritis* all sit
 * under Cervical Spine while matching mostly knee, Achilles and rotator-cuff articles), so
 * region headings would actively mislead. Raised with Andrew; revisit when resolved.
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
    const matched = needle
      ? options.filter((o) => o.name.toLowerCase().includes(needle))
      : options;
    return [...matched].sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
  }, [options, query]);

  /** Alphabetical sections. Only letters that actually have entries get a heading or a rail
   *  key — offering a member a letter that jumps nowhere is worse than omitting it. */
  const groups = useMemo(() => {
    const byLetter = new Map<string, InterestOption[]>();
    for (const option of visible) {
      const letter = option.name[0]?.toUpperCase() ?? '#';
      const key = /[A-Z]/.test(letter) ? letter : '#';
      byLetter.set(key, [...(byLetter.get(key) ?? []), option]);
    }
    return [...byLetter.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visible]);

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

      <div className="flex" style={{ gap: 'var(--space-2)' }}>
        <div className="min-w-0 flex-1 flex flex-col" style={{ gap: 'var(--space-4)' }}>
          {groups.map(([letter, items]) => (
            <section key={letter} id={`letter-${letter}`} style={{ scrollMarginTop: 'var(--space-4)' }}>
              <h2
                className="text-xs font-semibold uppercase"
                style={{ color: 'var(--color-faint)', letterSpacing: '0.08em', marginBottom: 'var(--space-2)' }}
              >
                {letter}
              </h2>
              <ul className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
                {items.map((option) => {
                  const on = selected.includes(option.id);
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => toggle(option.id)}
                        aria-pressed={on}
                        // Disabled only when adding would exceed the cap — never when
                        // deselecting, or a member who hit the limit could not get back under it.
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
            </section>
          ))}
        </div>

        {/*
          The A–Z rail. Sticky rather than fixed, so it travels with the list instead of
          floating over unrelated screen, and hidden while searching — a filtered result set
          is short, and a rail whose letters mostly jump nowhere is worse than no rail.

          Only letters present are rendered, and they are anchors rather than scroll maths:
          `scrollIntoView` on the section keeps it correct however the layout changes.
        */}
        {!query.trim() && groups.length > 1 && (
          <nav
            aria-label={t('jumpToLetter')}
            className="sticky flex shrink-0 flex-col items-center self-start"
            style={{ top: 'var(--space-4)', gap: '1px' }}
          >
            {groups.map(([letter]) => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="px-2 text-[11px] font-semibold leading-[1.35]"
                style={{ color: 'var(--color-accent)' }}
              >
                {letter}
              </a>
            ))}
          </nav>
        )}
      </div>

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
