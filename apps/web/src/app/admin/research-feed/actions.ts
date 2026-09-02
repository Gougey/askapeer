'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

export type ReclassifyState = { status: 'idle' | 'queued' | 'error'; message?: string };

/**
 * Re-tag the whole stored corpus against the current vocabulary.
 *
 * **This is the step that makes vocabulary work visible.** A synonym or a new tag changes
 * nothing a member can see until the corpus is matched against it again — the classifier runs
 * at ingest, so everything already stored keeps the tags it was given under the old
 * vocabulary. Before this button existed the only way to run it was to mint an admin token by
 * hand, which meant the taxonomy could be improved and the feed silently left behind.
 *
 * The API queues the work rather than doing it inline: it takes over two minutes, which is
 * longer than Fly's proxy holds a connection open, so awaiting it here reported a failure for
 * a job that had actually succeeded. What comes back is an acknowledgement, and the page's own
 * counts are what show the progress.
 */
export async function reclassifyAction(): Promise<ReclassifyState> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  let res: Response;
  try {
    res = await fetch(`${API_ORIGIN}/v1/admin/research-feed/reclassify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return { status: 'error', message: 'Could not reach the API. Nothing was started.' };
  }

  if (!res.ok) {
    return { status: 'error', message: `Could not queue the re-tag (${res.status}).` };
  }

  revalidatePath('/admin/research-feed');
  return {
    status: 'queued',
    message:
      'Re-tagging the corpus. It takes a couple of minutes — refresh to watch the counts move.',
  };
}
