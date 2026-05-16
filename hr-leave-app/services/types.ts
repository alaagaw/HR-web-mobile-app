import type {
  Profile,
  ProfileSummary,
  LeaveRequest,
  LeaveRequestDraft,
  TimeEntry,
  LeaveBalance,
  LeaveLedgerEntry,
  Attachment,
  AppNotification,
  HistoryEntry,
  EmployeeDocument,
  EmployeeDocumentDraft,
  HoursComputeParams,
  HoursResult,
  RequestFilters,
  EmployeeFilters,
  RenewalTask,
  RenewalTaskHistory,
  RenewalTaskFilters,
  RegistrationFormData,
  RegistrationFieldEdits,
  InviteEmployeeData,
  CreateEmployeeData,
  SendInviteResult,
  RequestProfileVerificationResult,
  PendingRegistration,
  ApproveRegistrationData,
  Project,
  ProjectDraft,
  ProjectFilters,
  Supplier,
  SupplierDraft,
  TimesheetEntry,
  TimesheetEntryDraft,
  TimesheetSubmission,
  TimesheetAssignment,
  ComplianceFlag,
  TimesheetHistory,
  TimesheetFilters,
  ConsolidatedMonthEntry,
  MonthlyHourSetting,
  HRDocumentFolder,
  HRDocument,
  HRDocumentVersion,
  HRDocumentDraft,
  HRDocUploadFile,
} from '@/types/models';
import type { ExcessDetermination, RegistrationStatus, HRDocumentVisibility } from '@/types/enums';

// ============================================================
// SERVICE INTERFACES — Define WHAT the app can do, not HOW
// ============================================================

export interface AuthService {
  signIn(email: string, password: string): Promise<Profile>;
  signUp(email: string, password: string): Promise<{ user: Profile; needsEmailVerification: boolean }>;
  changePassword(newPassword: string): Promise<void>;
  signOut(): Promise<void>;
  getSession(): Promise<Profile | null>;
  onAuthStateChange(callback: (user: Profile | null) => void): () => void;
  resetPasswordForEmail(email: string): Promise<void>;
  updateEmail(newEmail: string): Promise<void>;
}

export interface LeaveService {
  createDraft(employeeId: string, data: LeaveRequestDraft): Promise<LeaveRequest>;
  submitRequest(requestId: string): Promise<LeaveRequest>;
  getMyRequests(employeeId: string, filters?: RequestFilters): Promise<LeaveRequest[]>;
  getRequestById(id: string): Promise<LeaveRequest>;
  cancelRequest(id: string, reason: string): Promise<void>;
  // HR admin
  getAllRequests(filters?: RequestFilters): Promise<LeaveRequest[]>;
  getAllRequestsInRange(dateFrom: string, dateTo: string): Promise<LeaveRequest[]>;
  reassignRequest(id: string, newAssigneeId: string, reason: string): Promise<void>;
  bypassApproval(id: string, reason: string): Promise<void>;
}

export interface LeaveApprovalService {
  getMyPendingApprovals(userId: string, role?: string): Promise<LeaveRequest[]>;
  getChainRequests(userId: string, role: string): Promise<LeaveRequest[]>;
  approveRequest(requestId: string, userId: string, comment?: string): Promise<void>;
  rejectRequest(requestId: string, userId: string, comment: string): Promise<void>;
  determineExcess(requestId: string, userId: string, determination: ExcessDetermination, comment?: string): Promise<void>;
}

export interface BalanceService {
  getEmployeeBalance(employeeId: string): Promise<LeaveBalance[]>;
  getEmergencyCount(employeeId: string): Promise<number>;
  adjustBalance(employeeId: string, leaveType: string, hours: number, reason: string, performedBy: string): Promise<void>;
  getLedger(employeeId: string): Promise<LeaveLedgerEntry[]>;
  getAllLedgerEntries(): Promise<(LeaveLedgerEntry & { employee_name: string; employee_department: string | null; performer_name: string | null })[]>;
}

export interface AttachmentService {
  uploadAttachment(requestId: string, file: { uri: string; name: string; type: string; size: number }, uploadedBy: string): Promise<Attachment>;
  deleteAttachment(attachmentId: number): Promise<void>;
  getAttachments(requestId: string): Promise<Attachment[]>;
}

