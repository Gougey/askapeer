'use server';

import { fetchFollowedPosts } from '@/lib/forum';
import { getAccessToken } from '@/lib/session';
import { PostCard } from '@/components/PostCard';
import type { InfinitePage } from '@/components/InfiniteList';

/** The next page of followed discussions, already rendered — see `discussions/load-more.tsx`
 *  for why a server action returns elements rather than JSON. */
export async function loadMoreFollowed(cursor: string): Promise<InfinitePage> {
  const token = await getAccessToken();
  if (!token) return { node: null, nextCursor: null };

  const { posts, nextCursor } = await fetchFollowedPosts(token, cursor);
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
