import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { SaveButton } from '@/app/(app)/feed/saved/SaveButton';
import type { EvidenceType, FeedArticle } from '@/lib/research-feed';

/**
 * How strongly the evidence pill reads.
 *
 * Only the top of the ladder is coloured. A systematic review or a randomised trial is
 * worth spotting while scrolling; everything below is context you read once you have
 * stopped. Colouring all five would make the row a rainbow and tell a clinician nothing —
 * and the verify green stays out of it, because it means *verified member*, not *good
 * evidence*.
 */
function evidenceStyle(type: EvidenceType): { color: string; background: string } {
  if (type === 'systematic_review' || type === 'randomised_trial') {
    return { color: 'var(--color-accent)', background: 'var(--color-navy-tint)' };
  }
  return { color: 'var(--color-muted)', background: 'transparent' };
}

/** One row of the Feed (screen B1), or of the papers tab in search. */
export async function ArticleCard({
  article,
  showTags = true,
}: {
  article: FeedArticle;
  /** Off where the screen has asked nothing of the taxonomy — see the chips below. */
  showTags?: boolean;
}) {
  const [t, format] = await Promise.all([getTranslations('feed'), getFormatter()]);
  const evidence = evidenceStyle(article.evidenceType);

  return (
    /*
     * ⚠️ **`relative`, and the whole card is one tap target by a stretched link.**
     *
     * The card used to be a single `<Link>` wrapping everything, which is why saving could not
     * live here: a button inside an anchor is invalid, and the press is ambiguous. So the
     * anchor now wraps the *title* — giving it a real accessible name, which an empty overlay
     * anchor would not have — and `after:absolute after:inset-0` stretches its hit area over
     * the card. The save button is a sibling with its own stacking context above that layer.
     *
     * The one thing this gives up is selecting the snippet text by dragging, which the
     * pseudo-element swallows. On a phone, where this screen lives, long-press on a link was
     * already the context menu rather than a selection.
     */
    <li
      className="relative border"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-4)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
        {/*
          Saving sits on this row, beside the evidence pill — Adrian's placement, from using the
          saved list: a control *between* two cards cannot say which one it belongs to, and the
          same control inside the card also makes save-and-move-on possible straight from the
          list, without opening the article at all.
        */}
        <div className="flex items-start" style={{ gap: 'var(--space-2)' }}>
          <span className="flex flex-wrap items-center" style={{ gap: 'var(--space-2)' }}>
            <span
              className="px-2 py-0.5 text-xs font-medium"
              style={{ ...evidence, borderRadius: 'var(--radius-pill)' }}
            >
              {t(`evidence.${article.evidenceType}`)}
            </span>
            {article.openAccess && (
              <span className="text-xs" style={{ color: 'var(--color-ok)' }}>
                {t('openAccess')}
              </span>
            )}
          </span>
          <span className="ml-auto">
            <SaveButton articleId={article.id} initialSaved={article.saved} variant="compact" />
          </span>
        </div>

        <h2 className="font-medium">
          <Link
            href={`/feed/${article.id}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {article.title}
          </Link>
        </h2>

        {article.snippet && (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {article.snippet}
          </p>
        )}

        {/*
          The classifier's working, shown rather than asserted: the chips answer "why did this
          match?".
          ⚠️ **Off in My Research**, which no longer asks anything of the taxonomy — a row of
          clinical chips under every result was evidence for a match the member had not asked
          for. Search keeps them, because there a tag *is* one of the filters.
        */}
        {showTags && article.tags.length > 0 && (
          <ul className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
            {article.tags.map((tag) => (
              <li
                key={tag.id}
                className="border px-2 py-0.5 text-xs"
                style={{
                  borderRadius: 'var(--radius-pill)',
                  borderColor: 'var(--color-border-strong)',
                  color: 'var(--color-muted)',
                }}
              >
                {tag.name}
                {/*
                  `name · region`, the same treatment the picker gives a chosen tag, and for
                  the same reason: a name is only unique among its siblings. "Tendons" exists
                  under both Shoulder and Knee, so without the region a card cannot say why it
                  matched — selecting *Upper Limb* pulls in its whole subtree, and an Achilles
                  paper can arrive through a tag called `Tendinopathy` that happens to live
                  under Forearm. Suppressed when the tag *is* the region, which would just
                  repeat itself.
                */}
                {tag.region && tag.name !== tag.region && (
                  <span style={{ color: 'var(--color-faint)' }}> · {tag.region}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {[article.journal, article.publishedDate ? format.dateTime(new Date(article.publishedDate), {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }) : null]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
    </li>
  );
}
