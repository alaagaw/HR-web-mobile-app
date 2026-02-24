import { LeaveStatus, LeaveType, EmergencyTier, Role } from '@/types/enums';

// ============================================================
// STATE MACHINE — All approval workflow transitions
// ============================================================

interface TransitionResult {
  nextStatus: LeaveStatus;
  nextAssigneeRole: Role | null; // null = no assignee (terminal state)
}

/**
 * Determine the next status after an approval action.
 * This is the heart of the approval routing logic.
 *
 * Note: Some status combinations (e.g. Emergency #2 at PendingHR) occur when
 * higher-role employees submit their own requests and earlier steps are skipped.
 */
export function getNextApprovalStatus(
  currentStatus: LeaveStatus,
  leaveType: LeaveType,
  emergencyNumber: number | null
): TransitionResult {
  // PTO / Non-Paid flow: Supervisor → Manager → HR → Approved
  // HR employees skip to PendingHRDirector, so we handle that too.
  if (leaveType === LeaveType.PTO || leaveType === LeaveType.NonPaidTimeOff) {
    switch (currentStatus) {
      case LeaveStatus.PendingSupervisor:
        return { nextStatus: LeaveStatus.PendingManager, nextAssigneeRole: Role.Manager };
      case LeaveStatus.PendingManager:
        return { nextStatus: LeaveStatus.PendingHR, nextAssigneeRole: Role.HR };
      case LeaveStatus.PendingHR:
        return { nextStatus: LeaveStatus.Approved, nextAssigneeRole: null };
      case LeaveStatus.PendingHRDirector:
        // HR employee's PTO — HR Director is the final step
        return { nextStatus: LeaveStatus.Approved, nextAssigneeRole: null };
      default:
        throw new Error(`Invalid PTO approval from status: ${currentStatus}`);
    }
  }

  // Emergency flow: depends on emergency number
  if (leaveType === LeaveType.Emergency) {
    // Emergency #2: normally Manager → Approved
    // If manager/HR submitted, it starts at a higher step — all resolve to Approved.
    if (emergencyNumber === 2) {
      switch (currentStatus) {
        case LeaveStatus.PendingManager:
        case LeaveStatus.PendingHR:
        case LeaveStatus.PendingHRDirector:
          return { nextStatus: LeaveStatus.Approved, nextAssigneeRole: null };
        default:
          throw new Error(`Invalid Emergency #2 approval from status: ${currentStatus}`);
      }
    }

    // Emergency #3: normally Manager → HR Director → Approved
    if (emergencyNumber === 3) {
      switch (currentStatus) {
        case LeaveStatus.PendingManager:
          return { nextStatus: LeaveStatus.PendingHRDirector, nextAssigneeRole: Role.HRDirector };
        case LeaveStatus.PendingHR:
          // HR Director submitted — HR reviews, then done
          return { nextStatus: LeaveStatus.Approved, nextAssigneeRole: null };
        case LeaveStatus.PendingHRDirector:
          return { nextStatus: LeaveStatus.Approved, nextAssigneeRole: null };
        default:
          throw new Error(`Invalid Emergency #3 approval from status: ${currentStatus}`);
      }
    }
  }

  throw new Error(`Unhandled transition: ${currentStatus}, type=${leaveType}, emergency#=${emergencyNumber}`);
}

/**
 * Determine the first status after submission, based on type, emergency tier,
 * and the employee's role (to skip steps at or below their own level).
 *
 * Rule: You can't approve your own level. A Supervisor skips the Supervisor
 * step, a Manager skips Supervisor + Manager, etc.
 */
