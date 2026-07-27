'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Tag } from '@/lib/forum';

/**
 * The composer's tag picker (screens D1/D2, FD-4).
 *
 * The clinical taxonomy is ~600 nodes over four levels, which rules out the flat
 * checkbox list this replaced. Two decisions shape what follows:
 *
 *  1. The picker lives in a *bottom sheet*, not inline. Inline was built and rejected —
 *     between the details field and a drilled-open tree it pushed "Post question" far
 *     below the fold. Collapsed, the block on the compose page is just the chosen chips
 *     plus an "add" button, so composing stays one short screen.
 *  2. *Any* node is taggable, not only leaves. Tapping a node in browse both selects it
 *     and drills into it, because a member who wants "Upper Limb" and a member who wants
 *     "Carpal tunnel syndrome" are doing the same gesture at different depths.
 *
 * Selection keeps the most specific tag: adding a descendant drops any ancestor already
 * chosen, so a post never carries both "Upper Limb" and something beneath it. Broadening
 * is the search side's job — a filter on an ancestor already finds everything below it
 * (subtree expansion at query time), so storing both would be noise.
 */

type TagIndex = {
  byId: Map<string, Tag>;
  /** Children keyed by parent id; the roots (regions) live under the `ROOTS` key. */
  childrenOf: Map<string | null, Tag[]>;
};

const ROOTS = null;
/** Past this the sheet is a scroll chore, and the query wants narrowing instead. */
const MAX_RESULTS = 20;
/** Below this, matches are too broad to rank usefully — browse is the better affordance. */
const MIN_QUERY = 2;
/** How far the sheet must be dragged down before release dismisses it. */
const DISMISS_PX = 90;

function indexTags(tags: Tag[]): TagIndex {
  const byId = new Map<string, Tag>();
  const childrenOf = new Map<string | null, Tag[]>();
  for (const tag of tags) {
    byId.set(tag.id, tag);
    const siblings = childrenOf.get(tag.parentId) ?? [];
    siblings.push(tag);
    childrenOf.set(tag.parentId, siblings);
  }
  return { byId, childrenOf };
}

function ancestorIds(id: string, byId: Map<string, Tag>): string[] {
  const out: string[] = [];
  let node = byId.get(id);
  while (node?.parentId) {
    out.push(node.parentId);
    node = byId.get(node.parentId);
  }
  return out;
}

/** Root-first names down to (and including) the node — the search result's breadcrumb. */
function trailNames(id: string, byId: Map<string, Tag>): string[] {
  const names: string[] = [];
  let node = byId.get(id);
  while (node) {
    names.unshift(node.name);
    node = node.parentId ? byId.get(node.parentId) : undefined;
  }
  return names;
}

