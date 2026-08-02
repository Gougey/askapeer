'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import { getAccessToken } from '@/lib/session';

export type CaseComposeState = {
  status: 'idle' | 'error';
  reason?: 'missing_fields' | 'checklist' | 'attestation' | 'rejected' | 'unavailable';
  /** Set when the draft was saved but publishing failed — the composer says where it went. */
  draftId?: string;
};

type CaseFields = {
  /* No category: the API resolves it from the vocabulary (`categories.post_type`). */
  ageBand: string;
  onsetDays: number;
  presentingCondition: string;
  historyPresentingCondition: string;
  objectiveFindings: string;
  communityQuestion: string;
  tagIds: string[];
};

function readFields(formData: FormData): CaseFields | null {
  const onsetRaw = String(formData.get('onsetDays') ?? '').trim();
  const onsetDays = Number(onsetRaw);
  const fields = {
    ageBand: String(formData.get('ageBand') ?? ''),
    onsetDays,
    presentingCondition: String(formData.get('presentingCondition') ?? '').trim(),
    historyPresentingCondition: String(formData.get('historyPresentingCondition') ?? '').trim(),
    objectiveFindings: String(formData.get('objectiveFindings') ?? '').trim(),
    communityQuestion: String(formData.get('communityQuestion') ?? '').trim(),
    tagIds: formData.getAll('tagIds').map(String),
  };

  // Re-checked here as well as in the browser: a disabled button is a convenience, and a
  // form can always be submitted without one.
  const complete =
    fields.ageBand &&
    onsetRaw !== '' &&
    Number.isInteger(onsetDays) &&
    onsetDays >= 0 &&
    fields.presentingCondition &&
    fields.historyPresentingCondition &&
    fields.objectiveFindings &&
    fields.communityQuestion;

  return complete ? fields : null;
}

async function call(
  path: string,
  token: string,
  method: string,
  body: unknown,
): Promise<Response | null> {
  try {
    return await fetch(`${API_ORIGIN}/v1${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return null;
  }
}

/**
 * The composer's one action, branching on which button was pressed.
 *
 * A single `useActionState` rather than one per button: both routes share the same form,
 * the same pending state and the same error slot, and two hooks over one form would leave
 * an error from "save" rendering underneath a "publish" that had since succeeded. Submit
 * buttons contribute their own `name`/`value` to the FormData, so the intent arrives with
 * the rest of the fields.
 */
export async function submitCaseAction(
  prev: CaseComposeState,
  formData: FormData,
): Promise<CaseComposeState> {
  return formData.get('intent') === 'draft'
    ? saveCaseDraftAction(prev, formData)
    : publishCaseAction(prev, formData);
}

/**
 * Save without publishing (EPIC-E §3 steps 1–2).
 *
 * A case discussion is long enough to be worth abandoning halfway, and the alternative to
 * an explicit save is a member losing a written-up case to a closed tab — which teaches
 * them to write cases somewhere else and paste them in, exactly the habit the platform
 * does not want. Saving is deliberately *not* gated on the checklist: nothing is visible
 * to anyone until attestation, so there is nothing to protect against yet.
 */
export async function saveCaseDraftAction(
  _prev: CaseComposeState,
  formData: FormData,
): Promise<CaseComposeState> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const fields = readFields(formData);
  if (!fields) return { status: 'error', reason: 'missing_fields' };

  const existingId = String(formData.get('postId') ?? '');
  const res = existingId
    ? await call(`/case-discussions/${existingId}`, token, 'PATCH', fields)
    : await call('/case-discussions', token, 'POST', fields);

  if (!res) return { status: 'error', reason: 'unavailable' };
  if (!res.ok) return { status: 'error', reason: res.status === 400 ? 'rejected' : 'unavailable' };

  revalidatePath('/activity/drafts');
  redirect('/activity/drafts');
}

/**
 * Publish: save, record the checklist, attest (EPIC-E §3 steps 1–4).
 *
 * Three API calls rather than one, because they are three distinct records — the case, the
 * checklist state, and the immutable attestation bound to the member's legal identity. The
 * server re-checks the whole gate at the last of them, so this sequence cannot talk its way
 * past anything the API would refuse; if the checklist call were dropped, attesting would
 * simply fail.
 *
 * If the draft saves but attestation fails, the draft is kept and its id returned. Throwing
 * the member's written-up case away because the last step failed would be the worst
 * possible response to a transient error.
 */
export async function publishCaseAction(
  _prev: CaseComposeState,
  formData: FormData,
): Promise<CaseComposeState> {
  const token = await getAccessToken();
  if (!token) redirect('/');

  const fields = readFields(formData);
  if (!fields) return { status: 'error', reason: 'missing_fields' };

  const checklistKeys = formData.getAll('checklistKeys').map(String);
  const confirmed = formData.getAll('checklist').map(String);
  const attestationText = String(formData.get('attestationText') ?? '');
  const attested = formData.get('attested') === 'on';

  if (checklistKeys.some((key) => !confirmed.includes(key))) {
    return { status: 'error', reason: 'checklist' };
  }
  if (!attested) return { status: 'error', reason: 'attestation' };

  const existingId = String(formData.get('postId') ?? '');
  const saveRes = existingId
    ? await call(`/case-discussions/${existingId}`, token, 'PATCH', fields)
    : await call('/case-discussions', token, 'POST', fields);

  if (!saveRes) return { status: 'error', reason: 'unavailable' };
  if (!saveRes.ok) {
    return { status: 'error', reason: saveRes.status === 400 ? 'rejected' : 'unavailable' };
  }
  const { post } = (await saveRes.json()) as { post: { id: string } };

  const items = Object.fromEntries(checklistKeys.map((key) => [key, confirmed.includes(key)]));
  const checklistRes = await call(`/case-discussions/${post.id}/checklist`, token, 'PUT', { items });
  if (!checklistRes?.ok) return { status: 'error', reason: 'unavailable', draftId: post.id };

  const attestRes = await call(`/case-discussions/${post.id}/attest`, token, 'POST', {
    attestationText,
    confirmed: true,
  });
  if (!attestRes) return { status: 'error', reason: 'unavailable', draftId: post.id };
  if (!attestRes.ok) {
    // A 400 here is the server's own gate refusing — stale attestation wording, or a
    // checklist that didn't take. Either way the case is safe as a draft.
    return { status: 'error', reason: 'rejected', draftId: post.id };
  }

  // Same landing as a published question: the list, newest-first, with the case at the top
  // (see createPostAction's note on why not the thread).
  revalidatePath('/discussions');
  revalidatePath('/activity/drafts');
  redirect('/discussions');
}
