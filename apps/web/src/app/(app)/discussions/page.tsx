import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { fetchPosts } from '@/lib/forum';
import { requireAccessToken } from '@/lib/session';
import { PostCard } from '@/components/PostCard';

/**
 * The Discussions list (screen C1), chronological. The personalised feed and trending
 * fallback are S7 — until then newest-first is the whole ordering, which at seed-period
 * volumes is also the most useful one.
 */
export default async function DiscussionsPage() {
  const token = await requireAccessToken();
  const [t, { posts }] = await Promise.all([getTranslations('discussions'), fetchPosts(token)]);

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      {/*
        Search sits here rather than in the bottom nav: the nav's five tabs are the agreed
        model (screen spec §1) and a sixth would crowd the row on a phone. Search is a thing
        you do *to* discussions, so it belongs on the surface it searches.
      */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t('heading')}</h1>
        <Link
          href="/search"
          className="flex items-center gap-1.5 border px-3 py-2 text-sm font-medium"
          style={{
            borderColor: 'var(--color-border-strong)',
            borderRadius: 'var(--radius-pill)',
            color: 'var(--color-accent)',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="size-[15px]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          {t('searchCta')}
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {t('empty')}
          </p>
          <Link
            href="/create"
            // §8.1 — a primary button is a navy pill, 700.
            className="px-4 py-2 text-sm font-bold text-white"
            style={{ background: 'var(--color-accent)', borderRadius: 'var(--radius-pill)' }}
          >
            {t('emptyCta')}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </ul>
      )}
    </main>
  );
}
