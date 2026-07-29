import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { LIVE_NOTIFICATION_TYPES, type LiveNotificationType } from './notification-payloads';

/**
 * The inbox query (E1). `cursor` is the opaque keyset cursor from the previous page's
 * `nextCursor`.
 */
export class ListNotificationsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;

  /** Query strings arrive as text; `?unreadOnly=true` is the only truthy spelling. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  unreadOnly?: boolean;
}

/**
 * A per-type preference change (EPIC-G §8). The whole triple is sent, not a patch: the
 * F4 screen renders a row of three toggles and knows all three values, and a partial
 * update would need a merge rule for the absent ones that nothing actually wants.
 */
export class UpdateNotificationPreferenceDto {
  @IsIn(LIVE_NOTIFICATION_TYPES)
  type!: LiveNotificationType;

  @IsBoolean()
  inAppEnabled!: boolean;

  @IsBoolean()
  emailEnabled!: boolean;

  /**
   * Accepted and stored, but delivers nothing — the push channel ships inert (EPIC-G
   * §6.2). Storing it from day one is what lets the channel be switched on later as a
   * config change rather than a migration plus a UI change.
   */
  @IsBoolean()
  pushEnabled!: boolean;
}
