import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { members } from '../db/schema';

/**
 * Who counts as an admin. Backed by an email allowlist (`ADMIN_EMAILS`, comma-separated)
 * rather than a role column for now — a deliberate first step: the moderator/administrator
 * JWT claims and their own management surfaces are S11/S13. An allowlist keeps the founder
 * accounts in without a schema change, and is trivially revocable.
 *
 * Kept in its own tiny service, with no dependency on the auth module, so both the auth
 * session read (which reports `isAdmin` to the web) and the admin guard can share it
 * without a circular import.
 */
@Injectable()
export class AdminAccessService {
  private readonly allow: ReadonlySet<string>;

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    config: ConfigService,
  ) {
    this.allow = new Set(
      (config.get<string>('ADMIN_EMAILS') ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  isAdminEmail(email: string): boolean {
    return this.allow.has(email.trim().toLowerCase());
  }

  async isAdmin(memberId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ email: members.email })
      .from(members)
      .where(eq(members.id, memberId));
    return row ? this.isAdminEmail(row.email) : false;
  }
}
