'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

export type AddTagState = { status: 'idle' | 'added' | 'error'; message?: string; name?: string };

/**
 * Add a tag to the vocabulary (EPIC-J, screen G8).
 *
 * Lives at the list level rather than under a single tag, because adding is not an
 * operation *on* a tag — the parent is just one of its fields, and a new root region (which
 * is what Pelvis is) has no parent at all.
 *
 * The API's own message is returned rather than a status code: it explains the refusals an
 * administrator can act on ("a region with that name already exists"), and throwing would
 * replace that with an error boundary.
 */
export async function addTagAction(
  _prev: AddTagState,
  formData: FormData,
): Promise<AddTagState> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { status: 'error', message: 'A tag needs a name.' };

  const parentId = String(formData.get('parentId') ?? '').trim();
  const synonyms = String(formData.get('synonyms') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  const res = await fetch(`${API_ORIGIN}/v1/admin/taxonomy/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name,
      // Blank means a new root region, not "no parent chosen" — the form says so.
      parentId: parentId === '' ? null : parentId,
      facet: String(formData.get('facet') ?? 'pathology'),
      synonyms,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    return { status: 'error', message: body?.message ?? `Could not add the tag (${res.status}).` };
  }

  revalidatePath('/admin/config/tags');
  return { status: 'added', name };
}
