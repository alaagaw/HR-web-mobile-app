import { supabase } from './client';
import type {
  ProjectHoursChangeRequest,
  ProjectHoursChangeRequestDraft,
  ProjectHoursChangeHistory,
} from '@/types/models';
import {
  ProjectHoursChangeStatus,
  ProjectHoursChangeAction,
  ProjectHoursChangeScope,
} from '@/types/enums';

/**
 * CRUD + state-machine for project-hours change requests.
 *
 * Status flow (mirrors leave-approval):
 *   pending → approved (by GM / HR Director)
 *   pending → rejected (by GM / HR Director)
 *   pending → cancelled (by requester only)
 *
 * Every mutation writes a project_hours_change_history row so the timeline
 * UI has the full audit (created → approved/rejected/cancelled, plus any
 * commented entries in between).
 *
 * When an approval has scope = 'from_week_forward', the project baseline
 * (projects.regular_hours_per_day) is updated as part of the same call so
 * future entries auto-derive against the new limit. Per-week and
 * retroactive-week scopes do NOT touch the baseline — they only affect
 * entries saved against the specific week.
 */

const SELECT_FIELDS =
  '*, project:projects!project_id(id,project_number,name), requester:profiles!requested_by(id,full_name,role), decider:profiles!decided_by(id,full_name,role)';

