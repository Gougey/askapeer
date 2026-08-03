import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { fetchArticle } from '@/lib/research-feed';
import { requireAccessToken } from '@/lib/session';

/**
 * Article detail (screen B2).
 *
 * **The abstract is the destination, not a staging post to the publisher.** For a clinician
 * triaging literature the abstract, the evidence type and the reason it surfaced *are* the
 * decision; full text is a follow-up for the minority who want it, and is behind a paywall
 * often enough that sending everyone there would be a worse experience than this.
 *
 * An in-app browser was considered and is not available to a web app: Europe PMC and PubMed
 * both send `X-Frame-Options: DENY`, and the journals send `SAMEORIGIN`, so an embedded
 * viewer would render a blank box for essentially every article in the corpus. When the app
 * is installed, the OS already opens the outbound link in its own in-app browser over the
 * top of us, which is the behaviour that was actually wanted.
 */
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  const token = await requireAccessToken();
  const [t, format, article] = await Promise.all([
    getTranslations('feed'),
    getFormatter(),
    fetchArticle(token, articleId),
  ]);
  if (!article) notFound();

  const meta = [
    article.journal,
    article.publishedDate
      ? format.dateTime(new Date(article.publishedDate), {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : null,
  ].filter(Boolean);

  return (
    <main className="flex flex-col" style={{ gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <article className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
        <span className="flex flex-wrap items-center" style={{ gap: 'var(--space-2)' }}>
          <span
            className="px-2 py-0.5 text-xs font-medium"
            style={{
              borderRadius: 'var(--radius-pill)',
              background: 'var(--color-navy-tint)',
              color: 'var(--color-accent)',
            }}
          >
            {t(`evidence.${article.evidenceType}`)}
          </span>
          {article.openAccess && (
            <span className="text-xs" style={{ color: 'var(--color-ok)' }}>
              {t('openAccess')}
            </span>
          )}
        </span>

        <h1 className="text-xl font-semibold">{article.title}</h1>

        {meta.length > 0 && (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {meta.join(' · ')}
          </p>
        )}

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

        {article.abstract ? (
          <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
            <h2 className="text-sm font-semibold">{t('abstract')}</h2>
            <p className="text-sm" style={{ color: 'var(--color-fg)', lineHeight: 1.6 }}>
              {article.abstract}
            </p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {t('noAbstract')}
          </p>
        )}

        {article.url && (
          <a
            href={article.url}
            target="_blank"
            // `noopener` for the usual reason; `noreferrer` because a verified-only network
            // has no business telling a publisher which of its pages a member came from.
            rel="noopener noreferrer"
            className="w-full border px-3 py-3 text-center text-sm font-medium"
            style={{
              borderColor: 'var(--color-border-strong)',
              borderRadius: 'var(--radius)',
              color: 'var(--color-accent)',
            }}
          >
            {t('readFull')}
          </a>
        )}

        {article.doi && (
          <p className="text-xs" style={{ color: 'var(--color-faint)' }}>
            {t('doi', { doi: article.doi })}
          </p>
        )}
      </article>
    </main>
  );
}
