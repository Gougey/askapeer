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
  if (!res.ok) throw new Error(`Request failed (${res.status}).`);
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
