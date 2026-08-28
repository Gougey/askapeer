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
    <span className="flex min-w-0 items-center text-xs" style={{ color: 'var(--color-muted)' }}>
      {/*
        Standing rides in brackets against the name — "MrFixit(68)" — rather than as a second
        "68 kudos" beside the post's own count. The card carries two kudos numbers, one about
        the person and one about this question, and spelling out both left the gold star
        sitting next to the smaller of the two. Bracketed, unlabelled and unstarred, it reads
        as belonging to the handle instead of competing with the post.
      */}
      {/*
        The handle truncates, the standing does not. A handle may be 30 characters, and on a
        358px card that is the only part of the row long enough to need giving way — so the
        ellipsis eats the name and the bracketed number, which is short and is the point,
        always survives. `min-w-0` on the flex parent is what lets a child shrink below its
        content width at all; without it `truncate` silently does nothing.
      */}
      <span className="truncate font-medium" style={{ color: 'var(--color-fg)' }}>
        {author.handleName}
      </span>
      <span className="shrink-0" style={{ color: 'var(--color-muted)' }}>
        ({author.kudosTotal})
      </span>
      <span className="sr-only">{t('kudos', { count: author.kudosTotal })}</span>
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
        {/*
          Two lines, because they answer different questions. The first is attribution — who
          wrote this and when. The second is how it did: three counts, icons only, tabular
          figures so they line up down a scrolling list. Spelling the stats out ("2 answers ·
          3 following") was what overflowed a 358px row once the date arrived.
        */}
        <span
          className="flex items-center justify-between gap-2 border-t pt-2 text-xs"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <AuthorLine author={post.author} />
            <span aria-hidden className="shrink-0" style={{ opacity: 0.55 }}>·</span>
            <PostedAt iso={post.createdAt} editedIso={post.editedAt} className="shrink-0 text-xs" />
          </span>
          <PostStats
            kudos={post.kudosCount}
            answers={post.answerCount}
            watchers={post.watcherCount}
          />
        </span>
      </Link>
    </li>
  );
}


/**
 * The card's three counts.
 *
 * **Kudos is the only one allowed the gold star** (style guide §2.1) — it is the product's
 * single status colour, so the other two are muted or they would read as kudos of some kind.
 * Answers borrow the bottom nav's speech bubble, which already means "discussion" everywhere
 * else in the app. Watching is an eye rather than a bell: the bell was deliberately taken off
 * the follow pill, and this is "people watching", not "notifications".
 *
 * The eye appears **only when someone is watching who has not answered**. A raw follower
 * count would restate the answer count — authoring and answering both subscribe you, so
 * across the seeded corpus 65 of 67 posts had followers equal to participants plus the
 * author. A stat that moves in lockstep with its neighbour is a third number to parse for
 * nothing; this way the eye showing up means something happened.
 */
async function PostStats({
  kudos,
  answers,
  watchers,
}: {
  kudos: number;
  answers: number;
  watchers: number;
}) {
  const t = await getTranslations('discussions');
  const icon = 'size-[14px] shrink-0';

  return (
    <span
      className="flex shrink-0 items-center gap-3"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      <span
        className="flex items-center gap-1 font-semibold"
        style={{ color: 'var(--color-kudos-text)' }}
        title={t('kudos', { count: kudos })}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={icon} style={{ color: 'var(--color-kudos)' }}>
          <path d="M12 2l2.9 6.3 6.9.6-5.2 4.5 1.6 6.7L12 17.3 5.8 20.6l1.6-6.7L2.2 8.9l6.9-.6z" />
        </svg>
        {kudos}
        <span className="sr-only">{t('kudos', { count: kudos })}</span>
      </span>

      <span className="flex items-center gap-1" title={t('answers', { count: answers })}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={icon}>
          <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4-.9L3 21l1.9-4.5A8.4 8.4 0 0 1 3 11.5a8.5 8.5 0 0 1 9-8.4 8.5 8.5 0 0 1 9 8.4z" />
        </svg>
        {answers}
        <span className="sr-only">{t('answers', { count: answers })}</span>
      </span>

      {watchers > 0 && (
        <span className="flex items-center gap-1" title={t('watching', { count: watchers })}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={icon}>
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {watchers}
          <span className="sr-only">{t('watching', { count: watchers })}</span>
        </span>
      )}
    </span>
  );
}
