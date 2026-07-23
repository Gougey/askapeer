import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const REVIEW_ACTIONS = ['approve', 'reject', 'request_more_info'] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

/**
 * A verification review decision. `reason` is required for `request_more_info` (the
 * applicant is shown it on their holding page) — enforced in the service so the message
 * can name the action; optional but recorded for the others.
 */
export class VerificationDecisionDto {
  @IsIn(REVIEW_ACTIONS)
  action!: ReviewAction;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
