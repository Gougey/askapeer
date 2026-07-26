import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/db.module';
import { handles, identityAccessLog, members } from '../db/schema';
import type { RevealIdentityDto } from './reveal-identity.dto';

/** The G-24 field set — and nothing more (EPIC-F §5). */
export type RevealedIdentity = {
  legalName: string;
  email: string;
  professionalBody: string;
  registrationNumber: string;
  registrationCountry: string;
};

@Injectable()
export class IdentityAccessService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Resolve a handle to its member's real identity — the platform's single audited
   * exception to pseudonymity (EPIC-F §5). The access row is written **before** the
   * identity is returned, so a reveal can never happen without a log entry naming the
   * moderator, the reason, and the moment. Returns only the justified field set.
   */
  async reveal(
    handleId: string,
    accessedBy: string,
    dto: RevealIdentityDto,
  ): Promise<RevealedIdentity> {
    const [handle] = await this.db
      .select({ memberId: handles.memberId })
      .from(handles)
      .where(eq(handles.id, handleId));
    if (!handle) throw new NotFoundException('No such handle.');

    const [member] = await this.db
      .select({
        legalName: members.legalName,
        email: members.email,
        professionalBody: members.professionalBody,
        registrationNumber: members.registrationNumber,
        registrationCountry: members.registrationCountry,
      })
      .from(members)
      .where(eq(members.id, handle.memberId));
    if (!member) throw new NotFoundException('No such member.');

    // Log first: the identity is only returned once the access is recorded.
    await this.db.insert(identityAccessLog).values({
      memberId: handle.memberId,
      handleId,
      accessedBy,
      reasonCode: dto.reasonCode,
      reasonNote: dto.reasonNote.trim(),
    });

    return member;
  }
}
