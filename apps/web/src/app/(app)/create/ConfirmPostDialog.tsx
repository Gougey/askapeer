'use client';

import { useEffect, useId, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';

/**
 * The anonymity gate shown when the member commits to posting (screens D1/D2).
 *
 * The zero-tolerance reminder is a domain-mandated surface in every posting UI (EPIC-C
 * §13.5, gap G-7). It used to be a standing block above the fields, which read before
 * anything was typed but cost a lot of vertical space and went unread once familiar. It is
 * now split: a short line stays with the form so it is still seen *before* writing, and the
 * full warning appears here, at the last moment where disclosure can still be prevented.
 *
 * This is a **reminder, not an attestation.** Nothing is recorded server-side. The
 * recorded, identity-linked attestation is EPIC-E's, and belongs only to case discussions
 * (S9) — this must not be mistaken for it, or relied on as evidence that a member agreed
 * to anything.
 *
 * The confirm button is a real `type="submit"`: the dialog renders inside the form, so
 * posting still travels the same server action, with the same pending state, as before.
 */
export function ConfirmPostDialog({ onCancel }: { onCancel: () => void }) {
  const t = useTranslations('compose');
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Escape cancels, and Tab stays inside — the dialog claims aria-modal, so letting focus
  // reach the form behind it would be a lie told to a screen reader.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onCancel]);

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'color-mix(in srgb, var(--color-fg) 45%, transparent)' }}
        onClick={onCancel}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="w-full max-w-lg rounded-t-2xl border-t px-4 pt-5 outline-none"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
          }}
        >
          {/*
            Bordered in --color-bad like the block it replaces. This is the app's one
            zero-tolerance rule; it should not look like a routine confirmation.
          */}
          <div
            className="rounded-lg border p-3"
            style={{ borderColor: 'var(--color-bad)' }}
          >
            <h2 id={titleId} className="text-sm font-semibold">
              {t('anonymity.heading')}
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
              {t('anonymity.body')}
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <ConfirmButton />
            <CancelButton onCancel={onCancel} />
          </div>
        </div>
      </div>
    </>
  );
}

function ConfirmButton() {
  const t = useTranslations('compose');
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg px-3 py-3 font-medium text-white disabled:opacity-50"
      style={{ background: 'var(--color-accent)' }}
    >
      {pending ? t('publishing') : t('publish')}
    </button>
  );
}

/** Cancel is disabled mid-flight — the post is already away; going "back" would mislead. */
function CancelButton({ onCancel }: { onCancel: () => void }) {
  const t = useTranslations('compose');
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      onClick={onCancel}
      disabled={pending}
      className="rounded-lg px-3 py-3 text-sm font-medium disabled:opacity-50"
      style={{ color: 'var(--color-accent)' }}
    >
      {t('confirm.cancel')}
    </button>
  );
}
