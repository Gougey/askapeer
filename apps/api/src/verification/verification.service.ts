import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type { Queue } from 'bullmq';
import { DRIZZLE, type Database } from '../db/db.module';
import {
  appMeta,
  identityCheckSessions,
  members,
  verificationDecisions,
  verificationEvidence,
} from '../db/schema';
import { VERIFICATION_QUEUE } from './verification.queue';
import {
  IDENTITY_CHECK,
  type IdentityCheckOutcome,
  type IdentityCheckProvider,
} from './providers/identity-check';
import { REGISTER_LOOKUP, type RegisterLookupProvider } from './providers/register-lookup';
import { StatusChangeNotifier } from './status-change.notifier';

/** EPIC-J config key; 48h default (§8 — guards an applicant who abandons the upload). */
const TIMEOUT_CONFIG_KEY = 'verification.onfido_timeout_hours';
const DEFAULT_TIMEOUT_HOURS = 48;

type Member = typeof members.$inferSelect;
type VerificationStatus = typeof members.$inferInsert.verificationStatus & string;
/** The transaction handle Drizzle hands a `db.transaction` callback — shared so another module can pass its own tx in. */
export type DbTx = Parameters<Parameters<Database['transaction']>[0]>[0];

@Injectable()
export class VerificationService {
  private readonly log = new Logger(VerificationService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    @Inject(VERIFICATION_QUEUE) private readonly queue: Queue,
    @Inject(REGISTER_LOOKUP) private readonly registerLookup: RegisterLookupProvider,
    @Inject(IDENTITY_CHECK) private readonly identityCheck: IdentityCheckProvider,
    private readonly notifier: StatusChangeNotifier,
  ) {}

  /** Called on registration (and on resubmit) to kick off the automated pipeline. */
  async enqueueVerification(memberId: string): Promise<void> {
    // No `:` in job ids — BullMQ reserves it as its key separator and rejects it.
    await this.queue.add('verify', { memberId }, { jobId: `verify-${memberId}-${Date.now()}` });
  }

  // ---------------------------------------------------------------------------
  // The worker's two steps (EPIC-A §5)
  // ---------------------------------------------------------------------------

  /**
   * Step A — register lookup. On a clean pass we proceed to step B; on anything else
   * we stop here and let the applicant land in the admin queue.
   *
   * A definitive register `fail` short-circuits before step B deliberately: §5 says the
   * decision runs "once both results are in, **or on evidence of definitive failure from
   * either**", and there is no point paying for (or asking the applicant to complete) an
   * identity check whose result cannot change the outcome.
   */
  async runChecks(memberId: string): Promise<void> {
    const member = await this.findMember(memberId);
    if (member.verificationStatus !== 'pending') {
      // Resubmitted, decided by an admin, or expelled between enqueue and pickup.
      this.log.log(`Skipping checks for ${memberId} — status is ${member.verificationStatus}.`);
      return;
    }

    const lookup = await this.registerLookup.lookup({
      professionalBody: member.professionalBody,
      registrationNumber: member.registrationNumber,
      registrationCountry: member.registrationCountry,
      legalName: member.legalName,
    });

    await this.db.insert(verificationEvidence).values({
      memberId,
      evidenceType: 'register_lookup',
      source: lookup.source,
      rawResult: lookup.raw,
      outcome: lookup.outcome,
    });

    if (lookup.outcome !== 'pass') {
      // Stays `pending` — the applicant is now in the admin queue (§6). Not an
      // auto-reject: §5's asymmetry means the automated path only ever says "yes".
      this.log.log(`Register lookup ${lookup.outcome} for ${memberId} — routing to admin review.`);
      return;
    }

    await this.startIdentityCheck(member);
  }

  /** Step B — open an identity-check session and stop, awaiting the provider callback. */
  private async startIdentityCheck(member: Member): Promise<void> {
    // Reuse an open session rather than opening a second one. The job can be retried
    // (BullMQ `attempts`) after this step has already succeeded, and with the real
    // provider every session is a billed check — so this guard is about correctness
    // and cost, not just tidiness.
    const open = await this.currentCapture(member.id);
    if (open) {
      this.log.log(`Identity check already awaiting capture for ${member.id} — reusing.`);
      return;
    }

    const session = await this.identityCheck.createSession({
      memberId: member.id,
      legalName: member.legalName,
    });

    const timeoutMs = (await this.timeoutHours()) * 60 * 60 * 1000;
    const [row] = await this.db
      .insert(identityCheckSessions)
      .values({
        memberId: member.id,
        provider: session.provider,
        providerRef: session.providerRef,
        expiresAt: new Date(Date.now() + timeoutMs),
      })
      .returning({ id: identityCheckSessions.id });

    // Delayed job, not a timer: it has to outlive this process (§8).
    await this.queue.add(
      'identity-check-timeout',
      { sessionId: row.id },
      { delay: timeoutMs, jobId: `timeout-${row.id}` },
    );
  }

