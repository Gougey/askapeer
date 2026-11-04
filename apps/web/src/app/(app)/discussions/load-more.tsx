'use server';

import type { DiscussionFilters } from '@/lib/discussion-filters';
import { fetchPosts, fetchSearch, fetchTags, type Tag } from '@/lib/forum';
import { getAccessToken } from '@/lib/session';
import { PostCard } from '@/components/PostCard';
import type { InfinitePage } from '@/components/InfiniteList';

/**
 * Fetch the next page and return it **already rendered**.
 *
 * A server action may return React elements, which is the whole reason infinite scroll
 * does not force a second copy of `PostCard`. The alternative — returning JSON and
 * rendering it in the client component — would need a client `PostCard` alongside the
 * async server one, and two cards drift the moment a fix lands on only one of them. That
 * is the same argument that kept the tag picker a single component.
 */
export async function loadMorePosts(cursor: string): Promise<InfinitePage> {
  const token = await getAccessToken();
  if (!token) return { node: null, nextCursor: null };

  const { posts, nextCursor } = await fetchPosts(token, cursor);
  return {
    node: (
      <>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </>
    ),
    nextCursor,
  };
}

/**
 * The next page of a search. ⚠️ The criteria are bound in by the page: a server action has no
 * URL, and without them page two of a search would be page two of everything.
 */
export async function loadMoreResults(
  filters: DiscussionFilters,
  cursor: string,
): Promise<InfinitePage> {
  const token = await getAccessToken();
  if (!token) return { node: null, nextCursor: null };

  const { posts, nextCursor } = await fetchSearch(token, { ...filters, cursor });
  return {
    node: (
      <>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </>
    ),
    nextCursor,
  };
}

/** The tag vocabulary, for when the search panel is opened. See `SearchPanel` for why then. */
export async function loadTags(): Promise<Tag[]> {
  const token = await getAccessToken();
  return token ? fetchTags(token) : [];
}
