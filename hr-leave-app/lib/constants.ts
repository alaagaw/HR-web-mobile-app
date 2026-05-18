// ============================================================
// APP-WIDE CONSTANTS
// ============================================================

export const MAX_EMERGENCIES_PER_MONTH = 3;
export const EMERGENCY_WINDOW_DAYS = 30;

// Registration declaration (R2e). `version` is stored on the profile
// (declaration_version) alongside declaration_accepted_at so we can
// prove which wording the employee accepted if the text ever changes.
// Fixed qualification ladder (R2c). Stored as free text on
// profiles.qualification; this list drives the picker.
export const QUALIFICATION_OPTIONS = [
  'None',
  'Elementary',
  'Intermediate',
  'High School',
  'Diploma',
  "Bachelor's",
  "Master's",
  'Doctorate / PhD',
  'Professional Training / Certificate',
] as const;

export const REGISTRATION_DECLARATION_VERSION = 'v1-2026-05-18';
export const REGISTRATION_DECLARATION_TEXT =
  'I, hereby confirm that all the information in this form is true and ' +
  'correct. I also understand that the information collected in this ' +
  'form will be used for creation of Qiwa contract, and by accepting/' +
  'submitting this form, I confirm that the information can be used for ' +
  'this purpose.';

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

// ── HR Policies & Documents ───────────────────────────────────
// Private bucket — files are only ever fetched via the
// `hr-document-url` edge function (signed URLs). Keep the allowed
// MIME list in sync with migration 041's storage.buckets row.
export const HR_DOCUMENTS_BUCKET = 'hr-documents';
export const HR_DOC_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const HR_DOC_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

// ── Timesheet System ──────────────────────────────────────────
export const COMPANY_NAME = 'POLY-TECH';
export const TIMESHEET_DOC_NUMBER = 'PT-OPR-FM-0008';
export const TIMESHEET_DOC_REV = 'REV:01 PAGE 1 OF 1';
export const TIMESHEET_DOC_DATE = '20-03-2020';
