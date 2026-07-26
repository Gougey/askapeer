import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

/** The three legitimate grounds for crossing the pseudonymity boundary (EPIC-F §5). */
export const REVEAL_REASON_CODES = ['reported_violation', 'legal_request', 'safety_escalation'] as const;
export type RevealReasonCode = (typeof REVEAL_REASON_CODES)[number];

export class RevealIdentityDto {
  @IsIn(REVEAL_REASON_CODES)
  reasonCode!: RevealReasonCode;

  /** A written justification is mandatory — the reveal is the one audited exception, and
   *  the note is what the audit trail is for. */
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reasonNote!: string;
}
