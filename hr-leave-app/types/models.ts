import {
  Role,
  LeaveType,
  LeaveStatus,
  HistoryAction,
  ExcessDetermination,
  NotificationType,
  LedgerReason,
  RenewalTaskStatus,
  RenewalTaskAction,
  RegistrationStatus,
  TimeEntryType,
  TimeEntryStatus,
  ProjectStatus,
  TimesheetSubmissionStatus,
  ComplianceFlagType,
  TimesheetAction,
  ProjectEntryMode,
  ProjectHoursChangeScope,
  ProjectHoursChangeStatus,
  ProjectHoursChangeAction,
  HRDocumentStatus,
  HRDocumentVisibility,
} from './enums';

// ============================================================
// USER & ORG CHART
// ============================================================

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
  role: Role;
  supervisor_id: string | null;
  manager_id: string | null;
  department: string | null;
  job_title: string | null;
  start_date: string | null;
  nationality: string | null;
  workday_hours: number;
  /**
   * Annual PTO entitlement in days. Drives the monthly accrual
   * (entitlement / 12). Defaults to 21 (Saudi <5-year tenure baseline)
   * for any active employee; HR edits in Edit Employee.
   */
  annual_leave_entitlement_days: number | null;
  /**
   * Opts this employee in/out of the daily form-warning cron. When
   * true (default) and they sit in pending_info / info_rejected past
   * day 3, the daily check emails them + HR; on day 4 the salary-hold
   * email goes out. HR can toggle off per-employee in Edit Employee
   * for special cases. See migration 031.
   */
  warn_on_uncompleted_form: boolean;
  is_active: boolean;
  registration_status: RegistrationStatus;
  must_change_password: boolean;
  invited_by: string | null;
  registration_note: string | null;
  /**
   * Snapshot of the values HR entered when creating this employee.
   * Used by the HR Pending Registrations review screen to highlight
   * (yellow tint) any field the employee changed during their
   * registration form submission.
   */
  hr_original_values: Record<string, unknown> | null;
  /**
   * The time the employee actually submitted (or resubmitted) their
   * registration form — stamped by the submit_my_registration RPC
   * (migration 040). Distinct from created_at, which is profile/auth
   * creation time. Null only for pre-040 rows that were never pending
   * at backfill time. Use this for any "Submitted" label, with
   * created_at as a last-resort fallback.
   */
  registration_submitted_at: string | null;
  /**
   * When HR last SENT this employee a form request (first invite,
   * re-verification, or info-form request). The day-3/day-4 form-
   * warning clock counts from here. Null = HR never sent one.
   */
  form_request_sent_at: string | null;
  created_at: string;
  updated_at: string;
  /**
   * Convenience field surfaced from employee_documents.emp_code via a join in
   * userService.getEmployees. Not stored on profiles directly. Lets callers
   * read profile.emp_code without a second round-trip, e.g. when copying the
   * employee number into a fresh timesheet entry row.
   */
  emp_code?: string | null;
}

export interface ProfileSummary {
  id: string;
  full_name: string;
  role: Role;
  department: string | null;
}

// ============================================================
// EMPLOYEE DOCUMENTS (Iqama, Passport, Insurance, etc.)
// ============================================================

/** Which document the employee selected as their primary ID. */
export type IdType = 'national_id' | 'iqama' | 'passport';

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  emp_code: string;
  /** Primary ID type chosen by the employee at registration. */
  id_type: IdType | null;
  /** Saudi national ID number — only relevant when id_type='national_id'. */
  national_id_number: string | null;
  /** Storage URL (signed) of the uploaded scan of the primary ID. */
  id_document_url: string | null;
  iqama_number: string | null;
  passport_number: string | null;
  insurance_number: string | null;
  occupation: string | null;
  birth_date: string | null;
  passport_expiry: string | null;
  iqama_expiry: string | null;
  insurance_expiry: string | null;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined relation
  employee?: ProfileSummary;
}

export interface EmployeeDocumentDraft {
  id_type?: IdType | null;
  national_id_number?: string | null;
  id_document_url?: string | null;
  iqama_number?: string | null;
  passport_number?: string | null;
  insurance_number?: string | null;
  occupation?: string | null;
  birth_date?: string | null;
  passport_expiry?: string | null;
  iqama_expiry?: string | null;
  insurance_expiry?: string | null;
}