export interface NotificationService {
  getMyNotifications(userId: string): Promise<AppNotification[]>;
  markAsRead(id: number): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
}

export interface AuditService {
  getRequestHistory(requestId: string): Promise<HistoryEntry[]>;
}

export interface RemapEmpCodeInput {
  old_code: string;
  new_code: string;
}

export interface RemapEmpCodeResult {
  old_code: string;
  new_code: string;
  success: boolean;
  employee_id?: string;
  full_name?: string;
  error?: string;
}

/**
 * One row of the HR "User Activity" report (RPC get_user_activity,
 * migration 044). `last_seen_at` is our own heartbeat — the trustworthy
 * "actually used the app" signal. `last_sign_in_at` comes straight from
 * auth.users and is NULL only when the person has never logged in at
 * all (useful for spotting accounts that were created but never used).
 */
export interface UserActivityRow {
  id: string;
  full_name: string;
  email: string | null;
  emp_code: string | null;
  role: string;
  department: string | null;
  is_active: boolean;
  registration_status: string;
  account_created_at: string;
  last_seen_at: string | null;
  last_sign_in_at: string | null;
}

export interface UserService {
  getProfile(userId: string): Promise<Profile>;
  updateProfile(userId: string, data: Partial<Profile>): Promise<Profile>;
  getEmployees(filters?: EmployeeFilters): Promise<Profile[]>;
  updateEmployeeOrg(employeeId: string, supervisorId: string, managerId: string): Promise<void>;
  /**
   * HR-only. Every profile with its last-active heartbeat and last
   * explicit sign-in, for the User Activity admin screen. Throws
   * "Only HR can view user activity" for non-HR callers.
   */
  getUserActivity(): Promise<UserActivityRow[]>;
  /**
   * Bulk rename emp_codes. One row per (old, new) pair. Validates and
   * applies each rename in sequence; writes one profile_audit_log row
   * per successful rename so HR can trace who/when/what later.
   * Returns per-row results so the UI can surface partial successes.
   */
  remapEmpCodes(remaps: RemapEmpCodeInput[]): Promise<RemapEmpCodeResult[]>;
}

export interface DocumentService {
  // Employee self-service
  getMyDocument(employeeId: string): Promise<EmployeeDocument | null>;
  upsertMyDocument(employeeId: string, data: EmployeeDocumentDraft): Promise<EmployeeDocument>;

  // HR admin
  getDocumentByEmployee(employeeId: string): Promise<EmployeeDocument | null>;
  getAllDocuments(): Promise<EmployeeDocument[]>;
  getExpiringDocuments(withinDays: number): Promise<EmployeeDocument[]>;
  verifyDocument(documentId: string, verifiedBy: string): Promise<EmployeeDocument>;
  updateDocument(documentId: string, data: Partial<EmployeeDocument>): Promise<EmployeeDocument>;

  // Bulk import (Excel/CSV)
  bulkUpsert(rows: Array<{ emp_code: string } & EmployeeDocumentDraft>): Promise<{ success: number; errors: string[] }>;
}

export interface CreateRenewalTaskInput {
  employeeId: string;
  documentId: string;
  documentType: string;
  expiryDate: string;
  assignedToId: string;
  assignedById: string;
  notes?: string;
}

export interface RenewalTaskService {
  createTask(data: CreateRenewalTaskInput): Promise<RenewalTask>;
  createBulkTasks(tasks: CreateRenewalTaskInput[]): Promise<RenewalTask[]>;
  getMyPendingTasks(userId: string): Promise<RenewalTask[]>;
  getAllTasks(filters?: RenewalTaskFilters): Promise<RenewalTask[]>;
  getTaskById(id: string): Promise<RenewalTask>;
  startTask(taskId: string, userId: string): Promise<void>;
  completeTask(taskId: string, userId: string, newExpiryDate: string, comment?: string): Promise<void>;
  cancelTask(taskId: string, userId: string, reason: string): Promise<void>;
  unassignTask(taskId: string, userId: string, reason?: string): Promise<void>;
  getTaskHistory(taskId: string): Promise<RenewalTaskHistory[]>;
  getAllHistory(dateFrom?: string, dateTo?: string): Promise<(RenewalTaskHistory & { task?: RenewalTask })[]>;
}

