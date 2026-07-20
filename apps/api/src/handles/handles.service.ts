import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { AuthService, type SessionTokens } from '../auth/auth.service';
import { DRIZZLE, type Database } from '../db/db.module';
import { isUniqueViolation } from '../db/pg-errors';
import { handleBlocklist, handleNameHistory, handles, members } from '../db/schema';
import { findBlocklistMatch, isValidFormat, type HandleRejection } from './handle-name';

export type AvailabilityResult = { available: boolean; reason?: HandleRejection };

/** The public profile shape (EPIC-B §5). Structurally incapable of carrying member_id. */
export type PublicProfile = {
  handleId: string;
  handleName: string;
  kudosTotal: number;
  memberSinceYear: number;
  status: 'active' | 'suspended' | 'expelled';
  interactable: boolean;
};

@Injectable()
export class HandlesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly auth: AuthService,
  ) {}

  /**
   * Non-mutating version of the checks POST /v1/handles applies, powering as-you-type
   * feedback on screen A6 (gap G-12). Advisory only — two people can pass this check on
   * the same name a moment apart, and the unique index settles it at insert time.
   */
  async checkAvailability(name: string): Promise<AvailabilityResult> {
    if (!isValidFormat(name)) return { available: false, reason: 'invalid_format' };

    const terms = await this.db
      .select({ term: handleBlocklist.term, matchMode: handleBlocklist.matchMode })
      .from(handleBlocklist);
    if (findBlocklistMatch(name, terms)) return { available: false, reason: 'blocklisted' };

    if (await this.nameEverUsed(name)) return { available: false, reason: 'taken' };
    return { available: true };
  }

  /**
   * A name is unavailable if it is in use *or* has ever been used (EPIC-B §3). The
   * history check is what stops a fresh registration re-adopting the name an expelled
   * member posted under, which would mislead everyone still reading those threads.
   */
  private async nameEverUsed(name: string): Promise<boolean> {
    const [live] = await this.db
      .select({ id: handles.id })
      .from(handles)
      .where(sql`lower(${handles.handleName}) = lower(${name})`);
    if (live) return true;
    const [historic] = await this.db
      .select({ id: handleNameHistory.id })
      .from(handleNameHistory)
      .where(sql`lower(${handleNameHistory.previousName}) = lower(${name})`);
    return historic !== undefined;
  }

  /**
   * Claim a handle and exchange the pending session for a full one (EPIC-B §5).
   * Callable exactly once: a member with a handle has no route back through here, and
   * handles are immutable from the member's side (EPIC-B §6).
   */
  async create(memberId: string, handleName: string): Promise<{ profile: PublicProfile } & SessionTokens> {
    const [member] = await this.db
      .select({ verificationStatus: members.verificationStatus })
      .from(members)
      .where(eq(members.id, memberId));
    if (member?.verificationStatus !== 'approved_verified') {
      throw new ForbiddenException('Verification must be approved before choosing a handle.');
    }

    const [existing] = await this.db
      .select({ id: handles.id })
      .from(handles)
      .where(eq(handles.memberId, memberId));
    if (existing) throw new ConflictException('This account already has a handle.');

    // Re-validated authoritatively here; the availability endpoint is only advisory.
    const availability = await this.checkAvailability(handleName);
    if (!availability.available) {
      throw new ConflictException({
        message: 'That handle is not available.',
        reason: availability.reason,
      });
    }

    const created = await this.db.transaction(async (tx) => {
      let row: typeof handles.$inferSelect;
      try {
        [row] = await tx.insert(handles).values({ memberId, handleName }).returning();
      } catch (err: unknown) {
        // Two applicants racing for the same name: the unique index is the arbiter
        // (EPIC-B §10). The client should offer alternatives, not retry blindly.
        if (isUniqueViolation(err)) throw new ConflictException('That handle is not available.');
        throw err;
      }
      // Written at creation as well as on rename, so the "ever used?" check above stays
      // a single lookup — see the handle_name_history comment in the schema.
      await tx.insert(handleNameHistory).values({
        handleId: row.id,
        previousName: row.handleName,
        changedBy: 'system',
      });
      return row;
    });

    // Promotes the pending token to a handle-scoped one — the member can now reach the
    // app shell rather than the holding page.
    const tokens = await this.auth.issueSessionForMember(memberId);
    return { profile: toPublicProfile(created), ...tokens };
  }

  async getById(handleId: string): Promise<PublicProfile> {
    const [row] = await this.db.select().from(handles).where(eq(handles.id, handleId));
    if (!row) throw new NotFoundException('No such handle.');
    return toPublicProfile(row);
  }

  /**
   * The member's own view (EPIC-B §5). Same shape as the public profile — there are no
   * member-editable profile fields by design (EPIC-B §5, gap G-23), so "my profile" is
   * genuinely just the public one plus links to the settings screens.
   */
  async getMine(handleId: string): Promise<PublicProfile> {
    return this.getById(handleId);
  }
}

/**
 * The single place a handle row becomes an API response. `member_since` is truncated to
 * the year here and nowhere else: the full date is stored for KPI reporting, but an
 * exact join date is a correlation vector back to a real person (EPIC-B §4). `member_id`
 * has no path into this type at all — the guarantee is structural, not a filter.
 */
function toPublicProfile(row: typeof handles.$inferSelect): PublicProfile {
  return {
    handleId: row.id,
    handleName: row.handleName,
    kudosTotal: row.kudosTotal,
    memberSinceYear: new Date(row.memberSince).getUTCFullYear(),
    status: row.status,
    // Suspended and expelled handles keep their profile and history — removing them
    // would leave holes in threads other members replied to — but can't be followed or
    // given kudos (EPIC-B §7). EPIC-D/S5 and follows/S7 read this flag.
    interactable: row.status === 'active',
  };
}