export function TagPicker({ tags, max }: { tags: Tag[]; max: number }) {
  const t = useTranslations('compose');
  const index = useMemo(() => indexTags(tags), [tags]);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [capHit, setCapHit] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const addTag = useCallback(
    (tag: Tag) => {
      if (selected.includes(tag.id)) return;
      const ancestors = new Set(ancestorIds(tag.id, index.byId));
      // Dropping ancestors can free a slot, so the cap is judged against what survives,
      // not against what was there when the member tapped.
      const kept = selected.filter((id) => !ancestors.has(id));
      if (kept.length >= max) {
        setCapHit(true);
        return;
      }
      setSelected([...kept, tag.id]);
    },
    [selected, index.byId, max],
  );

  const removeTag = useCallback((id: string) => {
    setSelected((current) => current.filter((tagId) => tagId !== id));
  }, []);

  // The cap warning is a flash, not a state: it fires on the rejected tap and clears
  // itself, so it never sits there accusing a member who has since removed something.
  useEffect(() => {
    if (!capHit) return;
    const timer = setTimeout(() => setCapHit(false), 1400);
    return () => clearTimeout(timer);
  }, [capHit]);

  const closeSheet = useCallback(() => {
    setOpen(false);
    addButtonRef.current?.focus();
  }, []);

  const full = selected.length >= max;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{t('tags')}</span>
        <span
          className="text-xs tabular-nums"
          style={{ color: capHit ? 'var(--color-bad)' : 'var(--color-muted)' }}
          aria-live="polite"
        >
          {capHit ? t('tagPicker.capReached', { max }) : `${selected.length} / ${max}`}
        </span>
      </div>
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
        {t('tagsHint', { max })}
      </p>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const tag = index.byId.get(id);
            if (!tag) return null;
            return (
              <li key={id}>
                <SelectedChip tag={tag} onRemove={() => removeTag(id)} label={t('tagPicker.remove', { name: tag.name })} />
              </li>
            );
          })}
        </ul>
      )}

      {/*
        The selection is submitted as hidden inputs rather than held in the picker's own
        state at submit time, so the form posts the same `tagIds` shape the server action
        already reads — the picker is a control, not a special case.
      */}
      {selected.map((id) => (
        <input key={id} type="hidden" name="tagIds" value={id} />
      ))}

      <button
        ref={addButtonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-fit items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium"
        style={{
          borderColor: 'var(--color-border-strong)',
          borderStyle: full ? 'solid' : 'dashed',
          background: 'var(--color-bg)',
          color: full ? 'var(--color-muted)' : 'var(--color-accent)',
        }}
      >
        <span aria-hidden>＋</span>
        {selected.length === 0
          ? t('tagPicker.add')
          : full
            ? t('tagPicker.edit')
            : t('tagPicker.addMore')}
      </button>

      {open && (
        <TagSheet
          index={index}
          selected={selected}
          max={max}
          capHit={capHit}
          onAdd={addTag}
          onRemove={removeTag}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}

/** A chosen tag. `name · region` because names are only unique among siblings. */
function SelectedChip({ tag, onRemove, label }: { tag: Tag; onRemove: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={label}
      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
      style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
    >
      <span>{tag.name}</span>
      {tag.name !== tag.region && (
        <span style={{ color: 'var(--color-muted)' }}>· {tag.region}</span>
      )}
      <span aria-hidden style={{ color: 'var(--color-faint)' }}>
        ✕
      </span>
    </button>
  );
}

function TagSheet({
  index,
  selected,
  max,
  capHit,
  onAdd,
  onRemove,
  onClose,
}: {
  index: TagIndex;
  selected: string[];
  max: number;
  capHit: boolean;
  onAdd: (tag: Tag) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations('compose');
  const titleId = useId();
  const [query, setQuery] = useState('');
  const [path, setPath] = useState<string[]>([]);
  const [dragY, setDragY] = useState(0);
  const [entered, setEntered] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dragFrom = useRef<number | null>(null);

  // Mount off-screen, then slide in on the next frame — a CSS transition needs two
  // distinct values to animate between, which a single render can't provide.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // The page behind a sheet must not scroll with it, or dismissing lands somewhere else.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Escape closes, and Tab is kept inside: the sheet claims aria-modal, so focus escaping
  // to the form underneath would be a lie told to a screen reader.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  /** Tapping a node in browse selects it *and* drills into it. */
  function tapBrowse(tag: Tag, level: number) {
    setPath((current) => [...current.slice(0, level), tag.id]);
    onAdd(tag);
  }

  const trimmed = query.trim();
  const searching = trimmed.length >= MIN_QUERY;

  const results = useMemo(() => {
    if (!searching) return [];
    const needle = trimmed.toLowerCase();
    const hits: Tag[] = [];
    for (const tag of index.byId.values()) {
      if (tag.name.toLowerCase().includes(needle)) hits.push(tag);
    }
    hits.sort((a, b) => {
      // Prefix matches first (what you typed is what you meant), then leaves over
      // branches (the specific term beats the group that contains it), then brevity.
      const aStarts = a.name.toLowerCase().startsWith(needle);
      const bStarts = b.name.toLowerCase().startsWith(needle);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      if (a.hasChildren !== b.hasChildren) return a.hasChildren ? 1 : -1;
      return a.name.length - b.name.length;
    });
    return hits.slice(0, MAX_RESULTS);
  }, [index, searching, trimmed]);

  /** Regions, then one row per drilled-into level. */
  const levels = useMemo(() => {
    const rows: Tag[][] = [index.childrenOf.get(ROOTS) ?? []];
    for (const id of path) {
      const children = index.childrenOf.get(id);
      if (children?.length) rows.push(children);
    }
    return rows;
  }, [index, path]);

  const levelLabels = [
    t('tagPicker.level.region'),
    t('tagPicker.level.axis'),
    t('tagPicker.level.subGroup'),
    t('tagPicker.level.specific'),
  ];

  function onPointerDown(event: React.PointerEvent) {
    dragFrom.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: React.PointerEvent) {
    if (dragFrom.current === null) return;
    setDragY(Math.max(0, event.clientY - dragFrom.current));
  }
  function onPointerUp(event: React.PointerEvent) {
    if (dragFrom.current === null) return;
    const travelled = Math.max(0, event.clientY - dragFrom.current);
    dragFrom.current = null;
    setDragY(0);
    if (travelled > DISMISS_PX) onClose();
  }

  const dragging = dragFrom.current !== null;
  const offset = entered ? dragY : null;

  return (
    <>
      {/* Tapping the page behind the sheet closes it — the third dismissal, alongside
          "Done" and the swipe. There is nothing to undo: every tap has already committed. */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-200 motion-reduce:transition-none"
        style={{
          background: 'color-mix(in srgb, var(--color-fg) 45%, transparent)',
          opacity: entered ? 1 - Math.min(dragY / 320, 1) : 0,
        }}
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center">
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="flex h-[86dvh] w-full max-w-lg flex-col rounded-t-2xl border-t transition-transform duration-200 motion-reduce:transition-none"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            transform: offset === null ? 'translateY(100%)' : `translateY(${offset}px)`,
            transitionProperty: dragging ? 'none' : undefined,
          }}
        >
          <div
            className="flex shrink-0 cursor-grab justify-center pt-2.5 pb-1.5 touch-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-hidden
          >
            <span
              className="h-1 w-9 rounded-full"
              style={{ background: 'var(--color-border-strong)' }}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2.5 px-4 pb-2.5">
            <h2 id={titleId} className="text-base font-semibold">
              {t('tagPicker.title')}
            </h2>
            <span
              className="text-xs tabular-nums"
              style={{ color: capHit ? 'var(--color-bad)' : 'var(--color-muted)' }}
            >
              {selected.length} / {max}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto py-1 text-sm font-semibold"
              style={{ color: 'var(--color-accent)' }}
            >
              {t('tagPicker.done')}
            </button>
          </div>

          {/* The chosen chips ride in the sheet as well as on the page behind it, so a
              member can pick several and watch the set build without closing to check. */}
          <div className="flex shrink-0 flex-wrap gap-1.5 px-4 pb-2.5">
            {selected.length === 0 ? (
              <span className="text-xs" style={{ color: 'var(--color-faint)' }}>
                {t('tagPicker.noneSelected')}
              </span>
            ) : (
              selected.map((id) => {
                const tag = index.byId.get(id);
                if (!tag) return null;
                return (
                  <SelectedChip
                    key={id}
                    tag={tag}
                    onRemove={() => onRemove(id)}
                    label={t('tagPicker.remove', { name: tag.name })}
                  />
                );
              })
            )}
          </div>

          <div className="shrink-0 px-4 pb-2.5">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('tagPicker.searchPlaceholder')}
              aria-label={t('tagPicker.searchLabel')}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
            />
          </div>

          <div
            className="flex-1 overflow-y-auto overscroll-contain border-t px-4 pt-2 pb-6"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {searching ? (
              <SearchResults
                results={results}
                selected={selected}
                index={index}
                onAdd={onAdd}
                emptyLabel={t('tagPicker.noMatches')}
                addLabel={t('tagPicker.addResult')}
                addedLabel={t('tagPicker.added')}
              />
            ) : (
              <>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  {path.length === 0
                    ? t('tagPicker.browseHint')
                    : t('tagPicker.browsing', {
                        trail: path.map((id) => index.byId.get(id)?.name ?? '').join(' › '),
                      })}
                </p>
                {levels.map((nodes, depth) => (
                  <div key={depth} className="mt-3.5 flex flex-col gap-1.5">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-faint)' }}
                    >
                      {levelLabels[depth] ?? t('tagPicker.level.more')}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {nodes.map((tag) => {
                        const picked = selected.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => tapBrowse(tag, depth)}
                            aria-pressed={picked}
                            className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                            style={{
                              borderColor: picked ? 'var(--color-accent)' : 'var(--color-muted)',
                              color: picked ? 'var(--color-accent)' : 'var(--color-muted)',
                            }}
                          >
                            <span>{tag.name}</span>
                            {tag.hasChildren && (
                              <span
                                aria-hidden
                                className="text-[10px]"
                                style={{ color: picked ? 'var(--color-accent)' : 'var(--color-faint)' }}
                              >
                                ▸
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function SearchResults({
  results,
  selected,
  index,
  onAdd,
  emptyLabel,
  addLabel,
  addedLabel,
}: {
  results: Tag[];
  selected: string[];
  index: TagIndex;
  onAdd: (tag: Tag) => void;
  emptyLabel: string;
  addLabel: string;
  addedLabel: string;
}) {
  if (results.length === 0) {
    return (
      <p className="py-3 text-xs" style={{ color: 'var(--color-faint)' }}>
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="flex flex-col">
      {results.map((tag) => {
        const added = selected.includes(tag.id);
        // Where it sits, not what it is called — two "Rheumatoid arthritis" hits are only
        // told apart by the branch above them.
        const trail = trailNames(tag.id, index.byId).slice(0, -1).join(' › ');
        return (
          <li key={tag.id}>
            <button
              type="button"
              onClick={() => !added && onAdd(tag)}
              disabled={added}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left"
            >
              <span className="flex flex-col">
                <span className="text-sm font-medium">{tag.name}</span>
                {trail && (
                  <span className="text-[11px]" style={{ color: 'var(--color-faint)' }}>
                    {trail}
                  </span>
                )}
              </span>
              <span
                className="ml-auto shrink-0 text-xs"
                style={{ color: added ? 'var(--color-muted)' : 'var(--color-accent)' }}
              >
                {added ? addedLabel : addLabel}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
