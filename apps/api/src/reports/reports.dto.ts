import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Long enough for real context, short enough that a report stays a triage signal. */
export const REPORT_COMMENT_MAX_LENGTH = 2_000;

export const REPORT_TARGET_TYPES = ['post', 'comment', 'handle'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

/** Mirrors the `report_category` enum (EPIC-F §4). The first two are the priority tier. */
export const REPORT_CATEGORIES = [
  'identifiable_patient_information',
  'anonymity_violation',
  'harassment',
  'spam',
  'other',
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export class CreateReportDto {
  @IsIn(REPORT_TARGET_TYPES)
  targetType!: ReportTargetType;

  @IsUUID()
  targetId!: string;

  @IsIn(REPORT_CATEGORIES)
  category!: ReportCategory;

  @IsOptional()
  @IsString()
  @MaxLength(REPORT_COMMENT_MAX_LENGTH)
  comment?: string;
}
