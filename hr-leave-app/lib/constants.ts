// ============================================================
// APP-WIDE CONSTANTS
// ============================================================

export const MAX_EMERGENCIES_PER_MONTH = 3;
export const EMERGENCY_WINDOW_DAYS = 30;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ATTACHMENTS_PER_REQUEST = 5;
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const DEFAULT_WORKDAY_HOURS = 8;
export const MIN_ADVANCE_NOTICE_DAYS = 2;
export const MAX_COMMENT_LENGTH = 500;

export const APPROVAL_SLA_HOURS = 48;
export const CASE_NUMBER_PREFIX = 'LR';
export const ATTACHMENTS_BUCKET = 'leave-attachments';
