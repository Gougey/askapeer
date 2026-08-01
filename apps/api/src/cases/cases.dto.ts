import {
  ArrayMaxSize,
  ArrayUnique,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MAX_TAGS_PER_POST } from '../forum/forum.dto';

/** Generous enough for a full objective examination; short of an essay. */
export const CASE_FIELD_MAX_LENGTH = 4_000;
/** 100 years in days — the same bound the `case_details` CHECK enforces. */
export const MAX_ONSET_DAYS = 36_500;

export const AGE_BANDS = ['child', 'youth', 'adult'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

/**
 * The six-field template (EPIC-E §2, as revised by Andrew Renshaw's clinical review on
 * 2026-08-01).
 *
 * Note what is *absent*: there is no `title` and no free-text `age`, and the timeline is
 * an integer rather than a string. A member cannot type a date of birth or a calendar date
 * into this DTO because no field here would accept one — that is checklist items 3 and 4
 * enforced structurally rather than on trust (EPIC-E §4).
 */
export class CreateCaseDto {
  @IsUUID()
  categoryId!: string;

  @IsIn(AGE_BANDS)
  ageBand!: AgeBand;

  @IsInt()
  @Min(0)
  @Max(MAX_ONSET_DAYS)
  onsetDays!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(CASE_FIELD_MAX_LENGTH)
  presentingCondition!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(CASE_FIELD_MAX_LENGTH)
  historyPresentingCondition!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(CASE_FIELD_MAX_LENGTH)
  objectiveFindings!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(CASE_FIELD_MAX_LENGTH)
  communityQuestion!: string;

  @IsOptional()
  // Any UUID version — the clinical taxonomy is seeded with deterministic uuid5 ids, so a
  // v4 constraint would reject every real tag (same reasoning as CreatePostDto).
  @IsUUID('all', { each: true })
  @ArrayUnique()
  @ArrayMaxSize(MAX_TAGS_PER_POST)
  tagIds?: string[];
}

/**
 * Editing a draft. Every field optional — the composer saves as it goes — but `categoryId`
 * and the six template fields are the only things editable, and only while the post is
 * `draft` or `needs_correction`.
 */
export class UpdateCaseDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsIn(AGE_BANDS)
  ageBand?: AgeBand;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ONSET_DAYS)
  onsetDays?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(CASE_FIELD_MAX_LENGTH)
  presentingCondition?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(CASE_FIELD_MAX_LENGTH)
  historyPresentingCondition?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(CASE_FIELD_MAX_LENGTH)
  objectiveFindings?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(CASE_FIELD_MAX_LENGTH)
  communityQuestion?: string;

  @IsOptional()
  @IsUUID('all', { each: true })
  @ArrayUnique()
  @ArrayMaxSize(MAX_TAGS_PER_POST)
  tagIds?: string[];
}

/**
 * The checklist as the author currently has it: `{ [itemKey]: boolean }`.
 *
 * Deliberately a whole-state PUT rather than a per-item PATCH — the gate is "all six
 * confirmed", so the server should always be looking at a complete picture rather than
 * reconstructing one from a sequence of increments that may have been interrupted.
 * Unknown keys are rejected by the service against the live item list, not here, so the
 * error can name them.
 */
export class SetChecklistDto {
  @IsObject()
  items!: Record<string, boolean>;
}

/**
 * Attesting. The client sends back the exact attestation text it displayed, and the server
 * checks it matches the current policy wording before recording anything.
 *
 * That comparison is not ceremony: it is what stops a stale composer — one loaded before a
 * policy edit and submitted after it — from producing an attestation record whose stored
 * text is not what the member actually read. On mismatch the member is asked to re-read.
 */
export class AttestCaseDto {
  @IsString()
  @MaxLength(2_000)
  attestationText!: string;

  @IsBoolean()
  confirmed!: boolean;
}
