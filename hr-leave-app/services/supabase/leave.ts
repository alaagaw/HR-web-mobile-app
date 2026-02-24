import { supabase } from './client';
import type { LeaveService } from '../types';
import type { LeaveRequest, LeaveRequestDraft, RequestFilters } from '@/types/models';
import { LeaveStatus, LeaveType, HistoryAction, Role } from '@/types/enums';
import {
  getEmergencyTier,
  getInitialRoutingStatus,
  isUnpaidLeaveType,
} from '@/lib/state-machine';
import { computeRequestedHours, computeBalanceImpact } from '@/lib/hours-calculator';
import { DEFAULT_WORKDAY_HOURS } from '@/lib/constants';

export const leaveService: LeaveService = {
  async createDraft(employeeId, data) {
    // Fetch employee profile for workday_hours
    const { data: profile } = await supabase
      .from('profiles')
      .select('workday_hours')
      .eq('id', employeeId)
      .single();

    const workdayHours = profile?.workday_hours ?? DEFAULT_WORKDAY_HOURS;

    // Compute hours
    const hoursResult = computeRequestedHours({
      ...data,
      workday_hours: workdayHours,
    });

    // Unpaid leave types (Emergency, Non-Paid) don't deduct from balance
    const unpaid = isUnpaidLeaveType(data.leave_type);

    let impact;
    if (unpaid) {
      impact = { paid_hours: 0, excess_hours: 0, has_excess: false };
    } else {
      const { data: balance } = await supabase
        .from('leave_balances')
        .select('balance_hours')
        .eq('employee_id', employeeId)
        .eq('leave_type', data.leave_type)
        .eq('year', new Date().getFullYear())
        .single();

      const availableHours = balance?.balance_hours ?? 0;
      impact = computeBalanceImpact(availableHours, hoursResult.requested_hours, workdayHours);
    }

    const { data: request, error } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: employeeId,
        leave_type: data.leave_type,
        start_date: data.start_date,
        end_date: data.end_date,
        start_time: data.start_time,
        end_time: data.end_time,
        include_weekends: data.include_weekends,
        requested_hours: hoursResult.requested_hours,
        paid_hours: impact.paid_hours,
        excess_hours: impact.excess_hours,
        has_excess: impact.has_excess,
        is_emergency: data.leave_type === LeaveType.Emergency,
        emergency_reason: data.emergency_reason,
        employee_comment: data.employee_comment,
        status: LeaveStatus.Draft,
        case_number: `LR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create draft: ${error.message}`);

    // Log history
    await supabase.from('leave_request_history').insert({
      request_id: request.id,
      action: HistoryAction.Created,
      performed_by: employeeId,
      performer_role: 'employee',
      from_status: null,
      to_status: LeaveStatus.Draft,
    });

    return request as LeaveRequest;
  },

  async submitRequest(requestId) {
    // Fetch the draft request
    const { data: request, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*, employee:profiles!employee_id(id, role, supervisor_id, manager_id)')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) throw new Error('Request not found');

    const employee = request.employee;
    let emergencyNumber: number | null = null;

    // Determine emergency tier if emergency type
    if (request.is_emergency) {
      const { count } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', request.employee_id)
        .eq('is_emergency', true)
        .not('status', 'in', `(${LeaveStatus.Rejected},${LeaveStatus.Cancelled})`)
        .gte('submitted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const existingCount = count ?? 0;
      const tier = getEmergencyTier(existingCount);

      if (tier === 'blocked') {
        throw new Error('You have reached the maximum of 3 emergency leaves this month.');
      }

      emergencyNumber = existingCount + 1;
    }

    // Determine routing (pass employee role to skip steps at their own level)
    const tier = request.is_emergency ? getEmergencyTier((emergencyNumber ?? 1) - 1) : null;
    const routing = getInitialRoutingStatus(request.leave_type as LeaveType, tier, employee.role as Role);

    // Find assignee based on role
    let assigneeId: string | null = null;
    if (routing.nextAssigneeRole === 'supervisor') {
      assigneeId = employee.supervisor_id;
    } else if (routing.nextAssigneeRole === 'manager') {
      assigneeId = employee.manager_id;
    } else if (routing.nextAssigneeRole === 'hr' || routing.nextAssigneeRole === 'hr_director') {
      // HR steps: leave unassigned so ALL HR users see it (claim-by-acting model)
      assigneeId = null;
    }

    const now = new Date().toISOString();

    // Update request
    const { data: updated, error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: routing.nextStatus,
        current_assignee_id: assigneeId,
        current_assignee_role: routing.nextAssigneeRole,
        emergency_number: emergencyNumber,
        submitted_at: now,
        pending_since: routing.nextStatus === LeaveStatus.Approved ? null : now,
        resolved_at: routing.nextStatus === LeaveStatus.Approved ? now : null,
        updated_at: now,
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to submit: ${updateError.message}`);

    // Log history
    const action = routing.nextStatus === LeaveStatus.Approved
      ? HistoryAction.AutoApproved
      : HistoryAction.Submitted;

    await supabase.from('leave_request_history').insert({
      request_id: requestId,
      action,
      performed_by: request.employee_id,
      performer_role: 'employee',
      from_status: LeaveStatus.Draft,
      to_status: routing.nextStatus,
      metadata: emergencyNumber ? { emergency_number: emergencyNumber } : null,
    });

    // Create notification for assignee(s)
    if (assigneeId) {
      // Specific assignee (supervisor/manager)
      await supabase.from('notifications').insert({
        user_id: assigneeId,
        type: 'approval_needed',
        title: 'Leave Request Pending Your Approval',
        body: `${request.case_number} requires your review.`,
        reference_id: requestId,
      });
    } else if (routing.nextAssigneeRole === 'hr' || routing.nextAssigneeRole === 'hr_director') {
      // HR steps: notify ALL active HR users of that role
      const { data: hrUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', routing.nextAssigneeRole)
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

    return updated as LeaveRequest;
  },

  async getMyRequests(employeeId, filters) {
    let query = supabase
      .from('leave_requests')
      .select('*, employee:profiles!employee_id(id, full_name, role, department), current_assignee:profiles!current_assignee_id(id, full_name, role)')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }
    if (filters?.leave_type) {
      query = query.eq('leave_type', filters.leave_type);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as LeaveRequest[];
  },

  async getRequestById(id) {
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        employee:profiles!employee_id(id, full_name, role, department),
        current_assignee:profiles!current_assignee_id(id, full_name, role),
        attachments:leave_attachments(*),
        history:leave_request_history(*, performer:profiles!performed_by(id, full_name, role))
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as LeaveRequest;
  },

  async cancelRequest(id, reason) {
    const { data: request } = await supabase
      .from('leave_requests')
      .select('status, employee_id')
      .eq('id', id)
      .single();

    if (!request) throw new Error('Request not found');

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: LeaveStatus.Cancelled,
        current_assignee_id: null,
        current_assignee_role: null,
        resolved_at: now,
        updated_at: now,
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    await supabase.from('leave_request_history').insert({
      request_id: id,
      action: HistoryAction.Cancelled,
      performed_by: request.employee_id,
      performer_role: 'employee',
      comment: reason,
      from_status: request.status,
      to_status: LeaveStatus.Cancelled,
    });
  },

  async getAllRequests(filters) {
    let query = supabase
      .from('leave_requests')
      .select('*, employee:profiles!employee_id(id, full_name, role, department), current_assignee:profiles!current_assignee_id(id, full_name, role)')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }
    if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id);
    if (filters?.leave_type) query = query.eq('leave_type', filters.leave_type);
    if (filters?.department) query = query.eq('employee.department', filters.department);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as LeaveRequest[];
  },

  async getAllRequestsInRange(dateFrom, dateTo) {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*, employee:profiles!employee_id(id, full_name, role, department), current_assignee:profiles!current_assignee_id(id, full_name, role)')
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);
    return (data ?? []) as LeaveRequest[];
  },

  async reassignRequest(id, newAssigneeId, reason) {
    const { data: request } = await supabase
      .from('leave_requests')
      .select('current_assignee_id, status')
      .eq('id', id)
      .single();

    if (!request) throw new Error('Request not found');

    const { data: newAssignee } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', newAssigneeId)
      .single();

    const { error } = await supabase
      .from('leave_requests')
      .update({
        current_assignee_id: newAssigneeId,
        current_assignee_role: newAssignee?.role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    await supabase.from('leave_request_history').insert({
      request_id: id,
      action: HistoryAction.Reassigned,
      performed_by: newAssigneeId,
      performer_role: 'hr',
      comment: reason,
      from_status: request.status,
      to_status: request.status,
      metadata: {
        old_assignee_id: request.current_assignee_id,
        new_assignee_id: newAssigneeId,
      },
    });
  },

  async bypassApproval(id, reason) {
    const { data: request } = await supabase
      .from('leave_requests')
      .select('status, employee_id')
      .eq('id', id)
      .single();

    if (!request) throw new Error('Request not found');

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: LeaveStatus.Approved,
        current_assignee_id: null,
        current_assignee_role: null,
        resolved_at: now,
        updated_at: now,
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    await supabase.from('leave_request_history').insert({
      request_id: id,
      action: HistoryAction.Bypassed,
      performed_by: request.employee_id, // Will be overridden by the caller
      performer_role: 'hr',
      comment: reason,
      from_status: request.status,
      to_status: LeaveStatus.Approved,
    });
  },
};
