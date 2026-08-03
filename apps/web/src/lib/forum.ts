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

export type Category = {
  id: string;
  name: string;
  description: string | null;
  /** The post type this category is for, or null for either. The question composer hides
   *  the case-discussion one; a case's category is resolved server-side, never picked. */
  postType: 'question' | 'case_discussion' | null;
};

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
  cursor?: string,
): Promise<{ posts: PostCard[]; nextCursor: string | null }> {
  // The API has returned a keyset `nextCursor` since S4; until now no caller passed one
  // back, so every list stopped at 20 rows and the rest of the corpus was unreachable.
  const path = cursor ? `/posts?cursor=${encodeURIComponent(cursor)}` : '/posts';
  return (await apiGet(path, token)) ?? { posts: [], nextCursor: null };
}

export async function fetchThread(postId: string, token: string): Promise<Thread | null> {
  return apiGet<Thread>(`/posts/${postId}`, token);
}

export type SearchResults = {
  posts: PostCard[];
  nextCursor: string | null;
  /** The tsquery matched nothing and these came from trigram similarity — the screen says
   *  so rather than presenting a fuzzy match as an exact one. */
  didYouMean: boolean;
};

/**
 * Full-text search (EPIC-C §4, screen C3).
 *
 * Every parameter is passed straight through from the URL, which is deliberate: the search
 * form is a GET form, so the URL *is* the query, and this is the one place that has to
 * agree with it.
 */
export async function fetchSearch(
  token: string,
  params: { q?: string; category?: string; tags?: string[]; cursor?: string },
): Promise<SearchResults> {
  const search = new URLSearchParams();
  // Omitted rather than sent empty: a category or tag search carries no query, and
  // `?q=` on the wire only invites something downstream to treat "" as a term.
  if (params.q) search.set('q', params.q);
  if (params.category) search.set('category', params.category);
  for (const tag of params.tags ?? []) search.append('tag', tag);
  if (params.cursor) search.set('cursor', params.cursor);
  const res = await apiGet<SearchResults>(`/search?${search.toString()}`, token);
  return res ?? { posts: [], nextCursor: null, didYouMean: false };
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
