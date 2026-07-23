import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import {
  handles,
  identityCheckSessions,
  members,
  reapplicationAttempts,
  verificationDecisions,
  verificationEvidence,
} from '../db/schema';

/** How far a member is through the EPIC-A pipeline, computed from status + evidence. */
export type Stage =
  | 'processing' // pending, automated checks still running
  | 'awaiting_id_capture' // pending, waiting on the applicant's ID check
  | 'awaiting_manual_review' // pending, an automated check routed to a human
  | 'needs_more_info'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'expelled';

// Admin views deliberately expose identity (real name, email, registration) — that is
// the verification admin's legitimate remit (EPIC-A). They deliberately do NOT expose the
// member's community handle name: linking an identity to a pseudonym is the audited
// reveal-identity action (EPIC-F / S11), never a casual read. `hasHandle` is a boolean
// only — onboarding progress, not the link.
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

const DEFAULT_LIMIT = 100;

@Injectable()
export class AdminService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Everyone, newest first, optionally filtered by verification status. */
  async listMembers(status?: string, limit = DEFAULT_LIMIT): Promise<MemberSummary[]> {
    const rows = await this.db
      .select(memberColumns)
      .from(members)
      .where(status ? eq(members.verificationStatus, status as never) : undefined)
      .orderBy(desc(members.createdAt))
      .limit(limit);
    if (rows.length === 0) return [];

    // Stage needs each member's evidence + open sessions; fetch both in bulk for the page.
    const ids = rows.map((r) => r.id);
    const [stages, handled] = await Promise.all([this.stagesFor(ids), this.handlesFor(ids)]);
    return rows.map((r) =>
      toSummary(r, stages.get(r.id) ?? deriveStageFromStatus(r.verificationStatus), handled.has(r.id)),
    );
  }

  /** One member's full verification journey — the "follow it through" view. */
  async getMember(id: string): Promise<MemberDetail> {
    const [row] = await this.db.select(memberColumns).from(members).where(eq(members.id, id));
    if (!row) throw new NotFoundException('No such member.');

    const [evidence, decisions, checks, reapplications] = await Promise.all([
      this.db
        .select()
        .from(verificationEvidence)
        .where(eq(verificationEvidence.memberId, id))
        .orderBy(desc(verificationEvidence.createdAt)),
      this.db
        .select()
        .from(verificationDecisions)
        .where(eq(verificationDecisions.memberId, id))
        .orderBy(desc(verificationDecisions.createdAt)),
      this.db
        .select()
        .from(identityCheckSessions)
        .where(eq(identityCheckSessions.memberId, id))
        .orderBy(desc(identityCheckSessions.createdAt)),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(reapplicationAttempts)
        .where(eq(reapplicationAttempts.matchedMemberId, id)),
    ]);

    const stage = computeStage(row.verificationStatus, evidence, checks);
    const handled = await this.handlesFor([id]);
    return {
      ...toSummary(row, stage, handled.has(id)),
      needsMoreInfoReason: row.needsMoreInfoReason,
      evidence: evidence.map((e) => ({
        id: e.id,
        evidenceType: e.evidenceType,
        source: e.source,
        outcome: e.outcome,
        reason: reasonOf(e.rawResult),
        rawResult: e.rawResult,
        createdAt: e.createdAt.toISOString(),
      })),
      decisions: decisions.map(toDecision),
      identityChecks: checks.map((c) => ({
        id: c.id,
        provider: c.provider,
        state: c.state,
        expiresAt: c.expiresAt.toISOString(),
        completedAt: c.completedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
      reapplicationAttempts: reapplications[0]?.count ?? 0,
    };
  }

  /**
   * Members currently in-flight (pending or needs_more_info), stage-annotated so it's
   * clear who is waiting on the applicant, who is waiting on a human reviewer, and who is
   * just mid-automated-run. The write actions that clear this queue are the next slice.
   */
  async reviewQueue(): Promise<MemberSummary[]> {
    const rows = await this.db
      .select(memberColumns)
      .from(members)
      .where(inArray(members.verificationStatus, ['pending', 'needs_more_info']))
      .orderBy(desc(members.statusUpdatedAt))
      .limit(DEFAULT_LIMIT);
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [stages, handled] = await Promise.all([this.stagesFor(ids), this.handlesFor(ids)]);
    return rows.map((r) =>
      toSummary(r, stages.get(r.id) ?? deriveStageFromStatus(r.verificationStatus), handled.has(r.id)),
    );
  }

  /** Which of these members have claimed a handle — a boolean signal, not the name. */
  private async handlesFor(memberIds: string[]): Promise<Set<string>> {
    if (memberIds.length === 0) return new Set();
    const rows = await this.db
      .select({ memberId: handles.memberId })
      .from(handles)
      .where(inArray(handles.memberId, memberIds));
    return new Set(rows.map((r) => r.memberId));
  }

  /** The immutable status-transition trail (EPIC-A §3), newest first, with member context. */
  async auditLog(limit = DEFAULT_LIMIT): Promise<AuditEntry[]> {
    const rows = await this.db
      .select({
        id: verificationDecisions.id,
        fromStatus: verificationDecisions.fromStatus,
        toStatus: verificationDecisions.toStatus,
        decidedBy: verificationDecisions.decidedBy,
        reason: verificationDecisions.reason,
        createdAt: verificationDecisions.createdAt,
        memberId: members.id,
        legalName: members.legalName,
        email: members.email,
      })
      .from(verificationDecisions)
      .innerJoin(members, eq(verificationDecisions.memberId, members.id))
      .orderBy(desc(verificationDecisions.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
      decidedBy: r.decidedBy,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
      member: { id: r.memberId, legalName: r.legalName, email: r.email },
    }));
  }

  /** Compute the pipeline stage for a set of members in two batched reads (no N+1). */
  private async stagesFor(memberIds: string[]): Promise<Map<string, Stage>> {
    const result = new Map<string, Stage>();
    const [evidence, checks, statuses] = await Promise.all([
      this.db
        .select({
          memberId: verificationEvidence.memberId,
          outcome: verificationEvidence.outcome,
        })
        .from(verificationEvidence)
        .where(inArray(verificationEvidence.memberId, memberIds)),
      this.db
        .select({
          memberId: identityCheckSessions.memberId,
          state: identityCheckSessions.state,
          expiresAt: identityCheckSessions.expiresAt,
        })
        .from(identityCheckSessions)
        .where(inArray(identityCheckSessions.memberId, memberIds)),
      this.db
        .select({ id: members.id, verificationStatus: members.verificationStatus })
        .from(members)
        .where(inArray(members.id, memberIds)),
    ]);

    const evByMember = groupBy(evidence, (e) => e.memberId);
    const chByMember = groupBy(checks, (c) => c.memberId);
    for (const m of statuses) {
      result.set(
        m.id,
        computeStage(m.verificationStatus, evByMember.get(m.id) ?? [], chByMember.get(m.id) ?? []),
      );
    }
    return result;
  }
}

const memberColumns = {
  id: members.id,
  legalName: members.legalName,
  email: members.email,
  professionalBody: members.professionalBody,
  registrationNumber: members.registrationNumber,
  registrationCountry: members.registrationCountry,
  verificationStatus: members.verificationStatus,
  needsMoreInfoReason: members.needsMoreInfoReason,
  anonymityAcknowledgedAt: members.anonymityAcknowledgedAt,
  createdAt: members.createdAt,
  statusUpdatedAt: members.statusUpdatedAt,
} as const;

type MemberRow = {
  id: string;
  legalName: string;
  email: string;
  professionalBody: string;
  registrationNumber: string;
  registrationCountry: string;
  verificationStatus: string;
  needsMoreInfoReason: string | null;
  anonymityAcknowledgedAt: Date | null;
  createdAt: Date;
  statusUpdatedAt: Date;
};

// hasHandle is a boolean only — never the handle name (pseudonymity, see the note above).
function toSummary(row: MemberRow, stage: Stage, hasHandle: boolean): MemberSummary {
  return {
    id: row.id,
    legalName: row.legalName,
    email: row.email,
    professionalBody: row.professionalBody,
    registrationNumber: row.registrationNumber,
    registrationCountry: row.registrationCountry,
    verificationStatus: row.verificationStatus,
    stage,
    hasHandle,
    anonymityAcknowledged: row.anonymityAcknowledgedAt !== null,
    createdAt: row.createdAt.toISOString(),
    statusUpdatedAt: row.statusUpdatedAt.toISOString(),
  };
}

function toDecision(d: {
  id: string;
  fromStatus: string;
  toStatus: string;
  decidedBy: string;
  reason: string | null;
  createdAt: Date;
}): DecisionEntry {
  return {
    id: d.id,
    fromStatus: d.fromStatus,
    toStatus: d.toStatus,
    decidedBy: d.decidedBy,
    reason: d.reason,
    createdAt: d.createdAt.toISOString(),
  };
}

function computeStage(
  status: string,
  evidence: { outcome: string }[],
  checks: { state: string; expiresAt: Date }[],
): Stage {
  if (status !== 'pending') return deriveStageFromStatus(status);
  const now = Date.now();
  if (checks.some((c) => c.state === 'awaiting_capture' && c.expiresAt.getTime() > now)) {
    return 'awaiting_id_capture';
  }
  if (evidence.some((e) => e.outcome === 'fail' || e.outcome === 'needs_review')) {
    return 'awaiting_manual_review';
  }
  return 'processing';
}

function deriveStageFromStatus(status: string): Stage {
  switch (status) {
    case 'approved_verified':
      return 'approved';
    case 'needs_more_info':
      return 'needs_more_info';
    case 'rejected':
      return 'rejected';
    case 'suspended':
      return 'suspended';
    case 'expelled':
      return 'expelled';
    default:
      return 'processing';
  }
}

/** The simulated providers stash a human-readable `reason` in the raw result. */
function reasonOf(raw: unknown): string | null {
  if (raw && typeof raw === 'object' && 'reason' in raw) {
    const reason = (raw as { reason: unknown }).reason;
    return typeof reason === 'string' ? reason : null;
  }
  return null;
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    map.set(k, [...(map.get(k) ?? []), item]);
  }
  return map;
}
