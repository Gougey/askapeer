import { API_ORIGIN } from './api';
import type { CaseDetail } from './cases';

/** Mirrors the EPIC-C §13 DTOs the API returns. */
export type AuthorBlock = {
  handleId: string;
  handleName: string;
  kudosTotal: number;
  isTopContributor: boolean;
};

export type TagRef = { id: string; name: string };

export type PostCard = {
  id: string;
  type: 'question' | 'case_discussion';
  title: string;
  snippet: string;
  category: { id: string; name: string };
  tags: TagRef[];
  author: AuthorBlock;
  answerCount: number;
  kudosCount: number;
  createdAt: string;
  editedAt: string | null;
};

export type ThreadComment = {
  id: string;
  author: AuthorBlock;
  body: string;
  parentCommentId: string | null;
  kudosCount: number;
  hasKudosed: boolean;
  isMine: boolean;
  createdAt: string;
  editedAt: string | null;
};

export type Thread = {
  post: Omit<PostCard, 'snippet'> & { body: string; status: string };
  /** Present only for `type = case_discussion` (EPIC-E §2). The structured template is
   *  what screen C4 renders for a case; `post.body` is a flattened copy for the search
   *  index and is never shown. */
  caseDetail?: CaseDetail;
  comments: ThreadComment[];
  viewerContext: { isAuthor: boolean; hasKudosedPost: boolean };
};

export type Category = { id: string; name: string; description: string | null };

/**
 * One node of the clinical taxonomy (region → axis → sub-group → leaf). The API returns
 * the tree flat and the composer's picker rebuilds it, so every node carries what it
 * needs to be placed (`parentId`), labelled unambiguously (`region` — names are only
 * unique among siblings) and drilled into (`hasChildren`).
 */
export type Tag = {
  id: string;
  name: string;
  facet: 'region' | 'muscle' | 'structure' | 'pathology';
  parentId: string | null;
  region: string;
  hasChildren: boolean;
};

/**
 * Authenticated read against the API. Distinguishes "not found" from "unreachable" the
 * same way `lib/onboarding` does: a 404 is a real answer the screen renders, anything
 * else throws so Next shows the error boundary and a reload retries — rather than a
 * missing thread and a cold API looking identical to the member.
 */
async function apiGet<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${API_ORIGIN}/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Askapeer is temporarily unreachable (${res.status}).`);
  return (await res.json()) as T;
}

export async function fetchPosts(
  token: string,
): Promise<{ posts: PostCard[]; nextCursor: string | null }> {
  return (await apiGet('/posts', token)) ?? { posts: [], nextCursor: null };
}

export async function fetchThread(postId: string, token: string): Promise<Thread | null> {
  return apiGet<Thread>(`/posts/${postId}`, token);
}

/** The composer's two pickers, fetched together — neither is useful without the other. */
export async function fetchVocabulary(
  token: string,
): Promise<{ categories: Category[]; tags: Tag[] }> {
  const [categories, tags] = await Promise.all([
    apiGet<Category[]>('/categories', token),
    apiGet<Tag[]>('/tags', token),
  ]);
  return { categories: categories ?? [], tags: tags ?? [] };
}
