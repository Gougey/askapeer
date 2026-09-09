'use client';

import { useActionState, useCallback, useEffect, useMemo, useState } from 'react';
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

  /*
   * **Chosen is not saved, and the screen has to say so.**
   *
   * The sheet's button says "Done", which is the more final-sounding of the two words on this
   * screen — and after it the chips already show the new selection, so the page looks finished.
   * A member reasonably stops there, and their interests never leave the browser. That is
   * exactly what happened in testing: seven old interests still stored, none of the two
   * chosen, and a feed correctly ranked on interests the member thought they had replaced.
   *
   * The picker's own note — "there is nothing to undo: every tap has already committed" — is
   * true in the composer, where the selection is committed along with the post. Here it is
   * committed only to the form.
   */
  const [chosen, setChosen] = useState<string[]>(initialSelected);
  // The baseline moves to whatever was last written, so a saved set stops reading as dirty.
  const [saved, setSaved] = useState<string[]>(initialSelected);
  const onSelectionChange = useCallback((ids: string[]) => setChosen(ids), []);
  const same = (a: string[], b: string[]) =>
    a.length === b.length && [...a].sort().join() === [...b].sort().join();
  const dirty = useMemo(() => !same(chosen, saved), [chosen, saved]);

  useEffect(() => {
    if (state.status === 'saved') setSaved(chosen);
    // Only when the action reports a save; `chosen` moving must not clear the flag itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

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
        onSelectionChange={onSelectionChange}
      />

      {dirty && (
        <p
          className="text-sm font-medium"
          role="status"
          /* Accent, not `--color-warn`: that one is functional and admin-only. This is not a
             fault, it is the next step, so it wears the colour the save button wears. */
          style={{ color: 'var(--color-accent)' }}
        >
          {t('unsaved')}
        </p>
      )}

      {state.status === 'error' && (
        <p className="text-sm" role="alert" style={{ color: 'var(--color-bad)' }}>
          {state.message}
        </p>
      )}
      {state.status === 'saved' && !dirty && (
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
        {pending ? t('saving') : dirty ? t('saveChanges') : t('save')}
      </button>
    </form>
  );
}
