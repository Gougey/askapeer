'use client';

import { useActionState, useState } from 'react';
import { addTagAction, type AddTagState } from './actions';

const FACETS = ['region', 'muscle', 'structure', 'pathology'] as const;

/**
 * Adding a tag (EPIC-J, screen G8).
 *
 * Collapsed by default. Browsing and editing is the common visit; adding is occasional, and
 * a permanently-open form on a screen you mostly use to look things up is noise on every
 * other visit.
 *
 * **Parent is a pasted tag id, and blank means a new root region** — which is exactly what
 * Pelvis is. Said explicitly on the field, because "leave blank" is otherwise ambiguous
 * between "top level" and "I have not decided", and those produce very different taxonomies.
 */
export function AddTagForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<AddTagState, FormData>(addTagAction, {
    status: 'idle',
  });

  const field = {
    borderColor: 'var(--color-muted)',
    background: 'var(--color-surface)',
    fontSize: '16px',
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border px-3 py-2 text-sm font-medium"
        style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
      >
        + Add a tag
      </button>
    );
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border p-3"
      style={{ borderColor: 'var(--color-border-strong)' }}
    >
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Name</span>
          <input name="name" required className="rounded-lg border px-3 py-2" style={field} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Facet</span>
          <select name="facet" defaultValue="pathology" className="rounded-lg border px-3 py-2" style={field}>
            {FACETS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Parent tag id</span>
          <input
            name="parentId"
            placeholder="blank = new top-level region"
            className="rounded-lg border px-3 py-2"
            style={{ ...field, minWidth: '18rem' }}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Synonyms (optional, comma separated)</span>
        <input name="synonyms" className="rounded-lg border px-3 py-2" style={field} />
      </label>

      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
        Copy a parent&apos;s id from its row below. Leave it blank only if this really is a new
        region alongside Upper Limb and Lower Limb. Names need only be unique among siblings.
      </p>

      {state.status === 'error' && (
        <p className="text-sm" role="alert" style={{ color: 'var(--color-bad)' }}>
          {state.message}
        </p>
      )}
      {state.status === 'added' && (
        <p className="text-sm" role="status" style={{ color: 'var(--color-ok)' }}>
          Added “{state.name}”. Apply to the corpus from any tag page to classify articles
          against it.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--color-accent)' }}
        >
          {pending ? 'Adding…' : 'Add tag'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-muted)' }}
        >
          Close
        </button>
      </div>
    </form>
  );
}
