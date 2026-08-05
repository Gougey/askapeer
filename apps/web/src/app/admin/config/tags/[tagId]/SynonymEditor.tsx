'use client';

import { useState, useTransition } from 'react';
import type { AdminTag } from '@/lib/admin';
import {
  previewSynonymsAction,
  reclassifyAction,
  saveSynonymsAction,
  type PreviewResult,
} from './actions';

/**
 * Editing one tag's synonyms, with a dry run before committing.
 *
 * **Preview is the feature.** Without it, changing a synonym means typing a word, saving,
 * reclassifying the whole corpus, and only then discovering whether it helped or flooded the
 * tag with noise — a loop slow enough that nobody experiments, which is exactly the
 * behaviour this screen exists to encourage. With it, "anterior cruciate ligament" can be
 * shown to take a tag from 17 articles to 216, *with the titles*, before anything is
 * written.
 *
 * Save and apply are separate on purpose: saving is instant and reversible, applying
 * rewrites every article's tags. Several edits, one apply.
 */
export function SynonymEditor({ tag }: { tag: AdminTag }) {
  const [text, setText] = useState(tag.synonyms.join(', '));
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const parsed = () =>
    text
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 1);

  const dirty = parsed().join('|') !== tag.synonyms.join('|');

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Synonyms</span>
        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Comma separated. These are the other words the literature uses for this tag — the
          classifier matches them as well as the name, and so does search.
        </span>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(null);
            setMessage(null);
          }}
          rows={3}
          className="rounded-lg border px-3 py-2"
          style={{
            borderColor: 'var(--color-muted)',
            background: 'var(--color-surface)',
            fontSize: '16px',
          }}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setMessage(null);
              setPreview(await previewSynonymsAction(tag.id, parsed()));
            })
          }
          className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50"
          style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
        >
          {pending ? 'Checking…' : 'Preview effect'}
        </button>

        <button
          type="button"
          disabled={pending || !dirty}
          onClick={() =>
            startTransition(async () => {
              await saveSynonymsAction(tag.id, parsed());
              setPreview(null);
              setMessage('Saved. Apply to the corpus to make it take effect.');
            })
          }
          className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--color-accent)' }}
        >
          Save synonyms
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await reclassifyAction();
              setMessage(`Applied: ${r.articles} articles re-tagged, ${r.matches} matches.`);
            })
          }
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          style={{ borderColor: 'var(--color-muted)', color: 'var(--color-fg)' }}
        >
          Apply to corpus
        </button>
      </div>

      {message && (
        <p className="text-sm" role="status" style={{ color: 'var(--color-ok)' }}>
          {message}
        </p>
      )}

      {preview && (
        <div
          className="rounded-lg border p-3 text-sm"
          style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-navy-tint-2)' }}
        >
          <p className="font-medium">
            {preview.current.articles} → {preview.proposed.articles} articles
            <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
              {' '}
              ({preview.proposed.articles - preview.current.articles >= 0 ? '+' : ''}
              {preview.proposed.articles - preview.current.articles})
            </span>
          </p>
          {preview.proposed.samples.length > 0 ? (
            <>
              <p className="mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>
                Would newly match — check these are right before saving:
              </p>
              <ul className="mt-1 flex flex-col gap-1 text-xs">
                {preview.proposed.samples.map((s) => (
                  <li key={s} style={{ color: 'var(--color-fg)' }}>
                    · {s}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-xs" style={{ color: 'var(--color-muted)' }}>
              Nothing new would match in the current corpus. That is not necessarily wrong —
              future articles may still use the term.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
