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
