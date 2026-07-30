import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { EmailSender } from '../notifications/email/email.sender';
import { isUniqueViolation } from '../db/pg-errors';
import { handles, magicLinks, members, reapplicationAttempts, refreshTokens } from '../db/schema';
import { AdminAccessService } from '../admin/admin-access.service';
import { VerificationService } from '../verification/verification.service';
import type { RegisterDto } from './auth.dto';

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (sliding; G-11 makes this tunable later)

const hashToken = (raw: string): string => createHash('sha256').update(raw).digest('hex');
const randomToken = (): string => randomBytes(32).toString('base64url');

export type SessionTokens = { accessToken: string; refreshToken: string };

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly jwt: JwtService,
    private readonly verification: VerificationService,
    private readonly adminAccess: AdminAccessService,
    private readonly email: EmailSender,
  ) {}

  async register(dto: RegisterDto) {
    const registrationCountry = dto.registrationCountry ?? 'UK';
    try {
      const [row] = await this.db
        .insert(members)
        .values({
          legalName: dto.legalName,
          email: dto.email,
          professionalBody: dto.professionalBody,
          registrationNumber: dto.registrationNumber,
          registrationCountry,
        })
        .returning({ id: members.id, verificationStatus: members.verificationStatus });
      // Hand off to the automated checks (EPIC-A §5). Enqueue only — registration must
      // not block on an external register or identity provider.
      await this.verification.enqueueVerification(row.id);
      return { memberId: row.id, verificationStatus: row.verificationStatus };
    } catch (err: unknown) {
      // 23505 = unique_violation (email, or the registration partial-unique index).
      // Drizzle wraps the pg error, so the code can be on the error or its cause.
      // Deliberately generic — no leak of which field, or of prior expelled status (EPIC-A §2).
      if (isUniqueViolation(err)) {
        await this.logIfExpelledReapplication(dto, registrationCountry);
        throw new ConflictException('An account with these details may already exist.');
      }
      throw err;
    }
  }

  /**
   * An expelled member trying again is blocked by the same constraint as any duplicate,
   * but unlike an ordinary duplicate it is recorded for admin review (EPIC-A §2).
   *
   * The applicant-facing response above is byte-identical either way, on purpose:
   * telling them we recognised them would hand a bad-faith actor confirmation that
   * their identity was detected.
   */
  private async logIfExpelledReapplication(dto: RegisterDto, registrationCountry: string) {
    try {
      const [match] = await this.db
        .select({ id: members.id, verificationStatus: members.verificationStatus })
        .from(members)
        .where(
          and(
            eq(members.professionalBody, dto.professionalBody),
            eq(members.registrationNumber, dto.registrationNumber),
            eq(members.registrationCountry, registrationCountry),
          ),
        );
      if (match?.verificationStatus !== 'expelled') return;
      await this.db.insert(reapplicationAttempts).values({
        matchedMemberId: match.id,
        attemptedLegalName: dto.legalName,
        attemptedEmail: dto.email,
        professionalBody: dto.professionalBody,
        registrationNumber: dto.registrationNumber,
        registrationCountry,
      });
    } catch {
      // Never let audit logging change what the applicant sees — they get the same
      // generic 409 regardless, which is the whole point of this branch.
    }
  }

  async requestLink(email: string): Promise<{ devToken: string | null }> {
    const [member] = await this.db.select({ id: members.id }).from(members).where(eq(members.email, email));
    if (!member) return { devToken: null }; // never reveal whether the email exists
    const raw = randomToken();
    await this.db.insert(magicLinks).values({
      memberId: member.id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
    });
    // Send it. Whether the token is *also* returned in the response is the controller's
    // call (AUTH_DEV_MAGIC_LINK) — and that flag is only safe to leave on because this
    // deployment has no real members: it hands a working sign-in link to anyone who knows
    // an address. Turning it off depends on this line working.
    await this.email.magicLink(email, raw);
    return { devToken: raw };
  }

  async verifyLink(rawToken: string): Promise<SessionTokens & { verificationStatus: string }> {
    const [link] = await this.db
      .select()
      .from(magicLinks)
      .where(
        and(
          eq(magicLinks.tokenHash, hashToken(rawToken)),
          isNull(magicLinks.consumedAt),
          gt(magicLinks.expiresAt, new Date()),
        ),
      );
    if (!link) throw new UnauthorizedException('Invalid or expired link.');
    await this.db.update(magicLinks).set({ consumedAt: new Date() }).where(eq(magicLinks.id, link.id));
    const [member] = await this.db.select().from(members).where(eq(members.id, link.memberId));
    const tokens = await this.issueSession(member.id, member.verificationStatus);
    return { ...tokens, verificationStatus: member.verificationStatus };
  }

  async refresh(rawRefresh: string): Promise<SessionTokens> {
    const [rt] = await this.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, hashToken(rawRefresh)),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      );
    if (!rt) throw new UnauthorizedException('Invalid refresh token.');
    // Rotate: revoke the used token, issue a fresh pair.
    await this.db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, rt.id));
    const [member] = await this.db.select().from(members).where(eq(members.id, rt.memberId));
    return this.issueSession(member.id, member.verificationStatus);
  }

  async getVerificationStatus(memberId: string) {
    const [member] = await this.db
      .select({
        email: members.email,
        verificationStatus: members.verificationStatus,
        statusUpdatedAt: members.statusUpdatedAt,
        needsMoreInfoReason: members.needsMoreInfoReason,
        anonymityAcknowledgedAt: members.anonymityAcknowledgedAt,
      })
      .from(members)
      .where(eq(members.id, memberId));
    if (!member) throw new UnauthorizedException();
    const [handle] = await this.db
      .select({ status: handles.status })
      .from(handles)
      .where(eq(handles.memberId, memberId));
    return {
      verificationStatus: member.verificationStatus,
      statusUpdatedAt: member.statusUpdatedAt,
      needsMoreInfoReason: member.needsMoreInfoReason,
      // The three onboarding facts the web app routes on: has a handle been chosen (A6),
      // has the anonymity rule been acknowledged (A7), and is the handle in good standing.
      // No handle *name* here — this endpoint is reachable with a pending token.
      hasHandle: handle !== undefined,
      handleStatus: handle?.status ?? null,
      anonymityAcknowledged: member.anonymityAcknowledgedAt !== null,
      // Lets the web show the admin console entry and gate /admin from the session read
      // it already makes, rather than a second round-trip (S11a).
      isAdmin: this.adminAccess.isAdminEmail(member.email),
    };
  }

  /**
   * Records the member's acknowledgement of the zero-tolerance anonymity rule at
   * onboarding (screen A7, gap G-13). Timestamped against the verified identity, the
   * same way the case-discussion attestation is (EPIC-E) — this is a compliance record,
   * not a UI preference. Idempotent: the first acknowledgement is the one that counts.
   */
  async acknowledgeAnonymity(memberId: string): Promise<{ acknowledgedAt: Date }> {
    const [row] = await this.db
      .update(members)
      .set({ anonymityAcknowledgedAt: new Date() })
      .where(and(eq(members.id, memberId), isNull(members.anonymityAcknowledgedAt)))
      .returning({ acknowledgedAt: members.anonymityAcknowledgedAt });
    if (row?.acknowledgedAt) return { acknowledgedAt: row.acknowledgedAt };
    const [existing] = await this.db
      .select({ acknowledgedAt: members.anonymityAcknowledgedAt })
      .from(members)
      .where(eq(members.id, memberId));
    if (!existing?.acknowledgedAt) throw new UnauthorizedException();
    return { acknowledgedAt: existing.acknowledgedAt };
  }

  /**
   * Re-issue a session after something that changes its scope — currently only handle
   * creation (EPIC-B §5), which is what promotes a pending token to a full one.
   */
  async issueSessionForMember(memberId: string): Promise<SessionTokens> {
    const [member] = await this.db
      .select({ verificationStatus: members.verificationStatus })
      .from(members)
      .where(eq(members.id, memberId));
    if (!member) throw new UnauthorizedException();
    return this.issueSession(memberId, member.verificationStatus);
  }

  private async issueSession(memberId: string, verificationStatus: string): Promise<SessionTokens> {
    // A full session needs BOTH gates on the identity side: verification passed, AND a
    // handle that exists and isn't suspended/expelled (EPIC-A §7, screen spec §1.2).
    // Everything else is pending-scoped and reaches a holding page only — including an
    // approved member who hasn't picked a handle yet, who is routed to A6.
    const [handle] = await this.db
      .select({ id: handles.id, status: handles.status })
      .from(handles)
      .where(eq(handles.memberId, memberId));
    const fullSession =
      verificationStatus === 'approved_verified' && handle !== undefined && handle.status === 'active';
    const accessToken = await this.jwt.signAsync(
      {
        sub: memberId,
        scope: fullSession ? 'full' : 'pending',
        // The handle id rides on the token so community-schema reads never need to look
        // up a member_id to find out who is calling (EPIC-B §5).
        ...(fullSession ? { hdl: handle.id } : {}),
        typ: 'access',
      },
      { expiresIn: '15m' },
    );
    const raw = randomToken();
    await this.db.insert(refreshTokens).values({
      memberId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });
    return { accessToken, refreshToken: raw };
  }
}
