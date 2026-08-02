'use server';

import { fetchPosts } from '@/lib/forum';
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