export interface RegistrationService {
  // Self-registration flow
  submitRegistration(userId: string, data: RegistrationFormData): Promise<Profile>;
  getRegistrationStatus(userId: string): Promise<RegistrationStatus>;

  // HR admin
  getPendingRegistrations(): Promise<PendingRegistration[]>;
  approveRegistration(userId: string, data: ApproveRegistrationData, approvedBy: string): Promise<Profile>;
  rejectRegistration(userId: string, reason: string, rejectedBy: string): Promise<Profile>;

  // HR review-time edits to employee-supplied fields. Each property in
  // `edits` that is non-undefined gets considered for update; the RPC
  // logs each actual change to profile_audit_log. Email changes are
  // separate (see updateRegistrationEmail) because they have to go
  // through auth.admin.updateUserById.
  updateRegistrationFields(userId: string, edits: RegistrationFieldEdits): Promise<Profile>;
  updateRegistrationEmail(userId: string, newEmail: string): Promise<void>;

  // HR invite (legacy single-step; calls Edge Function — kept for backward compat)
  inviteEmployee(data: InviteEmployeeData, invitedBy: string): Promise<void>;

  // HR create-then-invite (new two-step workflow + batch send)
  createEmployee(data: CreateEmployeeData, invitedBy: string): Promise<Profile>;
  sendInvites(profileIds: string[]): Promise<SendInviteResult[]>;

  // Resend the sign-in email to a batch of employees. For active
  // employees this also demotes them to pending_info (the original
  // "force them back through the form" semantic). For any other status
  // it's purely a resend. Inactive rows are rejected unless
  // `allowInactive: true` is passed — the UI sets that flag only after
  // HR confirms in the resend dialog.
  requestProfileVerification(
    profileIds: string[],
    options?: { allowInactive?: boolean },
  ): Promise<RequestProfileVerificationResult[]>;

  /**
   * Sets each selected employee's status to info_rejected (with optional
   * HR comment), inserts an in-app notification, and sends the
   * `info_form_request` email. No password reset — the recipient signs
   * in with their existing credentials and is routed to the form. Used
   * by the "Send Info Form Request" bulk action and the matching Edit
   * Employee radio.
   */
  requestInfoFormUpdate(
    profileIds: string[],
    comment?: string,
  ): Promise<RequestProfileVerificationResult[]>;

  /**
   * Manual one-off warning HR can fire at any time on uncompleted
   * forms. Logs to form_warnings_log (warning_type='manual') and emails
   * a `manual_form_warning` to each recipient with the optional custom
   * message. Does NOT change status.
   */
  sendFormWarning(
    profileIds: string[],
    message?: string,
  ): Promise<RequestProfileVerificationResult[]>;
}

// ============================================================
// TIME TRACKING (Clock In / Clock Out)
// ============================================================

export interface TimeTrackingService {
  clockIn(employeeId: string, notes?: string): Promise<TimeEntry>;
  clockOut(entryId: string, notes?: string): Promise<TimeEntry>;
  getActiveEntry(employeeId: string): Promise<TimeEntry | null>;
  getEntriesByDate(employeeId: string, date: string): Promise<TimeEntry[]>;
  getHistory(employeeId: string, dateFrom: string, dateTo: string): Promise<TimeEntry[]>;
  createManualEntry(employeeId: string, clockIn: string, clockOut: string, notes?: string): Promise<TimeEntry>;
  getWeeklySummary(employeeId: string, weekStart: string): Promise<{ date: string; totalMinutes: number; entries: TimeEntry[] }[]>;
}

// ============================================================
// TIMESHEET SYSTEM (Projects, Weekly Entries, Submissions)
// ============================================================

export interface ProjectService {
  getAll(filters?: ProjectFilters): Promise<Project[]>;
  getById(id: string): Promise<Project>;
  create(data: ProjectDraft, createdBy: string): Promise<Project>;
  update(id: string, data: Partial<ProjectDraft>): Promise<Project>;
  delete(id: string): Promise<void>;
}

