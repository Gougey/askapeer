import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { AuthorBlock, PostCard as PostCardDto, TagRef } from '@/lib/forum';
import { PostedAt } from './PostedAt';
import { CaseCross, Stat } from './StatIcons';

/**
 * The author row (EPIC-C §13.1's author block): the handle, then the author's standing by kind
 * — Insightful and Useful totals, grey and slightly smaller. There is no grade, employer or
 * specialty to show, which is the whole point: a reader can weigh the contribution but not the
 * contributor's seniority.
 *
 * Grey says "the person", colour says "this post" (Option B, 20 October 2026): the same two
 * icons appear in colour on the line below, for the post's own counts, and the colour is what
 * keeps the two apart.
 */
export async function AuthorLine({ author }: { author: AuthorBlock }) {
  const t = await getTranslations('discussions');
  return (
    <span className="flex min-w-0 items-center gap-2 text-xs" style={{ color: 'var(--color-muted)' }}>
      {/*
        The handle truncates, the standing does not. `min-w-0` on the flex parent is what lets
        a child shrink below its content width at all; without it `truncate` does nothing.
        Handles are capped at 20 characters, so on a phone the ellipsis should never be needed.
      */}
      <span className="truncate font-medium" style={{ color: 'var(--color-fg)' }}>
        {author.handleName}
      </span>
      <span
        className="flex shrink-0 items-center gap-2"
        style={{ fontVariantNumeric: 'tabular-nums' }}
        aria-label={t('authorStanding', {
          handle: author.handleName,
          insightful: author.insightfulTotal,
          useful: author.usefulTotal,
        })}
        role="img"
      >
        <Stat kind="insightful" count={author.insightfulTotal} label="" muted />
        <Stat kind="useful" count={author.usefulTotal} label="" muted />
      </span>
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
  const isCase = post.type === 'case_discussion';
  return (
    <li
      className="border"
      style={{
        background: 'var(--color-surface)',
        // A clinical case is marked by the teal border *and* the cross before its title — the
        // border alone would leave it to colour, which some readers cannot see.
        borderColor: isCase ? 'var(--color-category-teal)' : 'var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-4)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <Link href={`/discussions/${post.id}`} className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
        <h2 className="flex items-start gap-2 font-medium">
          {isCase && <CaseCross label={t('clinicalCase')} />}
          <span>{post.title}</span>
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {post.snippet}
        </p>
        <TagList tags={post.tags} />
        {/*
          Two lines, because they answer different questions (Option B). The first is the
          person: the handle and their standing, in grey. The second is this post: when it was
          asked, and how it has done — Insightful, Useful, answers and following, each in its
          own colour, grey at zero. Icons and numbers only, in tabular figures so they line up
          down a scrolling list.
        */}
        <span
          className="flex flex-col gap-1.5 border-t pt-2 text-xs"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
        >
          <AuthorLine author={post.author} />
          <span className="flex items-center justify-between gap-2">
            <PostedAt iso={post.createdAt} editedIso={post.editedAt} className="shrink-0 text-xs" />
            <PostStats post={post} />
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * The post's four counts. Every one is always shown — grey at zero, in its colour once it is
 * above zero (Adrian, 20 October) — so a card never changes shape as a discussion fills up.
 *
 * Following is the eye, and it counts people watching **who have not answered**: a raw
 * follower count would restate the answer count, because asking and answering both subscribe
 * you. See `watcherCountSql` in the API.
 */
async function PostStats({ post }: { post: PostCardDto }) {
  const t = await getTranslations('discussions');
  return (
    <span className="flex shrink-0 items-center gap-3" style={{ fontVariantNumeric: 'tabular-nums' }}>
      <Stat kind="insightful" count={post.insightfulCount} label={t('insightful', { count: post.insightfulCount })} />
      <Stat kind="useful" count={post.usefulCount} label={t('useful', { count: post.usefulCount })} />
      <Stat kind="answers" count={post.answerCount} label={t('answersCount', { count: post.answerCount })} />
      <Stat kind="follows" count={post.watcherCount} label={t('followingCount', { count: post.watcherCount })} />
    </span>
  );
}