export const projectHoursChangeService = {
  async create(
    draft: ProjectHoursChangeRequestDraft,
    requestedBy: string,
    requesterRole: string,
  ): Promise<ProjectHoursChangeRequest> {
    const { data, error } = await supabase
      .from('project_hours_change_requests')
      .insert({
        project_id: draft.project_id,
        scope: draft.scope,
        week_start: draft.week_start,
        current_value: draft.current_value,
        requested_value: draft.requested_value,
        reason: draft.reason ?? null,
        status: ProjectHoursChangeStatus.Pending,
        requested_by: requestedBy,
      })
      .select(SELECT_FIELDS)
      .single();
    if (error) throw new Error(error.message);

    // Audit: "created" event
    await supabase.from('project_hours_change_history').insert({
      request_id: data.id,
      action: ProjectHoursChangeAction.Created,
      performed_by: requestedBy,
      performer_role: requesterRole,
      from_status: null,
      to_status: ProjectHoursChangeStatus.Pending,
      metadata: {
        scope: draft.scope,
        week_start: draft.week_start,
        current_value: draft.current_value,
        requested_value: draft.requested_value,
      },
    });

    return data as ProjectHoursChangeRequest;
  },

  async listPending(): Promise<ProjectHoursChangeRequest[]> {
    const { data, error } = await supabase
      .from('project_hours_change_requests')
      .select(SELECT_FIELDS)
      .eq('status', ProjectHoursChangeStatus.Pending)
      .order('requested_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as ProjectHoursChangeRequest[];
  },

  async listAll(): Promise<ProjectHoursChangeRequest[]> {
    const { data, error } = await supabase
      .from('project_hours_change_requests')
      .select(SELECT_FIELDS)
      .order('requested_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ProjectHoursChangeRequest[];
  },

  async listForProject(projectId: string): Promise<ProjectHoursChangeRequest[]> {
    const { data, error } = await supabase
      .from('project_hours_change_requests')
      .select(SELECT_FIELDS)
      .eq('project_id', projectId)
      .order('requested_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ProjectHoursChangeRequest[];
  },

  async getById(id: string): Promise<ProjectHoursChangeRequest> {
    const { data, error } = await supabase
      .from('project_hours_change_requests')
      .select(SELECT_FIELDS)
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data as ProjectHoursChangeRequest;
  },

  async getHistory(requestId: string): Promise<ProjectHoursChangeHistory[]> {
    const { data, error } = await supabase
      .from('project_hours_change_history')
      .select('*, performer:profiles!performed_by(id,full_name,role)')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as ProjectHoursChangeHistory[];
  },

  async approve(
    requestId: string,
    deciderId: string,
    deciderRole: string,
    comment?: string,
  ): Promise<ProjectHoursChangeRequest> {
    // Read first so we know the scope + requested_value + project_id.
    const current = await this.getById(requestId);
    if (current.status !== ProjectHoursChangeStatus.Pending) {
      throw new Error(`Cannot approve a request in status "${current.status}"`);
    }

    const { data, error } = await supabase
      .from('project_hours_change_requests')
      .update({
        status: ProjectHoursChangeStatus.Approved,
        decided_by: deciderId,
        decided_at: new Date().toISOString(),
        decision_comment: comment ?? null,
      })
      .eq('id', requestId)
      .eq('status', ProjectHoursChangeStatus.Pending) // Optimistic guard
      .select(SELECT_FIELDS)
      .single();
    if (error) throw new Error(error.message);

    // Audit
    await supabase.from('project_hours_change_history').insert({
      request_id: requestId,
      action: ProjectHoursChangeAction.Approved,
      performed_by: deciderId,
      performer_role: deciderRole,
      comment: comment ?? null,
      from_status: ProjectHoursChangeStatus.Pending,
      to_status: ProjectHoursChangeStatus.Approved,
      metadata: { requested_value: current.requested_value },
    });

    // Apply: from_week_forward updates the project baseline so all future
    // entries auto-derive against the new limit. Other scopes leave the
    // baseline alone — they only matter when the timesheet keeper saves
    // entries for the specific affected week.
    if (current.scope === ProjectHoursChangeScope.FromWeekForward) {
      const { error: pErr } = await supabase
        .from('projects')
        .update({
          regular_hours_per_day: current.requested_value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', current.project_id);
      if (pErr) throw new Error(pErr.message);
    }

    return data as ProjectHoursChangeRequest;
  },

  async reject(
    requestId: string,
    deciderId: string,
    deciderRole: string,
    comment?: string,
  ): Promise<ProjectHoursChangeRequest> {
    const current = await this.getById(requestId);
    if (current.status !== ProjectHoursChangeStatus.Pending) {
      throw new Error(`Cannot reject a request in status "${current.status}"`);
    }

    const { data, error } = await supabase
      .from('project_hours_change_requests')
      .update({
        status: ProjectHoursChangeStatus.Rejected,
        decided_by: deciderId,
        decided_at: new Date().toISOString(),
        decision_comment: comment ?? null,
      })
      .eq('id', requestId)
      .eq('status', ProjectHoursChangeStatus.Pending)
      .select(SELECT_FIELDS)
      .single();
    if (error) throw new Error(error.message);

    await supabase.from('project_hours_change_history').insert({
      request_id: requestId,
      action: ProjectHoursChangeAction.Rejected,
      performed_by: deciderId,
      performer_role: deciderRole,
      comment: comment ?? null,
      from_status: ProjectHoursChangeStatus.Pending,
      to_status: ProjectHoursChangeStatus.Rejected,
    });

    return data as ProjectHoursChangeRequest;
  },

  async cancel(
    requestId: string,
    requesterId: string,
    requesterRole: string,
    comment?: string,
  ): Promise<ProjectHoursChangeRequest> {
    const current = await this.getById(requestId);
    if (current.status !== ProjectHoursChangeStatus.Pending) {
      throw new Error(`Cannot cancel a request in status "${current.status}"`);
    }
    if (current.requested_by !== requesterId) {
      throw new Error('Only the requester can cancel this request');
    }

    const { data, error } = await supabase
      .from('project_hours_change_requests')
      .update({
        status: ProjectHoursChangeStatus.Cancelled,
        decided_by: requesterId,
        decided_at: new Date().toISOString(),
        decision_comment: comment ?? null,
      })
      .eq('id', requestId)
      .eq('status', ProjectHoursChangeStatus.Pending)
      .select(SELECT_FIELDS)
      .single();
    if (error) throw new Error(error.message);

    await supabase.from('project_hours_change_history').insert({
      request_id: requestId,
      action: ProjectHoursChangeAction.Cancelled,
      performed_by: requesterId,
      performer_role: requesterRole,
      comment: comment ?? null,
      from_status: ProjectHoursChangeStatus.Pending,
      to_status: ProjectHoursChangeStatus.Cancelled,
    });

    return data as ProjectHoursChangeRequest;
  },
};