export interface SupplierService {
  getAll(): Promise<Supplier[]>;
  getById(id: string): Promise<Supplier>;
  create(data: SupplierDraft): Promise<Supplier>;
  update(id: string, data: Partial<SupplierDraft>): Promise<Supplier>;
  delete(id: string): Promise<void>;
}

export interface TimesheetService {
  // Entries (daily hours)
  getEntriesForWeek(projectId: string, weekStart: string, weekEnd: string): Promise<TimesheetEntry[]>;
  getEntriesForMonth(projectId: string, month: number, year: number): Promise<TimesheetEntry[]>;
  upsertEntry(entry: TimesheetEntryDraft, enteredBy: string): Promise<TimesheetEntry>;
  upsertEntries(entries: TimesheetEntryDraft[], enteredBy: string): Promise<TimesheetEntry[]>;
  deleteEntry(entryId: string): Promise<void>;

  // Submissions (weekly approval batches)
  getSubmissions(filters?: TimesheetFilters): Promise<TimesheetSubmission[]>;
  getSubmissionForWeek(projectId: string, weekStart: string): Promise<TimesheetSubmission | null>;
  submitForApproval(projectId: string, weekStart: string, weekEnd: string, userId: string, userRole: string): Promise<TimesheetSubmission>;
  approve(submissionId: string, userId: string, userRole: string, comment?: string): Promise<TimesheetSubmission>;
  reject(submissionId: string, userId: string, userRole: string, reason: string): Promise<TimesheetSubmission>;

  // Assignments (keeper <-> project)
  getAssignments(projectId?: string): Promise<TimesheetAssignment[]>;
  getMyAssignments(userId: string): Promise<TimesheetAssignment[]>;
  assignKeeper(projectId: string, assignedToId: string, assignedById: string): Promise<TimesheetAssignment>;
  removeAssignment(assignmentId: string): Promise<void>;

  // Compliance
  getComplianceFlags(projectId?: string): Promise<ComplianceFlag[]>;
  resolveFlag(flagId: string, userId: string, note?: string): Promise<void>;

  // History
  getHistory(submissionId: string): Promise<TimesheetHistory[]>;

  // Monthly consolidated (cross-project aggregation)
  getConsolidatedMonth(month: number, year: number): Promise<ConsolidatedMonthEntry[]>;

  // Monthly hour settings
  getMonthlyHourSetting(month: number, year: number): Promise<MonthlyHourSetting | null>;
  upsertMonthlyHourSetting(month: number, year: number, regularHoursLimit: number, setBy: string): Promise<MonthlyHourSetting>;
}

export interface HRPoliciesService {
  // Folders (the navigation tree)
  listFolders(): Promise<HRDocumentFolder[]>;
  createFolder(name: string, parentId: string | null, visibility: HRDocumentVisibility, createdBy: string): Promise<HRDocumentFolder>;
  updateFolder(folderId: string, name: string, visibility: HRDocumentVisibility): Promise<HRDocumentFolder>;
  deleteFolder(folderId: string): Promise<void>;

  // Documents
  listDocuments(includeArchived: boolean): Promise<HRDocument[]>;
  searchDocuments(query: string): Promise<HRDocument[]>;
  getVersions(documentId: string): Promise<HRDocumentVersion[]>;
  updateDocument(documentId: string, draft: HRDocumentDraft): Promise<HRDocument>;

  /** Creates the document (if no documentId) or adds a new version to
   *  an existing one, uploads the file, moves the current-version
   *  pointer, then kicks off text extraction. */
  uploadDocument(params: {
    documentId: string | null;
    draft: HRDocumentDraft;
    file: HRDocUploadFile;
    changeNote: string | null;
    uploadedBy: string;
  }): Promise<HRDocument>;

  archiveDocument(documentId: string, archivedBy: string): Promise<void>;
  reactivateDocument(documentId: string): Promise<void>;

  /** Short-lived signed URL via the hr-document-url edge function.
   *  download=true forces a Save-As of the original file. */
  getFileUrl(versionId: string, download: boolean): Promise<{ url: string; file_name: string; file_type: string }>;
}
