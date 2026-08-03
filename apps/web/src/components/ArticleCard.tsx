import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
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

/** One row of the Feed (screen B1). */
export async function ArticleCard({ article }: { article: FeedArticle }) {
  const [t, format] = await Promise.all([getTranslations('feed'), getFormatter()]);
  const evidence = evidenceStyle(article.evidenceType);

  return (
    <li
      className="border"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-4)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <Link
        href={`/feed/${article.id}`}
        className="flex flex-col"
        style={{ gap: 'var(--space-2)' }}
      >
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

        <h2 className="font-medium">{article.title}</h2>

        {article.snippet && (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {article.snippet}
          </p>
        )}

        {/*
          The classifier's working, shown rather than asserted — the same explainability the
          prototype proved out. Once interests exist these become "because you follow X";
          until then they answer "why is this in my feed at all".
        */}
        {article.tags.length > 0 && (
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
      </Link>
    </li>
  );
}