export function getInitialRoutingStatus(
  leaveType: LeaveType,
  emergencyTier: EmergencyTier | null,
  employeeRole?: Role
): TransitionResult {
  // PTO / Non-Paid routing — skip steps at or below the employee's role
  if (leaveType === LeaveType.PTO || leaveType === LeaveType.NonPaidTimeOff) {
    switch (employeeRole) {
      case Role.Supervisor:
        return { nextStatus: LeaveStatus.PendingManager, nextAssigneeRole: Role.Manager };
      case Role.Manager:
        return { nextStatus: LeaveStatus.PendingHR, nextAssigneeRole: Role.HR };
      case Role.HR:
        return { nextStatus: LeaveStatus.PendingHRDirector, nextAssigneeRole: Role.HRDirector };
      case Role.HRDirector:
        // HR Director's PTO reviewed by HR (cross-check by subordinate)
        return { nextStatus: LeaveStatus.PendingHR, nextAssigneeRole: Role.HR };
      default:
        // Regular employee: start from supervisor
        return { nextStatus: LeaveStatus.PendingSupervisor, nextAssigneeRole: Role.Supervisor };
    }
  }

  // Emergency routing based on tier + employee role
  switch (emergencyTier) {
    case EmergencyTier.Auto:
      // 1st emergency: auto-approved for everyone
      return { nextStatus: LeaveStatus.Approved, nextAssigneeRole: null };

    case EmergencyTier.Manager:
      // 2nd emergency: normally manager approval only
      if (employeeRole === Role.Manager) {
        return { nextStatus: LeaveStatus.PendingHR, nextAssigneeRole: Role.HR };
      }
      if (employeeRole === Role.HR || employeeRole === Role.HRDirector) {
        return { nextStatus: LeaveStatus.PendingHRDirector, nextAssigneeRole: Role.HRDirector };
      }
      return { nextStatus: LeaveStatus.PendingManager, nextAssigneeRole: Role.Manager };

    case EmergencyTier.HRDirector:
      // 3rd emergency: normally manager → HR Director
      if (employeeRole === Role.Manager) {
        // Manager skips own step → straight to HR Director
        return { nextStatus: LeaveStatus.PendingHRDirector, nextAssigneeRole: Role.HRDirector };
      }
      if (employeeRole === Role.HR) {
        return { nextStatus: LeaveStatus.PendingHRDirector, nextAssigneeRole: Role.HRDirector };
      }
      if (employeeRole === Role.HRDirector) {
        // HR Director's emergency reviewed by HR
        return { nextStatus: LeaveStatus.PendingHR, nextAssigneeRole: Role.HR };
      }
      return { nextStatus: LeaveStatus.PendingManager, nextAssigneeRole: Role.Manager };

    default:
      throw new Error(`Cannot route emergency with tier: ${emergencyTier}`);
  }
}

/**
 * Determine emergency tier from the count of emergencies in the rolling window.
 */
export function getEmergencyTier(existingCount: number): EmergencyTier {
  if (existingCount === 0) return EmergencyTier.Auto;        // Will be #1
  if (existingCount === 1) return EmergencyTier.Manager;     // Will be #2
  if (existingCount === 2) return EmergencyTier.HRDirector;  // Will be #3
  return EmergencyTier.Blocked;                               // 3+ already
}

/**
 * Check if a transition is valid (guards against invalid state changes).
 */
export function canTransition(
  currentStatus: LeaveStatus,
  action: 'approve' | 'reject' | 'cancel' | 'bypass',
  userRole: Role
): boolean {
  const pendingStatuses = [
    LeaveStatus.PendingSupervisor,
    LeaveStatus.PendingManager,
    LeaveStatus.PendingHR,
    LeaveStatus.PendingHRDirector,
  ];

  switch (action) {
    case 'approve':
    case 'reject':
      // Must be in a pending state
      if (!pendingStatuses.includes(currentStatus)) return false;
      // Must be the right role for the current step
      return isRoleAuthorizedForStatus(currentStatus, userRole);

    case 'cancel':
      // Can cancel if not yet fully approved/rejected
      return ![LeaveStatus.Approved, LeaveStatus.Rejected, LeaveStatus.Cancelled].includes(currentStatus);

    case 'bypass':
      // Only HR can bypass, and only on pending statuses
      return (userRole === Role.HR || userRole === Role.HRDirector) && pendingStatuses.includes(currentStatus);

    default:
      return false;
  }
}

/**
 * Check if a user's role matches the expected role for the current pending status.
 */
function isRoleAuthorizedForStatus(status: LeaveStatus, role: Role): boolean {
  switch (status) {
    case LeaveStatus.PendingSupervisor:
      return role === Role.Supervisor || role === Role.HR || role === Role.HRDirector;
    case LeaveStatus.PendingManager:
      return role === Role.Manager || role === Role.HR || role === Role.HRDirector;
    case LeaveStatus.PendingHR:
      return role === Role.HR || role === Role.HRDirector;
    case LeaveStatus.PendingHRDirector:
      return role === Role.HRDirector;
    default:
      return false;
  }
}

/**
 * Get the remaining approval steps from the current status to approved.
 * Returns role labels like ["Manager", "HR"] for a PTO request at pending_supervisor.
 * Handles role-skipped scenarios (e.g. HR employee's PTO at PendingHRDirector).
 */
