import { API_ORIGIN } from './api';
import type { CategoryRef } from './forum';

/** Mirrors the EPIC-E DTOs. */
export type AgeBand = 'child' | 'youth' | 'adult';

export type ChecklistItem = { key: string; label: string };

/**
 * The de-identification policy, fetched from the API rather than duplicated here.
 *
 * There is exactly one copy of the checklist and the attestation wording, and it lives on
 * the server that gates on them. A second copy in the web app would eventually disagree
 * with the first, and the disagreement would surface as a publish button that never
 * enables — or worse, a member attesting to wording nobody recorded.
 */
export type CasePolicy = {
  checklist: ChecklistItem[];
  attestationText: string;
  disclaimer: string;
  ageBands: Record<AgeBand, string>;
};

export type CaseDetail = {
  ageBand: AgeBand;
  onsetDays: number;
  presentingCondition: string;
  historyPresentingCondition: string;
  objectiveFindings: string;
  communityQuestion: string;
  checklist: { key: string; label: string; confirmed: boolean }[];
  checklistComplete: boolean;
  attestedAt: string | null;
};

export type DraftCard = {
  id: string;
  title: string;
  status: 'draft' | 'needs_correction';
  category: CategoryRef;
  ageBand: AgeBand;
  onsetDays: number;
  checklistRemaining: number;
  checklistTotal: number;
  createdAt: string;
  editedAt: string | null;
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

export async function fetchCasePolicy(token: string): Promise<CasePolicy> {
  const policy = await apiGet<CasePolicy>('/case-discussions/policy', token);
  // The policy is static config, not member data — a 404 here means the API is wrong
  // about itself, and rendering a composer with no checklist would be worse than failing.
  if (!policy) throw new Error('The case-discussion policy is unavailable.');
  return policy;
}

export async function fetchDrafts(token: string): Promise<DraftCard[]> {
  const res = await apiGet<{ drafts: DraftCard[] }>('/me/drafts', token);
  return res?.drafts ?? [];
}

/** How long ago onset was, in the units a clinician would say it in. */
export function formatOnset(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return '1 day';
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  if (days < 730) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} years`;
}
