import {
  Role,
  LeaveType,
  LeaveStatus,
  HistoryAction,
  ExcessDetermination,
  NotificationType,
  LedgerReason,
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
  workday_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileSummary {
  id: string;
  full_name: string;
  role: Role;
  department: string | null;
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
