import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { magicLinks, members, refreshTokens } from '../db/schema';
import type { RegisterDto } from './auth.dto';

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (sliding; G-11 makes this tunable later)

const hashToken = (raw: string): string => createHash('sha256').update(raw).digest('hex');
const randomToken = (): string => randomBytes(32).toString('base64url');

/** Postgres unique_violation (23505), unwrapping Drizzle's error wrapper. */
function isUniqueViolation(err: unknown): boolean {
  let e: unknown = err;
  for (let i = 0; i < 5 && e; i++) {
    if ((e as { code?: string }).code === '23505') return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

export type SessionTokens = { accessToken: string; refreshToken: string };

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const [row] = await this.db
        .insert(members)
        .values({
          legalName: dto.legalName,
          email: dto.email,
          professionalBody: dto.professionalBody,
          registrationNumber: dto.registrationNumber,
          registrationCountry: dto.registrationCountry ?? 'UK',
        })
        .returning({ id: members.id, verificationStatus: members.verificationStatus });
      return { memberId: row.id, verificationStatus: row.verificationStatus };
    } catch (err: unknown) {
      // 23505 = unique_violation (email, or the registration partial-unique index).
      // Drizzle wraps the pg error, so the code can be on the error or its cause.
      // Deliberately generic — no leak of which field, or of prior expelled status (EPIC-A §2).
      if (isUniqueViolation(err)) {
        throw new ConflictException('An account with these details may already exist.');
      }
      throw err;
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
    // Real email delivery arrives with EPIC-G (S10); until then the token is returned in dev only.
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
      .select({ verificationStatus: members.verificationStatus, statusUpdatedAt: members.statusUpdatedAt })
      .from(members)
      .where(eq(members.id, memberId));
    if (!member) throw new UnauthorizedException();
    return { verificationStatus: member.verificationStatus, statusUpdatedAt: member.statusUpdatedAt };
  }

  private async issueSession(memberId: string, verificationStatus: string): Promise<SessionTokens> {
    // Pending-scoped until approved_verified (holding page only, architecture §5.2).
    const scope = verificationStatus === 'approved_verified' ? 'full' : 'pending';
    const accessToken = await this.jwt.signAsync({ sub: memberId, scope, typ: 'access' }, { expiresIn: '15m' });
    const raw = randomToken();
    await this.db.insert(refreshTokens).values({
      memberId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });
    return { accessToken, refreshToken: raw };
  }
}