  /**
   * The provider callback (real Onfido webhook, or the simulated one). Resolves the
   * §5 decision table: register passed already or we would not be here, so `clear`
   * auto-approves and everything else routes to the admin queue.
   */
  async completeIdentityCheck(providerRef: string, outcome: IdentityCheckOutcome): Promise<void> {
    const [session] = await this.db
      .select()
      .from(identityCheckSessions)
      .where(eq(identityCheckSessions.providerRef, providerRef));
    if (!session) throw new NotFoundException('Unknown identity check.');
    if (session.state !== 'awaiting_capture') {
      // Providers retry webhooks; completing twice must not re-decide (idempotent).
      this.log.log(`Ignoring duplicate callback for ${providerRef} (state ${session.state}).`);
      return;
    }

    await this.db
      .update(identityCheckSessions)
      .set({ state: 'complete', completedAt: new Date() })
      .where(eq(identityCheckSessions.id, session.id));

    await this.db.insert(verificationEvidence).values({
      memberId: session.memberId,
      evidenceType: 'onfido_check',
      source: session.provider,
      rawResult: { providerRef, outcome, simulated: session.provider === 'simulated' },
      outcome: outcome === 'clear' ? 'pass' : outcome === 'fail' ? 'fail' : 'needs_review',
    });

    if (outcome === 'clear') {
      await this.transition(session.memberId, 'approved_verified', 'system', 'Automated checks passed.');
      return;
    }
    // Stays `pending` → admin queue. Again, never an unattended reject.
    this.log.log(`Identity check ${outcome} for ${session.memberId} — routing to admin review.`);
  }

  /**
   * The identity-check callback never arrived (§8) — the applicant most likely
   * abandoned the capture. Surface them as `needs_more_info` rather than leaving them
   * silently stuck in `pending`.
   */
  async expireIdentityCheck(sessionId: string): Promise<void> {
    const [session] = await this.db
      .select()
      .from(identityCheckSessions)
      .where(eq(identityCheckSessions.id, sessionId));
    if (!session || session.state !== 'awaiting_capture') return; // completed in time

    await this.db
      .update(identityCheckSessions)
      .set({ state: 'timed_out' })
      .where(eq(identityCheckSessions.id, sessionId));

    const [member] = await this.db.select().from(members).where(eq(members.id, session.memberId));
    if (!member || member.verificationStatus !== 'pending') return;

    await this.transition(
      session.memberId,
      'needs_more_info',
      'system',
      'Identity check not completed.',
    );
  }

  // ---------------------------------------------------------------------------
  // Applicant-facing (EPIC-A §12.1, gaps G-1/G-2)
  // ---------------------------------------------------------------------------

  /**
   * `needs_more_info` → `pending`, re-entering the automated pipeline with a fresh
   * capture session. This is the one exit the state machine (§3) previously left the
   * applicant without.
   */
  async resubmit(memberId: string): Promise<{ verificationStatus: string }> {
    const member = await this.findMember(memberId);
    if (member.verificationStatus !== 'needs_more_info') {
      throw new BadRequestException('Nothing to resubmit.');
    }
    await this.transition(memberId, 'pending', 'system', 'Applicant resubmitted.');
    await this.enqueueVerification(memberId);
    return { verificationStatus: 'pending' };
  }

  /**
   * Powers the A4 capture screen and the holding page's "continue your identity check"
   * link — the current awaiting-capture session, if any.
   */
  async currentCapture(
    memberId: string,
  ): Promise<{ provider: string; captureToken: string; expiresAt: Date } | null> {
    const [session] = await this.db
      .select()
      .from(identityCheckSessions)
      .where(
        and(
          eq(identityCheckSessions.memberId, memberId),
          eq(identityCheckSessions.state, 'awaiting_capture'),
        ),
      )
      .orderBy(desc(identityCheckSessions.createdAt))
      .limit(1);
    if (!session) return null;
    return {
      provider: session.provider,
      captureToken: session.providerRef,
      expiresAt: session.expiresAt,
    };
  }

  // ---------------------------------------------------------------------------
  // Manual admin review (EPIC-A §6, gaps G-4/G-5/G-6)
  // ---------------------------------------------------------------------------

