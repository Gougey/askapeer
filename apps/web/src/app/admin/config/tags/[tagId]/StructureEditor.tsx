'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminTag } from '@/lib/admin';
import { mergeTagAction, retireTagAction, updateTagAction } from './actions';

/**
 * The structural half of tag administration (EPIC-J §4, screen G8).
 *
 * Kept visually separate from the synonym editor because the two carry different risk.
 * Synonyms change what *matches* and are undone by deleting a word. These move things: a
 * re-parent changes subtree expansion for search, feed interests and post filtering at once,
 * and a merge rewrites rows in three tables. So each action states its consequence in the
 * button's own words, and merge asks twice.
 *
 * Parent and merge targets are chosen by pasting a tag id rather than through a picker.
 * That is deliberate for a first pass: the ids come from the list on the previous screen,
 * these are rare operations performed carefully, and a half-built tree selector would be a
 * worse way to spend the effort than shipping the operations at all.
 */
export function StructureEditor({ tag }: { tag: AdminTag }) {
  const router = useRouter();
  const [name, setName] = useState(tag.name);
  const [parentId, setParentId] = useState('');
  const [mergeInto, setMergeInto] = useState('');
  const [confirmMerge, setConfirmMerge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: true } | { ok: false; message: string }>, ok: string) =>
    start(async () => {
      setError(null);
      setNote(null);
      const result = await fn();
      if (result.ok) {
        setNote(ok);
        router.refresh();
      } else {
        setError(result.message);
      }
    });

  const box = {
    borderColor: 'var(--color-muted)',
    background: 'var(--color-surface)',
    fontSize: '16px',
  };

  return (
    <section className="flex flex-col gap-4 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
      <h2 className="text-sm font-semibold">Structure</h2>

      {error && (
        <p className="text-sm" role="alert" style={{ color: 'var(--color-bad)' }}>
          {error}
        </p>
      )}
      {note && (
        <p className="text-sm" role="status" style={{ color: 'var(--color-ok)' }}>
          {note}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border px-3 py-2" style={box} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Move under (tag id, blank = leave)</span>
          <input
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            placeholder="paste a tag id"
            className="rounded-lg border px-3 py-2"
            style={box}
          />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () =>
                updateTagAction(tag.id, {
                  name: name.trim() === tag.name ? undefined : name.trim(),
                  ...(parentId.trim() ? { parentId: parentId.trim() } : {}),
                }),
              'Saved. Re-apply the corpus if you moved it — depth affects match confidence.',
            )
          }
          className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--color-accent)' }}
        >
          Save name / move
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => retireTagAction(tag.id, !tag.retired),
              tag.retired ? 'Restored.' : 'Retired — hidden from pickers, existing posts unchanged.',
            )
          }
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          style={{ borderColor: 'var(--color-warn)', color: 'var(--color-warn)' }}
        >
          {tag.retired ? 'Restore tag' : 'Retire tag'}
        </button>
        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Retiring hides it from the composer and pickers. Nothing is deleted.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span>Merge this tag into (tag id)</span>
          <input
            value={mergeInto}
            onChange={(e) => {
              setMergeInto(e.target.value);
              setConfirmMerge(false);
            }}
            placeholder="paste the winning tag's id"
            className="rounded-lg border px-3 py-2"
            style={box}
          />
        </label>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Moves this tag&apos;s {tag.postCount} post{tag.postCount === 1 ? '' : 's'},{' '}
          {tag.articleCount} article{tag.articleCount === 1 ? '' : 's'} and any member
          interests onto the other tag, then retires this one. Not reversible from here.
        </p>
        {confirmMerge ? (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => mergeTagAction(tag.id, mergeInto.trim()), 'Merged.')}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--color-bad)' }}
            >
              Yes, merge and retire this tag
            </button>
            <button
              type="button"
              onClick={() => setConfirmMerge(false)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-muted)' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={pending || !mergeInto.trim()}
            onClick={() => setConfirmMerge(true)}
            className="self-start rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
            style={{ borderColor: 'var(--color-bad)', color: 'var(--color-bad)' }}
          >
            Merge…
          </button>
        )}
      </div>
    </section>
  );
}
