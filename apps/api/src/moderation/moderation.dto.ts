import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * The moderation decisions S11c implements. `remove_content` and `warn` write a
 * `moderation_actions` row; `dismiss` resolves an unfounded report with no action row
 * (the `dismissed` report status exists precisely for this — a queue is unusable without
 * a way to clear a baseless report). The rest of the action vocabulary — suspend / expel
 * / rename_handle / request_correction — arrives in S11d / S11f.
 */
export const MODERATION_ACTIONS = ['remove_content', 'warn', 'dismiss'] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export class ModerationActionDto {
  @IsIn(MODERATION_ACTIONS)
  action!: ModerationAction;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
