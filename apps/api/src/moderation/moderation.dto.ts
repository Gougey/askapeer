import { IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH } from '../handles/handle-name';

/**
 * The moderation decisions the queue can take on a report.
 *
 * - `remove_content` / `warn` — content-level (S11c).
 * - `suspend` / `expel` / `rename_handle` — handle-level enforcement (S11d).
 * - `request_correction` — the case-discussion fix loop (S11f).
 * - `dismiss` — close a baseless report with no action row (the `dismissed` report status
 *   exists for exactly this; a queue is unusable without it).
 *
 * `request_correction` and `remove_content` are deliberately **not** interchangeable, and
 * the difference is kudos: removal is a judgement that the contribution should not exist,
 * so it reverses the reputation it earned; correction is "fix this and put it back", so
 * the thread's answers and their kudos survive untouched. Using removal where correction
 * was meant silently penalises everyone who answered.
 */
export const MODERATION_ACTIONS = [
  'remove_content',
  'warn',
  'dismiss',
  'suspend',
  'expel',
  'rename_handle',
  'request_correction',
] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export class ModerationActionDto {
  @IsIn(MODERATION_ACTIONS)
  action!: ModerationAction;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  /** Required for — and only meaningful for — `rename_handle`. Same rules as a member handle. */
  @ValidateIf((o: ModerationActionDto) => o.action === 'rename_handle')
  @IsString()
  @MinLength(HANDLE_MIN_LENGTH)
  @MaxLength(HANDLE_MAX_LENGTH)
  newHandleName?: string;
}
