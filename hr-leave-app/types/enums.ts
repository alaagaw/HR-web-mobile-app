// ============================================================
// ENUMS — Single source of truth for all string constants
// ============================================================

export enum Role {
  Employee = 'employee',
  Supervisor = 'supervisor',
  Manager = 'manager',
  HR = 'hr',
  HRDirector = 'hr_director',
}

export enum LeaveType {
  PTO = 'pto',
  Emergency = 'emergency',
  NonPaidTimeOff = 'non_paid_time_off',
}

export enum LeaveStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  PendingSupervisor = 'pending_supervisor',
  PendingManager = 'pending_manager',
  PendingHR = 'pending_hr',
  PendingHRDirector = 'pending_hr_director',
  Approved = 'approved',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
}

export enum HistoryAction {
  Created = 'created',
  Submitted = 'submitted',
  Approved = 'approved',
  Rejected = 'rejected',
  Commented = 'commented',
  Reassigned = 'reassigned',
  Bypassed = 'bypassed',
  Cancelled = 'cancelled',
  AutoApproved = 'auto_approved',
  ExcessDetermined = 'excess_determined',
  AttachmentAdded = 'attachment_added',
  AttachmentRemoved = 'attachment_removed',
  ReturnedForRevision = 'returned_for_revision',
}

export enum ExcessDetermination {
  Pending = 'pending',
  Unpaid = 'unpaid',
  Converted = 'converted',
  PartialReject = 'partial_reject',
}

export enum NotificationType {
  ApprovalNeeded = 'approval_needed',
  RequestApproved = 'request_approved',
  RequestRejected = 'request_rejected',
  RequestCancelled = 'request_cancelled',
  RequestReassigned = 'request_reassigned',
  RequestBypassed = 'request_bypassed',
  ExcessDetermined = 'excess_determined',
  EmergencyAutoApproved = 'emergency_auto_approved',
  RenewalTaskAssigned = 'renewal_task_assigned',
  RenewalTaskCompleted = 'renewal_task_completed',
  // Registration events
  RegistrationSubmitted = 'registration_submitted',
  RegistrationApproved = 'registration_approved',
  RegistrationRejected = 'registration_rejected',
  EmployeeInvited = 'employee_invited',
}

export enum RegistrationStatus {
  EmailUnverified = 'email_unverified',
  PendingInfo = 'pending_info',
  PendingApproval = 'pending_approval',
  Active = 'active',
  Rejected = 'rejected',
}

export enum EmergencyTier {
  Auto = 'auto',
  Manager = 'manager',
  HRDirector = 'hr_director',
  Blocked = 'blocked',
}

export enum LedgerReason {
  Accrual = 'accrual',
  ApprovedDeduction = 'approved_deduction',
  ManualAdjustment = 'manual_adjustment',
  CancellationCredit = 'cancellation_credit',
}

// ============================================================
// RENEWAL TASKS (Document expiry task assignment)
// ============================================================

export enum RenewalTaskStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum RenewalTaskAction {
  Created = 'created',
  Started = 'started',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Reassigned = 'reassigned',
  Unassigned = 'unassigned',
}

// ============================================================
// TIME TRACKING (Clock In / Clock Out)
// ============================================================

export enum TimeEntryType {
  Regular = 'regular',
  Manual = 'manual',
}

export enum TimeEntryStatus {
  Active = 'active',
  Completed = 'completed',
  Edited = 'edited',
  Deleted = 'deleted',
}

// ============================================================
// TIMESHEET SYSTEM (Projects, Weekly Entries, Submissions)
// ============================================================

export enum ProjectStatus {
  Active = 'active',
  Completed = 'completed',
  OnHold = 'on_hold',
  Cancelled = 'cancelled',
}

export enum TimesheetSubmissionStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Approved = 'approved',
  Rejected = 'rejected',
}

export enum ComplianceFlagType {
  MissingEntry = 'missing_entry',
  LateSubmission = 'late_submission',
}

export enum TimesheetAction {
  Created = 'created',
  Submitted = 'submitted',
  Approved = 'approved',
  Rejected = 'rejected',
  Updated = 'updated',
  Imported = 'imported',
}
