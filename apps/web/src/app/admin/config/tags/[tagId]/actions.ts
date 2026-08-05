'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

export type PreviewResult = {
  current: { articles: number };
  proposed: { articles: number; samples: string[] };
};

async function adminPost<T>(path: string, body: unknown, method = 'POST'): Promise<T> {
  const token = await getAccessToken();
  if (!token) redirect('/');
  const res = await fetch(`${API_ORIGIN}/v1/admin/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    // The API's message is the useful part ("that would put the tag underneath itself"),
    // and a bare status code would throw it away.
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Request failed (${res.status}).`);
  }
  return (await res.json()) as T;
}

/**
 * Dry run — the whole reason this screen is worth building rather than editing the database.
 *
 * Writes nothing. Runs the real classifier over the stored corpus with the proposed
 * synonyms, so an administrator sees "17 → 216 articles" *and the titles that would newly
 * match* before committing. The count says how much would change; the titles say whether it
 * would change the right way, which is the only way to catch a synonym that over-matches.
 */
export async function previewSynonymsAction(
  tagId: string,
  synonyms: string[],
): Promise<PreviewResult> {
  return adminPost<PreviewResult>(`taxonomy/tags/${tagId}/preview`, { synonyms });
}

/** Save. Audited server-side — a synonym changes what every member can find. */
export async function saveSynonymsAction(tagId: string, synonyms: string[]): Promise<void> {
  await adminPost(`taxonomy/tags/${tagId}/synonyms`, { synonyms }, 'PUT');
  revalidatePath(`/admin/config/tags/${tagId}`);
  revalidatePath('/admin/config/tags');
}

/**
 * Re-tag the stored corpus so the change takes effect.
 *
 * Separate from saving, deliberately. Saving a synonym is instant and reversible; applying
 * it rewrites every article's tags and takes seconds. Keeping them apart lets an
 * administrator make several edits and apply once, and means "I saved something wrong"
 * never silently rewrote the corpus on the way past.
 */
export async function reclassifyAction(): Promise<{ articles: number; matches: number }> {
  return adminPost<{ articles: number; matches: number }>('research-feed/reclassify', {});
}

/** Rename and/or move. The API refuses a move that would put a tag beneath itself. */
export async function updateTagAction(
  tagId: string,
  changes: { name?: string; parentId?: string | null },
): Promise<{ ok: true } | { ok: false; message: string }> {
  return guard(() => adminPost(`taxonomy/tags/${tagId}`, changes, 'PATCH'), tagId);
}

/** Retire or restore. Never deletes — existing posts keep their tags. */
export async function retireTagAction(tagId: string, retired: boolean) {
  return guard(() => adminPost(`taxonomy/tags/${tagId}/retire`, { retired }), tagId);
}

/** Fold this tag into another, repointing posts, articles and member interests. */
export async function mergeTagAction(tagId: string, intoTagId: string) {
  return guard(() => adminPost(`taxonomy/tags/${tagId}/merge`, { intoTagId }), tagId);
}

/**
 * Structural edits fail for *good* reasons an administrator needs to read — a name already
 * used under that parent, a move that would loop the tree, a merge that would strand
 * children. Throwing would show the error boundary and lose the message, so the API's own
 * words are returned instead.
 */
async function guard(
  run: () => Promise<unknown>,
  tagId: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await run();
    if (tagId) revalidatePath(`/admin/config/tags/${tagId}`);
    revalidatePath('/admin/config/tags');
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
