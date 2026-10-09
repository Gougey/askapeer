import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { ArticleCard } from '@/components/ArticleCard';
import { fetchSaved } from '@/lib/research-feed';
import { requireAccessToken } from '@/lib/session';
import { SaveButton } from './SaveButton';

/**
 * The saved list — a member's private shortlist of articles to come back to.
 *
 * ⚠️ **This is the only durable personal surface in the research half of the product.** My
 * Research was rebuilt in October to show nothing until it is asked a question, which was
 * right but left nothing that persists between visits except the criteria you last typed.
 *
 * No infinite scroll here, deliberately: a saved list is something you look *through*, not
 * something you fall down, and a plain "show older" link keeps the screen honest about how
 * much there is.
 */
export default async function SavedArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  const token = await requireAccessToken();
  const [t, format, { articles, nextCursor }] = await Promise.all([
    getTranslations('feed'),
    getFormatter(),
    fetchSaved(token, cursor),
  ]);

  return (
    <main className="flex flex-col" style={{ gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <div className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
        <h1 className="text-xl font-semibold">{t('savedHeading')}</h1>
        <Link
          href="/feed"
          className="w-fit text-sm font-medium"
          style={{ color: 'var(--color-accent)' }}
        >
          {t('backToResearch')}
        </Link>
      </div>

      {articles.length === 0 ? (
        /*
          The empty state has to teach the feature, because most members will see it before
          they have saved anything — "Nothing here" would waste the one moment they are
          looking.
        */
        <div
          className="flex flex-col border"
          style={{
            gap: 'var(--space-2)',
            padding: 'var(--space-4)',
            borderColor: 'var(--color-border)',
            borderRadius: 'var(--radius)',
            background: 'var(--color-navy-tint-2)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {t('savedEmpty')}
          </p>
          <Link
            href="/feed"
            className="self-start text-sm font-medium"
            style={{ color: 'var(--color-accent)' }}
          >
            {t('savedEmptyCta')}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
          {articles.map((article) => (
            <li key={article.id} className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
              {/*
                ⚠️ Retracted articles stay in the list and say so, loudly. Dropping one quietly
                would be the worst option available: a member may have saved it precisely
                because they were citing it.
              */}
              {article.retractedAt && (
                <p
                  className="border px-3 py-2 text-sm font-medium"
                  role="status"
                  style={{
                    borderRadius: 'var(--radius)',
                    borderColor: 'var(--color-bad)',
                    color: 'var(--color-bad)',
                  }}
                >
                  {t('savedRetracted', {
                    date: format.dateTime(new Date(article.retractedAt), {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }),
                  })}
                </p>
              )}
              <ul>
                <ArticleCard article={article} showTags={false} />
              </ul>
              <SaveButton articleId={article.id} initialSaved />
            </li>
          ))}
        </ul>
      )}

      {nextCursor && (
        <Link
          href={`/feed/saved?cursor=${encodeURIComponent(nextCursor)}`}
          className="w-full border px-3 py-2 text-center text-sm font-medium"
          style={{ borderColor: 'var(--color-border-strong)', borderRadius: 'var(--radius)' }}
        >
          {t('savedOlder')}
        </Link>
      )}
    </main>
  );
}
