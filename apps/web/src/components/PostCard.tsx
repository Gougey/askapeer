import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { AuthorBlock, PostCard as PostCardDto, TagRef } from '@/lib/forum';

/**
 * The author row (EPIC-C §13.1's author block). Handle and kudos only — there is no
 * grade, employer or specialty to show, which is the whole point: a reader can weigh the
 * contribution but not the contributor's seniority.
 */
export async function AuthorLine({ author }: { author: AuthorBlock }) {
  const t = await getTranslations('discussions');
  return (
    <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>
      <span className="font-medium" style={{ color: 'var(--color-fg)' }}>
        {author.handleName}
      </span>
      <span>{t('kudos', { count: author.kudosTotal })}</span>
      {author.isTopContributor && (
        <span
          className="rounded-full px-1.5 py-0.5"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          {t('topContributor')}
        </span>
      )}
    </span>
  );
}

export function TagList({ tags }: { tags: TagRef[] }) {
  if (tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li
          key={tag.id}
          className="rounded-full border px-2 py-0.5 text-xs"
          style={{ borderColor: 'var(--color-muted)', color: 'var(--color-muted)' }}
        >
          {tag.name}
        </li>
      ))}
    </ul>
  );
}

/** One row of the Discussions list (screen C1). */
export async function PostCard({ post }: { post: PostCardDto }) {
  const t = await getTranslations('discussions');
  return (
    <li
      className="rounded-xl border p-4"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-muted)' }}
    >
      <Link href={`/discussions/${post.id}`} className="flex flex-col gap-2">
        <span className="text-xs" style={{ color: 'var(--color-accent)' }}>
          {post.category.name}
        </span>
        <h2 className="font-medium">{post.title}</h2>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {post.snippet}
        </p>
        <TagList tags={post.tags} />
        <span className="flex items-center justify-between">
          <AuthorLine author={post.author} />
          <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-muted)' }}>
            <span aria-hidden>👏</span>
            <span>{post.kudosCount}</span>
            <span>·</span>
            <span>{t('answers', { count: post.answerCount })}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}
