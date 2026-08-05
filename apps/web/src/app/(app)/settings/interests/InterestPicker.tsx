'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { TagPicker } from '@/components/TagPicker';
import type { Tag } from '@/lib/forum';
import { saveInterestsAction, type InterestsState } from './actions';

/**
 * Generous next to the composer's five: this is a standing profile, not one post's labels.
 *
 * Was 30, which bit on first real use — Andrew's criteria needed eight chips for
 * "quadriceps" alone, because the taxonomy has no node meaning that. Subtree expansion has
 * since made broad areas cost one selection, but the cap was arbitrary either way.
 */
const MAX_INTERESTS = 100;

/**
 * Choosing what the research feed is about (screen F5).
 *
 * **The whole taxonomy, through the composer's picker.** Two earlier attempts got this
 * wrong the same way: they offered only the ~120 tags with the most articles behind them,
 * reasoning that a tag matching nothing is a dead end. That inverts how a member thinks.
 * Somebody specialising in hand therapy or paediatric sport does not pick from what happens
 * to be common — they pick *their area* — and a frequency cut silently removes it from the
 * screen. Worse, the corpus is a four-month snapshot, so the cut would bake a transient
 * state into what a member is permitted to care about.
 *
 * So every node is offered, reached by the same drill-down and type-ahead as the composer.
 * Reused rather than reimplemented for the reason `TagPicker` already documents: it is ~400
 * lines of bottom sheet, drill-down and iOS zoom handling, and a second copy would drift on
 * the first fix only one of them received. This screen's copy was bespoke, and did drift —
 * twice, before being deleted.
 *
 * **Article counts are deliberately absent.** "Nothing matches yet" is a fact about the
 * corpus on a given day, and the honest place to say it is the feed, which already does:
 * choosing an area with no articles yields the `fallback` mode and an explanation, rather
 * than a number in a picker quietly discouraging someone from their own specialty.
 */
export function InterestPicker({
  tags,
  initialSelected,
}: {
  tags: Tag[];
  initialSelected: string[];
}) {
  const t = useTranslations('interests');
  const [state, action, pending] = useActionState<InterestsState, FormData>(saveInterestsAction, {
    status: 'idle',
  });

  return (
    <form action={action} className="flex flex-col" style={{ gap: 'var(--space-4)' }}>
      {/* `fieldName="tag"` matches what the save action reads, and what search already posts. */}
      <TagPicker
        tags={tags}
        max={MAX_INTERESTS}
        fieldName="tag"
        initialSelectedIds={initialSelected}
        heading={t('pickerHeading')}
        hint={t('pickerHint')}
      />

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