// ============================================================
// LEAVE BALANCES
// ============================================================

export interface LeaveBalance {
  id: number;
  employee_id: string;
  leave_type: LeaveType;
  balance_hours: number;
  used_hours: number;
  year: number;
  updated_at: string;
}

export interface LeaveLedgerEntry {
  id: number;
  employee_id: string;
  leave_type: string;
  change_hours: number;
  reason: LedgerReason;
  reference_id: string | null;
  performed_by: string | null;
  created_at: string;
}

// ============================================================
// LEAVE REQUESTS
// ============================================================

export interface LeaveRequest {
  id: string;
  case_number: string;
  employee_id: string;
  leave_type: LeaveType;

  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  include_weekends: boolean;

  requested_hours: number;
  paid_hours: number;
  excess_hours: number;
  has_excess: boolean;

  is_emergency: boolean;
  emergency_number: number | null;
  emergency_reason: string | null;

  excess_determination: ExcessDetermination | null;
  excess_determined_by: string | null;
  excess_determined_at: string | null;

  status: LeaveStatus;
  current_assignee_id: string | null;
  current_assignee_role: string | null;

  employee_comment: string | null;

  submitted_at: string | null;
  pending_since: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations (populated by queries)
  employee?: ProfileSummary;
  current_assignee?: ProfileSummary;
  attachments?: Attachment[];
  history?: HistoryEntry[];
}

export interface LeaveRequestDraft {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  include_weekends: boolean;
  is_full_day: boolean;
  employee_comment: string | null;
  emergency_reason: string | null;
}

// ============================================================
// APPROVAL HISTORY
// ============================================================

export interface HistoryEntry {
  id: number;
  request_id: string;
  action: HistoryAction;
  performed_by: string;
  performer_role: string;
  comment: string | null;
  from_status: string | null;
  to_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  performer?: ProfileSummary;
}

// ============================================================
// ATTACHMENTS
// ============================================================

