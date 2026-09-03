import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArticleCard } from '@/components/ArticleCard';
import { InfiniteList } from '@/components/InfiniteList';
import { fetchFeed } from '@/lib/research-feed';
import { requireAccessToken } from '@/lib/session';
import { isEvidence, type Evidence } from '@/lib/evidence';
import { EvidenceFilter } from './EvidenceFilter';
import { loadMoreArticles } from './load-more';

/**
 * The Feed (screen B1) — research and news scored against the clinical taxonomy.
 *
 * **Unfiltered, deliberately.** How a member picks interests is still open — reuse the
 * 588-node taxonomy, or offer a shorter curated list? — and the honest way to settle that
 * is to look at which tags a real corpus actually produces rather than to guess in advance.
 * So everyone sees the same ranking for now: evidence quality, recency, and a nudge for
 * being placeable in the taxonomy at all. The personalised version replaces one term in
 * that ordering and nothing else on this screen.
 */
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; evidence?: string }>;
}) {
  const { cursor, evidence: rawEvidence } = await searchParams;
  // Anything unrecognised is treated as no filter rather than passed on: the control only
  // ever emits these five, so a stray value came from a hand-edited URL and the honest
  // response is the unfiltered feed, not an error page.
  const evidence: Evidence | '' = isEvidence(rawEvidence) ? rawEvidence : '';
  const token = await requireAccessToken();
  const [t, { articles, nextCursor, mode }] = await Promise.all([
    getTranslations('feed'),
    fetchFeed(token, cursor, evidence || undefined),
  ]);

  return (
    <main className="flex flex-col" style={{ gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      {/*
        Heading and filter share a row. The standing description that used to sit under the
        heading said what the screen already demonstrates — the first card is recent, and the
        evidence type is on every card — so it cost a line of vertical space on the smallest
        screens to repeat what was visible. The filter earns that space instead.
      */}
      <div className="flex items-center justify-between" style={{ gap: 'var(--space-3)' }}>
        <h1 className="text-xl font-semibold">{t('heading')}</h1>
        <EvidenceFilter value={evidence} />
      </div>

      {/*
        Say which feed this is, and only when it is not the one the member chose. A
        personalised feed needs no explanation; a general or fallback one does, or it looks
        like the interests were ignored. The link is here rather than only in settings
        because this is the moment someone wants it.
      */}
      {mode !== 'personalised' && (
        <div
          className="flex flex-col border"
          style={{
            gap: 'var(--space-2)',
            padding: 'var(--space-3)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--radius)',
            background: 'var(--color-navy-tint-2)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {mode === 'fallback' ? t('fallbackNote') : t('generalNote')}
          </p>
          <Link
            href="/settings/interests"
            className="self-start text-sm font-medium"
            style={{ color: 'var(--color-accent)' }}
          >
            {t('personalise')}
          </Link>
        </div>
      )}

      {articles.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {/* A filtered empty feed is not the same event as an empty corpus, and saying so
              is what stops it reading as a fault. */}
          {evidence ? t('emptyFiltered', { type: t(`evidence.${evidence}`) }) : t('empty')}
        </p>
      ) : (
        <InfiniteList
          initialCursor={nextCursor}
          // Bound rather than read from the URL inside the action: the filter has to survive
          // paging, or page two silently returns the unfiltered feed.
          loadMore={loadMoreArticles.bind(null, evidence || undefined)}
          storageKey={evidence ? `feed:${evidence}` : 'feed'}
          fallbackHref={
            nextCursor
              ? `/feed?cursor=${nextCursor}${evidence ? `&evidence=${evidence}` : ''}`
              : null
          }
        >
          <ul className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </ul>
        </InfiniteList>
      )}
    </main>
  );
}
