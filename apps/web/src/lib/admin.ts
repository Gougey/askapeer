import { redirect } from 'next/navigation';
import { API_ORIGIN } from './api';
import { fetchSessionState } from './onboarding';
import { getAccessToken } from './session';

export type Stage =
  | 'processing'
  | 'awaiting_id_capture'
  | 'awaiting_manual_review'
  | 'needs_more_info'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'expelled';

export type MemberSummary = {
  id: string;
  legalName: string;
  email: string;
  professionalBody: string;
  registrationNumber: string;
  registrationCountry: string;
  verificationStatus: string;
  stage: Stage;
  hasHandle: boolean;
  anonymityAcknowledged: boolean;
  createdAt: string;
  statusUpdatedAt: string;
};

export type EvidenceEntry = {
  id: string;
  evidenceType: string;
  source: string;
  outcome: string;
  reason: string | null;
  rawResult: unknown;
  createdAt: string;
};

export type DecisionEntry = {
  id: string;
  fromStatus: string;
  toStatus: string;
  decidedBy: string;
  reason: string | null;
  createdAt: string;
};

export type IdentityCheckEntry = {
  id: string;
  provider: string;
  state: string;
  expiresAt: string;
  completedAt: string | null;
  createdAt: string;
};

export type MemberDetail = MemberSummary & {
  needsMoreInfoReason: string | null;
  evidence: EvidenceEntry[];
  decisions: DecisionEntry[];
  identityChecks: IdentityCheckEntry[];
  reapplicationAttempts: number;
};

export type AuditEntry = DecisionEntry & {
  member: { id: string; legalName: string; email: string };
};

/**
 * Gate for the admin console. Confirms the caller is an allowlisted admin from the
 * session read the shell already makes, and bounces everyone else to the app — a
 * non-admin should never learn the console exists.
 */
export async function requireAdmin(): Promise<string> {
  const token = await getAccessToken();
  if (!token) redirect('/');
  const result = await fetchSessionState(token);
  if (result.kind === 'unauthenticated') redirect('/');
  if (result.kind === 'unavailable') throw new Error('Askapeer is temporarily unreachable.');
  if (!result.state.isAdmin) redirect('/feed');
  return token;
}

async function adminGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_ORIGIN}/v1/admin/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 404) throw new Error('not-found');
  if (!res.ok) throw new Error(`Admin read failed (${res.status}).`);
  return (await res.json()) as T;
}

export const fetchMembers = (token: string, status?: string) =>
  adminGet<MemberSummary[]>(`members${status ? `?status=${encodeURIComponent(status)}` : ''}`, token);

export const fetchMember = (token: string, id: string) =>
  adminGet<MemberDetail>(`members/${id}`, token);

export const fetchReviewQueue = (token: string) =>
  adminGet<MemberSummary[]>('review-queue', token);

export const fetchAuditLog = (token: string) =>
  adminGet<AuditEntry[]>('audit/verification', token);