export interface Attachment {
  id: number;
  request_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export interface AppNotification {
  id: number;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

// ============================================================
// COMPUTED TYPES (for UI display)
// ============================================================

export interface HoursComputeParams {
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  include_weekends: boolean;
  is_full_day: boolean;
  workday_hours: number;
}

export interface HoursResult {
  requested_hours: number;
  requested_days: number;
  working_days: number;
}

export interface BalanceImpact {
  available_hours: number;
  available_days: number;
  requested_hours: number;
  requested_days: number;
  remaining_hours: number;
  remaining_days: number;
  paid_hours: number;
  excess_hours: number;
  excess_days: number;
  has_excess: boolean;
}

export interface RequestFilters {
  status?: LeaveStatus | LeaveStatus[];
  leave_type?: LeaveType;
  employee_id?: string;
  department?: string;
  start_date?: string;
  end_date?: string;
}

export interface EmployeeFilters {
  role?: Role;
  department?: string;
  is_active?: boolean;
  search?: string;
}

// ============================================================
// RENEWAL TASKS (Document expiry task assignment)
// ============================================================

export interface RenewalTask {
  id: string;
  task_number: string;
  employee_id: string;
  document_id: string;
  document_type: string;
  expiry_date: string;
  status: RenewalTaskStatus;
  assigned_to_id: string | null;
  assigned_by_id: string | null;
  notes: string | null;
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  unassigned_at: string | null;
  unassigned_by_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  employee?: ProfileSummary;
  assigned_to?: ProfileSummary;
  assigned_by?: ProfileSummary;
  document?: EmployeeDocument;
}

export interface RenewalTaskHistory {
  id: number;
  task_id: string;
  action: RenewalTaskAction;
  performed_by: string;
  performer_role: string;
  comment: string | null;
  from_status: string | null;
  to_status: string | null;
  metadata: Record<string, unknown> | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
  performer?: ProfileSummary;
}

export interface RenewalTaskFilters {
  status?: RenewalTaskStatus | RenewalTaskStatus[];
  assigned_to_id?: string;
  document_type?: string;
}

// ============================================================
// REGISTRATION
// ============================================================

/**
 * Submitted by the employee from /registration-form when their profile
 * is at status `pending_info`.
 *
 * Phase B shape: the form has a mandatory primary ID (id_type +
 * id_document_url + the matching number/expiry) plus optional
 * supplementary documents. Only fields that apply to the chosen ID
 * type are populated; the rest come through as null.
 */
export interface RegistrationFormData {
  // Profile-level (employee-editable, HR pre-fills some)
  email: string;
  full_name: string;
  phone: string;
  nationality: string;

  // Primary identification
  id_type: IdType;
  id_document_url: string;

  // Conditional ID number/expiry — populated based on id_type
  national_id_number: string | null;
  iqama_number: string | null;
  iqama_expiry: string | null;
  passport_number: string | null;
  passport_expiry: string | null;

  // Auto-derived from job_title at create-employee time, kept editable here
  // for backward compat with the legacy submitRegistration payload.
  occupation?: string;
}

/**
 * Sent to the bulk re-registration RPC. Demotes selected active
 * employees back to `pending_info` so they're forced through the
 * registration form to verify/complete their profile.
 */
export interface RequestProfileVerificationResult {
  profile_id: string;
  success: boolean;
  error?: string;
}

/**
 * One row in the effective-dated `employee_compensation` table.
 * Saved on every salary change (insert a new row with effective_from
 * = today). Past rows stay around as the audit trail; the row
 * "currently in effect" is the one with the latest effective_from
 * <= today.
 */
export interface EmployeeCompensation {
  employee_id: string;
  effective_from: string;       // ISO date
  basic_salary: number;
  hra: number;
  transportation: number;
  other_allowances: number;
  currency: string;
  notes: string | null;
  total_monthly?: number;       // present when read via v_current_compensation
  created_at?: string;
  created_by?: string | null;
}

/**
 * One row returned by the compute_predicted_payouts RPC. Backs the
 * "Forecast (from balance)" tab on /admin/leave-payouts. Pay totals
 * are computed client-side based on HR's days/start_date inputs so
 * editing is live and doesn't need a round-trip per keystroke.
 */
export interface PredictedPayoutRow {
  employee_id: string;
  full_name: string;
  emp_code: string | null;
  department: string | null;
  workday_hours: number;
  basic_salary: number;
  hra: number;
  transportation: number;
  other_allowances: number;
  total_monthly: number;
  pto_balance_hours: number;
  pto_balance_days: number;
  effective_from: string | null;
  days_in_calendar_month: number;
}

/**
 * One row returned by the compute_leave_payouts RPC. The /admin/leave-payouts
 * grid renders these directly; totals are summed client-side.
 */
export interface LeavePayoutRow {
  employee_id: string;
  full_name: string;
  emp_code: string | null;
  department: string | null;
  basic_salary: number;
  hra: number;
  transportation: number;
  other_allowances: number;
  total_monthly: number;
  days_in_month: number;
  basic_payable: number;
  hra_payable: number;
  transport_payable: number;
  other_payable: number;
  total_payable: number;
  effective_from: string | null;
}

export interface InviteEmployeeData {
  email: string;
  full_name: string;
  role: Role;
  department: string;
  supervisor_id: string | null;
  manager_id: string | null;
}

/** Full payload for create-employee (HR creates the row; invite may follow). */
export interface CreateEmployeeData {
  email: string;
  full_name: string;
  /**
   * Optional. If omitted, the create-employee Edge Function generates the
   * next code via the Postgres `emp_code_seq` sequence (atomic, race-free).
   * HR can override (e.g. when importing existing employees with legacy
   * codes) by passing a value.
   */
  emp_code?: string;
  /**
   * Optional. The employee fills it in during the registration form;
   * HR no longer required to know it at creation time.
   */
  phone?: string;
  /** Required. HR enters it at creation; the employee can confirm/correct
   *  it during the registration form (pre-filled from this value). */
  nationality: string;
  role: Role;
  department: string;
  supervisor_id: string;
  manager_id: string;
  job_title: string;
  start_date: string;
  workday_hours: number;
  /** Annual PTO days; defaults to 21 if omitted (Saudi <5-year baseline). */
  annual_leave_entitlement_days?: number;
}

/** Per-id result returned by the batch send-invite Edge Function. */
export interface SendInviteResult {
  profile_id: string;
  success: boolean;
  error?: string;
}

export interface PendingRegistration extends Profile {
  employee_documents?: EmployeeDocument | null;
}

export interface ApproveRegistrationData {
  emp_code: string;
  role: Role;
  department: string;
  supervisor_id: string | null;
  manager_id: string | null;
}

/**
 * HR-supplied overrides to a pending registration's employee-supplied
 * fields, applied via the Review Registration dialog before approval.
 * Every property is optional — undefined means "leave alone" and is
 * translated to NULL on the RPC side. Empty string is a valid "set
 * blank" intent and will be sent through (the RPC's IS DISTINCT FROM
 * check decides if it's actually a change).
 */
export interface RegistrationFieldEdits {
  full_name?: string;
  phone?: string;
  nationality?: string;
  id_type?: IdType | '';
  national_id_number?: string;
  iqama_number?: string;
  iqama_expiry?: string;     // ISO date (yyyy-mm-dd)
  passport_number?: string;
  passport_expiry?: string;  // ISO date
  id_document_url?: string;  // storage path, not signed URL
}

// ============================================================
// TIME TRACKING (Clock In / Clock Out)
// ============================================================

export interface TimeEntry {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
  entry_type: TimeEntryType;
  status: TimeEntryStatus;
  created_at: string;
  updated_at: string;
  // Joined relation
  employee?: ProfileSummary;
}

// ============================================================
// TIMESHEET SYSTEM (Projects, Weekly Entries, Submissions)
// ============================================================

export interface Project {
  id: string;
  project_number: string;
  name: string;
  client: string | null;
  location: string | null;
  scope: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  /** Locked at creation; never editable after the project exists. */
  entry_mode: ProjectEntryMode;
  /** Editable only via the project-hours change-request approval pipeline. */
  regular_hours_per_day: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDraft {
  project_number: string;
  name: string;
  client?: string | null;
  location?: string | null;
  scope?: string | null;
  status?: ProjectStatus;
  start_date?: string | null;
  end_date?: string | null;
  /** Set at creation only; cannot be changed afterwards. */
  entry_mode?: ProjectEntryMode;
  regular_hours_per_day?: number;
}

export interface Supplier {
  id: string;
  name: string;
  code: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierDraft {
  name: string;
  code?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface TimesheetEntry {
  id: string;
  project_id: string;
  employee_id: string | null;
  employee_name: string;
  employee_number: string | null;
  designation: string | null;
  supplier_id: string | null;
  entry_date: string;
  standard_hours: number;
  overtime_hours: number;
  /** Frozen snapshot taken at save time; immune to later config changes. */
  effective_regular_hours_per_day: number;
  st_shift: string;
  ot_shift: string;
  notes: string | null;
  entered_by: string;
  created_at: string;
  updated_at: string;
  // Joined relations
  employee?: ProfileSummary;
  supplier?: Supplier;
  project?: Project;
}

export interface TimesheetEntryDraft {
  project_id: string;
  employee_id?: string | null;
  employee_name: string;
  employee_number?: string | null;
  designation?: string | null;
  supplier_id?: string | null;
  entry_date: string;
  standard_hours?: number;
  overtime_hours?: number;
  effective_regular_hours_per_day?: number;
  st_shift?: string;
  ot_shift?: string;
  notes?: string | null;
}

export interface TimesheetSubmission {
  id: string;
  project_id: string;
  week_start: string;
  week_end: string;
  status: TimesheetSubmissionStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  project?: Project;
  submitted_by_profile?: ProfileSummary;
  approved_by_profile?: ProfileSummary;
}

export interface TimesheetAssignment {
  id: string;
  project_id: string;
  assigned_to_id: string;
  assigned_by_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined relations
  project?: Project;
  assigned_to?: ProfileSummary;
  assigned_by?: ProfileSummary;
}

export interface ComplianceFlag {
  id: string;
  project_id: string;
  keeper_id: string;
  flag_date: string;
  flag_type: ComplianceFlagType;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  // Joined relations
  project?: Project;
  keeper?: ProfileSummary;
}

export interface TimesheetHistory {
  id: number;
  submission_id: string;
  action: TimesheetAction;
  performed_by: string;
  performer_role: string;
  comment: string | null;
  from_status: string | null;
  to_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  performer?: ProfileSummary;
}

export interface TimesheetFilters {
  project_id?: string;
  supplier_id?: string;
  status?: TimesheetSubmissionStatus | TimesheetSubmissionStatus[];
  week_start?: string;
  week_end?: string;
}

export interface ProjectFilters {
  status?: ProjectStatus;
  search?: string;
}

// ============================================================
// MONTHLY CONSOLIDATED VIEW
// ============================================================

export interface MonthlyHourSetting {
  id: string;
  month: number;
  year: number;
  regular_hours_limit: number;
  set_by: string | null;
  created_at: string;
  updated_at: string;
}

/** One row returned by the consolidated month query (aggregated across all projects) */
export interface ConsolidatedMonthEntry {
  employee_key: string;
  employee_name: string;
  employee_number: string | null;
  designation: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  entry_date: string;
  total_hours: number;
}

// ============================================================
// OVERTIME V2 — capabilities, PMs, change requests, closures
// ============================================================

export interface ProfileCapabilities {
  profile_id: string;
  is_general_manager: boolean;
  is_operations_manager: boolean;
  can_approve_project_hours_changes: boolean;
  can_close_month: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectManagerAssignment {
  id: string;
  project_id: string;
  profile_id: string;
  assigned_by: string | null;
  created_at: string;
  // Joined relations
  project?: Project;
  profile?: ProfileSummary;
}

export interface ProjectHoursChangeRequest {
  id: string;
  project_id: string;
  scope: ProjectHoursChangeScope;
  week_start: string;
  current_value: number;
  requested_value: number;
  status: ProjectHoursChangeStatus;
  reason: string | null;
  requested_by: string;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_comment: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  project?: Project;
  requester?: ProfileSummary;
  decider?: ProfileSummary;
}

export interface ProjectHoursChangeRequestDraft {
  project_id: string;
  scope: ProjectHoursChangeScope;
  week_start: string;
  current_value: number;
  requested_value: number;
  reason?: string | null;
}

export interface ProjectHoursChangeHistory {
  id: number;
  request_id: string;
  action: ProjectHoursChangeAction;
  performed_by: string;
  performer_role: string;
  comment: string | null;
  from_status: ProjectHoursChangeStatus | null;
  to_status: ProjectHoursChangeStatus | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // Joined relations
  performer?: ProfileSummary;
}

export interface MonthClosure {
  id: string;
  year: number;
  month: number;
  closed_by: string;
  closed_at: string;
  reopened_by: string | null;
  reopened_at: string | null;
  notes: string | null;
}

/** Per-employee row from v_employee_overtime_current_month. */
export interface EmployeeOvertimeCurrentMonth {
  employee_id: string;
  overtime_hours_total: number;
  month_start: string;
  month_end: string;
}

// ============================================================
// HR POLICIES & DOCUMENTS
// ============================================================

/** A node in the document navigation tree. */
export interface HRDocumentFolder {
  id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  /** all = every employee sees it; hr_only = HR / HR Director only. */
  visibility: HRDocumentVisibility;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** A logical document — the thing users open. File bytes live on
 *  its versions, not here. */
export interface HRDocument {
  id: string;
  folder_id: string | null;
  title: string;
  description: string | null;
  tags: string[];
  status: HRDocumentStatus;
  visibility: HRDocumentVisibility;
  current_version_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
  // Joined client-side for convenience.
  current_version?: HRDocumentVersion | null;
}

/** One uploaded file. Immutable; "replace" inserts a new row and
 *  moves HRDocument.current_version_id. */
export interface HRDocumentVersion {
  id: string;
  document_id: string;
  version_no: number;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  /** Populated by the extract-document-text edge function. */
  extracted_text: string | null;
  change_note: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

/** Fields HR sets when creating / editing a document's metadata. */
export interface HRDocumentDraft {
  title: string;
  description: string | null;
  tags: string[];
  folder_id: string | null;
  visibility: HRDocumentVisibility;
}

/** A local file picked for upload (web File or RN document-picker asset). */
export interface HRDocUploadFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}
