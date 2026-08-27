import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { AuthorBlock, PostCard as PostCardDto, TagRef } from '@/lib/forum';
import { categoryColour } from '@/lib/category-colour';
import { PostedAt } from './PostedAt';

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
    </span>
  );
}

export function TagList({ tags }: { tags: TagRef[] }) {
  if (tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
      {tags.map((tag) => (
        <li
          key={tag.id}
          className="border px-2 py-0.5 text-xs"
          // §8.2: a filter/topic chip is a pill outlined in --color-border-strong. The
          // outline was --color-muted, which is a *text* colour — far too dark for a
          // hairline (§5.3) and the reason the tag row read as heavier than the title.
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
  );
}

/** One row of the Discussions list (screen C1). */
export async function PostCard({ post }: { post: PostCardDto }) {
  const t = await getTranslations('discussions');
  return (
    <li
      className="border"
      // §8.3 — the card: surface, 1px hairline, --radius, --space-4 padding, and the
      // faint card shadow. Previously a 12px `rounded-xl` with a --color-muted border,
      // which is a text colour used as a hairline.
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-4)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <Link href={`/discussions/${post.id}`} className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
        {/*
          The category alone says what kind of post this is. A "Case" pill sat here while
          the clinical-case category could also hold questions; now that the category is
          scoped to case discussions it labels them on its own, and the pill said it twice.
        */}
        <span className="text-xs" style={{ color: categoryColour(post.category.colour) }}>
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
            <span
              className="flex items-center gap-1 font-semibold"
              style={{ color: 'var(--color-kudos-text)' }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-[15px]" style={{ color: 'var(--color-kudos)' }}>
                <path d="M12 2l2.9 6.3 6.9.6-5.2 4.5 1.6 6.7L12 17.3 5.8 20.6l1.6-6.7L2.2 8.9l6.9-.6z" />
              </svg>
              {post.kudosCount}
            </span>
            <span>·</span>
            <span>{t('answers', { count: post.answerCount })}</span>
            <span>·</span>
            {/* Screen spec C1 lists a timestamp among the card's fields and style guide §8.3
                puts it in this footer; it had never been built, so the list was the one
                surface where a question's age was invisible. */}
            <PostedAt iso={post.createdAt} editedIso={post.editedAt} />
          </span>
        </span>
      </Link>
    </li>
  );
}
