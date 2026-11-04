/**
 * Reading the Discussions search off a URL.
 *
 * The same rule, and the same reason, as `lib/feed-filters.ts`: the API validates its query
 * parameters strictly and answers a bad one with a 400, which `apiGet` throws and Next renders
 * as an error page, so a value it would refuse must never leave this function. A plain module
 * with no imports, so `npm run verify:discussion-filters -w apps/web` can import it directly.
 *
 * ⚠️ **`asked` looks at what survived, not what was present**, the reverse of My Research.
 * My Research is blank until asked, so a URL of rubbish has to count as a question. This page
 * has the whole list to fall back on, and sending the API an empty search would return nothing
 * at all where the list should be.
 */

export const DISCUSSION_TYPES = ['question', 'case_discussion'] as const;
export const DISCUSSION_SORTS = ['relevance', 'newest'] as const;

/** The API caps `?tag=` at three. */
export const MAX_TAG_FILTERS = 3;

const MAX_QUERY_LENGTH = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The shape Next hands a page. */
export type RawDiscussionParams = {
  cursor?: string;
  q?: string;
  tag?: string | string[];
  type?: string;
  sort?: string;
};

export type DiscussionFilters = {
  q?: string;
  tags: string[];
  type?: (typeof DISCUSSION_TYPES)[number];
  sort?: (typeof DISCUSSION_SORTS)[number];
};

export type ParsedDiscussionFilters = DiscussionFilters & {
  /** Whether there is anything to search for; otherwise the page shows the plain list. */
  asked: boolean;
};

export function parseDiscussionFilters(params: RawDiscussionParams): ParsedDiscussionFilters {
  const q = params.q?.trim().slice(0, MAX_QUERY_LENGTH) || undefined;
  // Next gives one repeated parameter as a string and several as an array.
  const rawTags = params.tag === undefined ? [] : Array.isArray(params.tag) ? params.tag : [params.tag];
  const tags = [...new Set(rawTags.filter((id) => UUID.test(id)))].slice(0, MAX_TAG_FILTERS);
  const type = DISCUSSION_TYPES.find((value) => value === params.type);
  // Only a keyword gives a sort anything to do: with no words the order is newest regardless.
  const sort = q ? DISCUSSION_SORTS.find((value) => value === params.sort) : undefined;
  return { q, tags, type, sort, asked: Boolean(q || tags.length > 0 || type) };
}

/** The criteria as a query string, for the pager and for keying the scroll history. */
export function discussionFilterParams(filters: DiscussionFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  for (const tag of filters.tags) params.append('tag', tag);
  if (filters.type) params.set('type', filters.type);
  if (filters.sort) params.set('sort', filters.sort);
  return params;
}