  /**
   * A human reviewer's decision on an in-flight application — the exit the automated
   * pipeline deliberately never takes (§5's asymmetry: the machine only ever says "yes",
   * so a reject is always a human's call). Runs through `transition`, so it writes the
   * same immutable `verification_decisions` row and fires the same status-change email —
   * the only difference from a system decision is `decided_by` carries the admin's id.
   *
   * Reviewable only from `pending`/`needs_more_info`; a member already approved, rejected,
   * suspended or expelled is out of the queue and must go through the action that owns
   * that state (EPIC-F for suspend/expel), not a re-review here.
   */
  async recordAdminDecision(
    memberId: string,
    action: 'approve' | 'reject' | 'request_more_info',
    adminMemberId: string,
    reason: string | null,
  ): Promise<{ verificationStatus: string }> {
    const member = await this.findMember(memberId);
    if (member.verificationStatus !== 'pending' && member.verificationStatus !== 'needs_more_info') {
      throw new ConflictException(
        `Only a pending or needs-more-info member can be reviewed (this one is ${member.verificationStatus}).`,
      );
    }

    const trimmed = reason?.trim() || null;
    if (action === 'request_more_info' && !trimmed) {
      throw new BadRequestException('A reason is required when requesting more information.');
    }

    const toStatus =
      action === 'approve'
        ? 'approved_verified'
        : action === 'reject'
          ? 'rejected'
          : 'needs_more_info';
    if (toStatus === member.verificationStatus) {
      // e.g. requesting more info from a member already in needs_more_info.
      throw new BadRequestException(`Member is already ${member.verificationStatus}.`);
    }

    await this.transition(memberId, toStatus, adminMemberId, trimmed);
    return { verificationStatus: toStatus };
  }

  // ---------------------------------------------------------------------------
  // State machine primitive
  // ---------------------------------------------------------------------------

  /**
   * The only way `verification_status` is ever written. The status update and its
   * `verification_decisions` audit row go in one transaction — §3's rule that no
   * status change exists without a decision row is enforced here, structurally,
   * rather than by remembering to write both at each call site.
   */
  async transition(
    memberId: string,
    toStatus: VerificationStatus,
    decidedBy: string,
    reason: string | null,
  ): Promise<void> {
    await this.db.transaction((tx) => this.applyTransition(tx, memberId, toStatus, decidedBy, reason));
    // Outside the transaction: a notification failure must not roll back a decision.
    await this.notifier.statusChanged(memberId, toStatus, reason);
  }

  /**
   * The status write + audit-row insert, scoped to a caller-supplied transaction. Split
   * out so a *different* epic's write can be atomic with it — EPIC-F's `expel` (S11d)
   * flips `community.handles.status` and this `verification_status` in one transaction, so
   * the re-registration loophole can never be left open by a crash between two writes
   * (EPIC-F §7). Still the single writer of `verification_status`; the caller owns the tx
   * and must fire `notifyStatusChanged` after it commits.
   */
  async applyTransition(
    tx: DbTx,
    memberId: string,
    toStatus: VerificationStatus,
    decidedBy: string,
    reason: string | null,
  ): Promise<void> {
    const [member] = await tx.select().from(members).where(eq(members.id, memberId));
    if (!member) throw new NotFoundException('Member not found.');
    const fromStatus = member.verificationStatus;
    if (fromStatus === toStatus) return;

    await tx
      .update(members)
      .set({
        verificationStatus: toStatus,
        statusUpdatedAt: new Date(),
        // Only meaningful while in needs_more_info; cleared on the way out.
        needsMoreInfoReason: toStatus === 'needs_more_info' ? reason : null,
      })
      .where(eq(members.id, memberId));

    await tx.insert(verificationDecisions).values({ memberId, fromStatus, toStatus, decidedBy, reason });
    this.log.log(`${memberId}: ${fromStatus} -> ${toStatus} (by ${decidedBy})`);
  }

  /** Fire the status-change notification for a transition applied via {@link applyTransition}. */
  async notifyStatusChanged(memberId: string, toStatus: string, reason: string | null): Promise<void> {
    await this.notifier.statusChanged(memberId, toStatus, reason);
  }

  // ---------------------------------------------------------------------------

  private async findMember(memberId: string): Promise<Member> {
    const [member] = await this.db.select().from(members).where(eq(members.id, memberId));
    if (!member) throw new NotFoundException('Member not found.');
    return member;
  }

  /** Tunable without a deploy (EPIC-J config), falling back to the 48h default. */
  private async timeoutHours(): Promise<number> {
    const [row] = await this.db.select().from(appMeta).where(eq(appMeta.key, TIMEOUT_CONFIG_KEY));
    const parsed = Number(row?.value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_HOURS;
  }
}
