import { API_ORIGIN } from './api';
import type { PostCard } from './forum';

/**
 * Mirrors the EPIC-G §8 DTOs. `payload` is type-specific (§9), so it is discriminated on
 * `type` here rather than left as an untyped bag — the rendering has to switch on it
 * anyway, and this is where a new notification type announces itself to the client.
 */
export type ReplyPayload = {
  postId: string;
  postTitle: string;
  commentId: string;
  actorHandleName: string;
  snippet: string;
};

/** No actor: nothing in the product reveals who awarded kudos, and the inbox is not
 *  where that would start. */
export type KudosReceivedPayload = { targetType: 'post' | 'comment'; postId: string; postTitle: string };

export type Notification =
  | { id: string; type: 'reply'; payload: ReplyPayload; readAt: string | null; createdAt: string }
  | {
      id: string;
      type: 'kudos_received';
      payload: KudosReceivedPayload;
      readAt: string | null;
      createdAt: string;
    }
  | {
      id: string;
      type: 'verification_status_change';
      payload: Record<string, unknown>;
      readAt: string | null;
      createdAt: string;
    };

export type NotificationList = {
  notifications: Notification[];
  nextCursor: string | null;
  unreadCount: number;
};

export type MyCommentCard = {
  id: string;
  snippet: string;
  kudosCount: number;
  createdAt: string;
  editedAt: string | null;
  post: { id: string; title: string; type: 'question' | 'case_discussion' };
};

async function apiGet<T>(path: string, token: string): Promise<T | null> {
  const res = await fetch(`${API_ORIGIN}/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Askapeer is temporarily unreachable (${res.status}).`);
  return (await res.json()) as T;
}

export async function fetchNotifications(token: string): Promise<NotificationList> {
  return (
    (await apiGet<NotificationList>('/notifications', token)) ?? {
      notifications: [],
      nextCursor: null,
      unreadCount: 0,
    }
  );
}

/**
 * The tab badge. Its own endpoint, and deliberately failure-tolerant: this runs on every
 * app-shell render, and a badge is not worth taking the whole shell down for — an
 * unreachable API here means "no badge", not an error boundary over the entire app.
 */
export async function fetchUnreadCount(token: string): Promise<number> {
  try {
    const res = await apiGet<{ unreadCount: number }>('/notifications/unread-count', token);
    return res?.unreadCount ?? 0;
  } catch {
    return 0;
  }
}

/** My questions and my answers — the two halves of E2, fetched together. */
export async function fetchMyContributions(
  token: string,
): Promise<{ posts: PostCard[]; comments: MyCommentCard[] }> {
  const [posts, comments] = await Promise.all([
    apiGet<{ posts: PostCard[] }>('/me/posts', token),
    apiGet<{ comments: MyCommentCard[] }>('/me/comments', token),
  ]);
  return { posts: posts?.posts ?? [], comments: comments?.comments ?? [] };
}
