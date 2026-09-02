'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

export type ReclassifyState = { status: 'idle' | 'done' | 'error'; message?: string };

/**
 * Re-tag the whole stored corpus against the current vocabulary.
 *
 * **This is the step that makes vocabulary work visible.** A synonym or a new tag changes
 * nothing a member can see until the corpus is matched against it again — the classifier runs
 * at ingest, so everything already stored keeps the tags it was given under the old
 * vocabulary. Before this button existed the only way to run it was to mint an admin token by
 * hand, which meant the taxonomy could be improved and the feed silently left behind.
 *
 * It takes over a minute on the current corpus and rebuilds `article_tags` from scratch, so
 * the feed shows fewer matches while it runs. That is why it asks first.
 */
export async function reclassifyAction(): Promise<ReclassifyState> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const res = await fetch(`${API_ORIGIN}/v1/admin/research-feed/reclassify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return { status: 'error', message: `Reclassify failed (${res.status}). Nothing was changed.` };
  }

  const { articles, matches } = (await res.json()) as { articles: number; matches: number };
  revalidatePath('/admin/research-feed');
  return {
    status: 'done',
    message: `Re-tagged ${articles.toLocaleString()} articles — ${matches.toLocaleString()} matches.`,
  };
}
