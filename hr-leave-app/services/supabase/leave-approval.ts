import { supabase } from './client';
import type { LeaveApprovalService } from '../types';
import type { LeaveRequest } from '@/types/models';
import { LeaveStatus, LeaveType, HistoryAction, ExcessDetermination, Role } from '@/types/enums';
import { getNextApprovalStatus } from '@/lib/state-machine';

export const leaveApprovalService: LeaveApprovalService = {
  async getMyPendingApprovals(userId, role?) {
    const isHR = role === Role.HR || role === Role.HRDirector;

    if (isHR) {
      // HR users see: requests assigned directly to them
      // PLUS unassigned requests at the HR step matching their role
      const hrStatus = role === Role.HRDirector
        ? LeaveStatus.PendingHRDirector
        : LeaveStatus.PendingHR;

      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, employee:profiles!employee_id(id, full_name, role, department)')
        .or(`current_assignee_id.eq.${userId},and(current_assignee_id.is.null,status.eq.${hrStatus})`)
        .in('status', [
          LeaveStatus.PendingSupervisor,
          LeaveStatus.PendingManager,
          LeaveStatus.PendingHR,
          LeaveStatus.PendingHRDirector,
        ])
        .order('pending_since', { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as LeaveRequest[];
    }

    // Supervisor/Manager: only see what is assigned to them
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*, employee:profiles!employee_id(id, full_name, role, department)')
      .eq('current_assignee_id', userId)
      .in('status', [
        LeaveStatus.PendingSupervisor,
        LeaveStatus.PendingManager,
        LeaveStatus.PendingHR,
        LeaveStatus.PendingHRDirector,
      ])
      .order('pending_since', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as LeaveRequest[];
  },

  async getChainRequests(userId, role) {
    const selectFields =
      '*, employee:profiles!employee_id(id, full_name, role, department), current_assignee:profiles!current_assignee_id(id, full_name, role)';

    let query = supabase
      .from('leave_requests')
      .select(selectFields)
      .not('status', 'in', `(${LeaveStatus.Draft},${LeaveStatus.Cancelled})`);

    if (role === Role.Supervisor) {
      // Supervisor sees requests from their direct reports
      const { data: reports } = await supabase
        .from('profiles')
        .select('id')
        .eq('supervisor_id', userId);
      const reportIds = (reports ?? []).map((r) => r.id);
      if (reportIds.length === 0) return [];
      query = query.in('employee_id', reportIds);
    } else if (role === Role.Manager) {
      // Manager sees requests from employees in their department
      const { data: reports } = await supabase
        .from('profiles')
        .select('id')
        .eq('manager_id', userId);
      const reportIds = (reports ?? []).map((r) => r.id);
      if (reportIds.length === 0) return [];
      query = query.in('employee_id', reportIds);
    }
    // HR and HR Director see all requests (no filter needed)

    const { data, error } = await query
      .order('pending_since', { ascending: true, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as LeaveRequest[];
  },

  async approveRequest(requestId, userId, comment) {
    const { data: request, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*, employee:profiles!employee_id(id, supervisor_id, manager_id)')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) throw new Error('Request not found');

    // Determine next status
    const { nextStatus, nextAssigneeRole } = getNextApprovalStatus(
      request.status as LeaveStatus,
      request.leave_type as LeaveType,
      request.emergency_number
    );

    // Find next assignee
    let nextAssigneeId: string | null = null;
    if (nextAssigneeRole === 'manager') {
      nextAssigneeId = request.employee.manager_id;
    } else if (nextAssigneeRole === 'hr' || nextAssigneeRole === 'hr_director') {
      // HR steps: leave unassigned so ALL HR users see it (claim-by-acting model)
      nextAssigneeId = null;
    }

    const now = new Date().toISOString();
    const isTerminal = nextStatus === LeaveStatus.Approved;

    // Update request with optimistic locking
    const { data: updateResult, error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: nextStatus,
        current_assignee_id: isTerminal ? null : nextAssigneeId,
        current_assignee_role: isTerminal ? null : nextAssigneeRole,
        pending_since: isTerminal ? null : now,
        resolved_at: isTerminal ? now : null,
        excess_determination: isTerminal && request.has_excess ? ExcessDetermination.Pending : request.excess_determination,
        updated_at: now,
      })
      .eq('id', requestId)
      .eq('status', request.status)         // Optimistic lock: must still be at expected status
      .eq('updated_at', request.updated_at)  // Double guard: no other writes since we read
      .select();

    if (updateError) throw new Error(updateError.message);
    if (!updateResult || updateResult.length === 0) {
      throw new Error('ALREADY_HANDLED: This request has already been processed by another user. Please refresh to see the latest status.');
    }

    // Log history
    await supabase.from('leave_request_history').insert({
      request_id: requestId,
      action: HistoryAction.Approved,
      performed_by: userId,
      performer_role: request.current_assignee_role,
      comment,
      from_status: request.status,
      to_status: nextStatus,
    });

    // If approved, deduct balance
    if (isTerminal) {
      await supabase.rpc('deduct_leave_balance', {
        p_employee_id: request.employee_id,
        p_leave_type: request.leave_type,
        p_hours: request.paid_hours,
        p_request_id: requestId,
        p_performed_by: userId,
      });

      // Notify employee
      await supabase.from('notifications').insert({
        user_id: request.employee_id,
        type: 'request_approved',
        title: 'Leave Request Approved',
        body: `Your request ${request.case_number} has been approved.`,
        reference_id: requestId,
      });
    }

    // Notify next assignee(s) if not terminal
    if (!isTerminal) {
      if (nextAssigneeId) {
        // Specific assignee (supervisor/manager)
        await supabase.from('notifications').insert({
          user_id: nextAssigneeId,
          type: 'approval_needed',
          title: 'Leave Request Pending Your Approval',
          body: `${request.case_number} requires your review.`,
          reference_id: requestId,
        });
      } else if (nextAssigneeRole === Role.HR || nextAssigneeRole === Role.HRDirector) {
        // HR steps: notify ALL active HR users of that role
        const { data: hrUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', nextAssigneeRole)
          .eq('is_active', true);

        if (hrUsers && hrUsers.length > 0) {
          await supabase.from('notifications').insert(
            hrUsers.map((u) => ({
              user_id: u.id,
              type: 'approval_needed',
              title: 'Leave Request Pending Your Approval',
              body: `${request.case_number} requires your review.`,
              reference_id: requestId,
            }))
          );
        }
      }
    }
  },

  async rejectRequest(requestId, userId, comment) {
    const { data: request } = await supabase
      .from('leave_requests')
      .select('status, employee_id, case_number, current_assignee_role, updated_at')
      .eq('id', requestId)
      .single();

    if (!request) throw new Error('Request not found');

    const now = new Date().toISOString();
    const { data: updateResult, error } = await supabase
      .from('leave_requests')
      .update({
        status: LeaveStatus.Rejected,
        current_assignee_id: null,
        current_assignee_role: null,
        resolved_at: now,
        updated_at: now,
      })
      .eq('id', requestId)
      .eq('status', request.status)         // Optimistic lock
      .eq('updated_at', request.updated_at)  // Double guard
      .select();

    if (error) throw new Error(error.message);
    if (!updateResult || updateResult.length === 0) {
      throw new Error('ALREADY_HANDLED: This request has already been processed by another user. Please refresh to see the latest status.');
    }

    await supabase.from('leave_request_history').insert({
      request_id: requestId,
      action: HistoryAction.Rejected,
      performed_by: userId,
      performer_role: request.current_assignee_role,
      comment,
      from_status: request.status,
      to_status: LeaveStatus.Rejected,
    });

    // Notify employee
    await supabase.from('notifications').insert({
      user_id: request.employee_id,
      type: 'request_rejected',
      title: 'Leave Request Rejected',
      body: `Your request ${request.case_number} has been rejected.`,
      reference_id: requestId,
    });
  },

  async determineExcess(requestId, userId, determination, comment) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('leave_requests')
      .update({
        excess_determination: determination,
        excess_determined_by: userId,
        excess_determined_at: now,
        updated_at: now,
      })
      .eq('id', requestId);

    if (error) throw new Error(error.message);

    await supabase.from('leave_request_history').insert({
      request_id: requestId,
      action: HistoryAction.ExcessDetermined,
      performed_by: userId,
      performer_role: 'hr',
      comment,
      metadata: { determination },
    });
  },
};
