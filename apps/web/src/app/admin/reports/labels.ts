import type { ReportTargetType } from '@/lib/admin';

/** Human labels for the report categories (EPIC-F §4). */
export const CATEGORY_LABELS: Record<string, string> = {
  identifiable_patient_information: 'Identifiable patient information',
  anonymity_violation: 'Revealing an identity',
  harassment: 'Harassment or abuse',
  spam: 'Spam',
  other: 'Something else',
};

export const TARGET_LABELS: Record<ReportTargetType, string> = {
  post: 'Question',
  comment: 'Answer',
  handle: 'Handle',
};
