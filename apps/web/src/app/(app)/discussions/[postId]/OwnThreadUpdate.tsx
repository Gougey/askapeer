'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AnswerComposer } from './AnswerComposer';

/**
 * The author's own way into their own thread.
 *
 * **Not a prohibition — a different invitation.** Answering your own question is worth
 * keeping: a case is only worth reading six months later if it says how it turned out, and
 * "update: imaging came back showing X" is the most valuable thing the author can add. Block
 * it and the content does not disappear, it just gets buried in a reply — or nowhere at all,
 * when there are no answers to reply to yet.
 *
 * What was wrong was the framing. Andrew's screenshot shows his own freshly posted case,
 * "No answers yet", and directly beneath it an open box asking him to *"share what you would
 * do, and why"* — advice wording, written for a peer, addressed to the person who asked. On
 * your own thread the page ended with a large empty box that read as an unfinished task.
 *
 * So for the author it collapses behind a link and calls itself an update. The composer
 * underneath is the same one everyone else gets, with the same anonymity reminder; only the
 * way in differs.
 */
export function OwnThreadUpdate({ postId }: { postId: string }) {
  const t = useTranslations('discussions');
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="flex">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm underline"
          style={{ color: 'var(--color-muted)' }}
        >
          {t('addUpdate')}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-muted)' }}>
      <h3 className="mb-2 text-sm font-medium">{t('yourUpdate')}</h3>
      {/* `onDone` closes this back to the link: the author has said their piece, and leaving
          an empty composer open re-prompts for another one. */}
      <AnswerComposer postId={postId} onDone={() => setOpen(false)} />
    </div>
  );
}