export function getRemainingApprovalSteps(
  status: LeaveStatus,
  leaveType: LeaveType,
  emergencyNumber: number | null
): string[] {
  const pendingStatuses = [
    LeaveStatus.PendingSupervisor,
    LeaveStatus.PendingManager,
    LeaveStatus.PendingHR,
    LeaveStatus.PendingHRDirector,
  ];

  if (!pendingStatuses.includes(status)) return [];

  if (leaveType === LeaveType.PTO || leaveType === LeaveType.NonPaidTimeOff) {
    switch (status) {
      case LeaveStatus.PendingSupervisor:
        return ['Supervisor', 'Manager', 'HR'];
      case LeaveStatus.PendingManager:
        return ['Manager', 'HR'];
      case LeaveStatus.PendingHR:
        return ['HR'];
      case LeaveStatus.PendingHRDirector:
        return ['HR Director'];
      default:
        return [];
    }
  }

  if (leaveType === LeaveType.Emergency) {
    if (emergencyNumber === 2) {
      switch (status) {
        case LeaveStatus.PendingManager:
          return ['Manager'];
        case LeaveStatus.PendingHR:
          return ['HR'];
        case LeaveStatus.PendingHRDirector:
          return ['HR Director'];
        default:
          return [];
      }
    }
    if (emergencyNumber === 3) {
      switch (status) {
        case LeaveStatus.PendingManager:
          return ['Manager', 'HR Director'];
        case LeaveStatus.PendingHR:
          return ['HR'];
        case LeaveStatus.PendingHRDirector:
          return ['HR Director'];
        default:
          return [];
      }
    }
  }

  return [];
}

/**
 * Get a human-readable label for a leave status.
 */
export function getStatusLabel(status: LeaveStatus): string {
  const labels: Record<LeaveStatus, string> = {
    [LeaveStatus.Draft]: 'Draft',
    [LeaveStatus.Submitted]: 'Submitted',
    [LeaveStatus.PendingSupervisor]: 'Pending Supervisor',
    [LeaveStatus.PendingManager]: 'Pending Manager',
    [LeaveStatus.PendingHR]: 'Pending HR',
    [LeaveStatus.PendingHRDirector]: 'Pending HR Director',
    [LeaveStatus.Approved]: 'Approved',
    [LeaveStatus.Rejected]: 'Rejected',
    [LeaveStatus.Cancelled]: 'Cancelled',
  };
  return labels[status];
}

/**
 * Get a human-readable label for a leave type.
 */
export function getLeaveTypeLabel(leaveType: LeaveType | string): string {
  switch (leaveType) {
    case LeaveType.PTO: return 'PTO';
    case LeaveType.Emergency: return 'Emergency';
    case LeaveType.NonPaidTimeOff: return 'Non-Paid';
    default: return String(leaveType);
  }
}

/**
 * Get badge color variant for a leave type.
 */
export function getLeaveTypeVariant(leaveType: LeaveType | string): 'error' | 'info' | 'warning' | 'default' {
  switch (leaveType) {
    case LeaveType.Emergency: return 'error';
    case LeaveType.PTO: return 'info';
    case LeaveType.NonPaidTimeOff: return 'warning';
    default: return 'default';
  }
}

/**
 * Get MUI Chip color for a leave type.
 */
export function getLeaveTypeMuiColor(leaveType: LeaveType | string): 'error' | 'info' | 'warning' | 'default' {
  switch (leaveType) {
    case LeaveType.Emergency: return 'error';
    case LeaveType.PTO: return 'info';
    case LeaveType.NonPaidTimeOff: return 'warning';
    default: return 'default';
  }
}

/**
 * Whether a leave type is unpaid (no balance deduction).
 */
export function isUnpaidLeaveType(leaveType: LeaveType | string): boolean {
  return leaveType === LeaveType.Emergency || leaveType === LeaveType.NonPaidTimeOff;
}

/**
 * Get badge color variant for a status.
 */
export function getStatusVariant(status: LeaveStatus): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case LeaveStatus.Approved:
      return 'success';
    case LeaveStatus.Rejected:
    case LeaveStatus.Cancelled:
      return 'error';
    case LeaveStatus.PendingSupervisor:
    case LeaveStatus.PendingManager:
    case LeaveStatus.PendingHR:
    case LeaveStatus.PendingHRDirector:
      return 'warning';
    default:
      return 'default';
  }
}
