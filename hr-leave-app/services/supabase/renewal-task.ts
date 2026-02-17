import { supabase } from './client';
import type { RenewalTaskService, CreateRenewalTaskInput } from '../types';
import type { RenewalTask, RenewalTaskHistory } from '@/types/models';
import { RenewalTaskStatus, RenewalTaskAction, NotificationType } from '@/types/enums';

function generateTaskNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000); // 5-digit
  return `RT-${year}-${rand}`;
}

const TASK_SELECT =
  '*, employee:profiles!employee_id(id, full_name, role, department), assigned_to:profiles!assigned_to_id(id, full_name, role, department), assigned_by:profiles!assigned_by_id(id, full_name, role, department)';

export const renewalTaskService: RenewalTaskService = {
  async createTask(data) {
    const taskNumber = generateTaskNumber();

    const { data: task, error } = await supabase
      .from('renewal_tasks')
      .insert({
        task_number: taskNumber,
        employee_id: data.employeeId,
        document_id: data.documentId,
        document_type: data.documentType,
        expiry_date: data.expiryDate,
        status: RenewalTaskStatus.Pending,
        assigned_to_id: data.assignedToId,
        assigned_by_id: data.assignedById,
        notes: data.notes || null,
        assigned_at: new Date().toISOString(),
      })
      .select(TASK_SELECT)
      .single();

    if (error) throw new Error(error.message);

    // Get assigner's profile for history
    const { data: assignerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.assignedById)
      .single();

    // Log creation to history
    await supabase.from('renewal_task_history').insert({
      task_id: task.id,
      action: RenewalTaskAction.Created,
      performed_by: data.assignedById,
      performer_role: assignerProfile?.role || 'hr',
      comment: data.notes || null,
      from_status: null,
      to_status: RenewalTaskStatus.Pending,
    });

    // Get employee name for notification
    const { data: empProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', data.employeeId)
      .single();

    // Send notification to assigned HR employee
    await supabase.from('notifications').insert({
      user_id: data.assignedToId,
      type: NotificationType.RenewalTaskAssigned,
      title: 'Document Renewal Task Assigned',
      body: `Renew ${data.documentType} for ${empProfile?.full_name || 'employee'} (${taskNumber}). Expires ${data.expiryDate}.`,
      reference_id: task.id,
    });

    return task as RenewalTask;
  },

  async createBulkTasks(tasks) {
    const results: RenewalTask[] = [];
    for (const taskData of tasks) {
      const task = await this.createTask(taskData);
      results.push(task);
    }
    return results;
  },

  async getMyPendingTasks(userId) {
    const { data, error } = await supabase
      .from('renewal_tasks')
      .select(TASK_SELECT)
      .eq('assigned_to_id', userId)
      .in('status', [RenewalTaskStatus.Pending, RenewalTaskStatus.InProgress])
      .order('assigned_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as RenewalTask[];
  },

  async getAllTasks(filters) {
    let query = supabase
      .from('renewal_tasks')
      .select(TASK_SELECT);

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }
    if (filters?.assigned_to_id) {
      query = query.eq('assigned_to_id', filters.assigned_to_id);
    }
    if (filters?.document_type) {
      query = query.eq('document_type', filters.document_type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as RenewalTask[];
  },

  async getTaskById(id) {
    const { data, error } = await supabase
      .from('renewal_tasks')
      .select(TASK_SELECT)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as RenewalTask;
  },

  async startTask(taskId, userId) {
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from('renewal_tasks')
      .select('status')
      .eq('id', taskId)
      .single();

    if (!existing || existing.status !== RenewalTaskStatus.Pending) {
      throw new Error('Task can only be started from pending status');
    }

    const { error } = await supabase
      .from('renewal_tasks')
      .update({
        status: RenewalTaskStatus.InProgress,
        started_at: now,
        updated_at: now,
      })
      .eq('id', taskId);

    if (error) throw new Error(error.message);
  },

  async completeTask(taskId, userId, newExpiryDate, comment) {
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from('renewal_tasks')
      .select('status, assigned_by_id, task_number, employee_id, document_id, document_type, expiry_date')
      .eq('id', taskId)
      .single();

    if (!existing || (existing.status !== RenewalTaskStatus.Pending && existing.status !== RenewalTaskStatus.InProgress)) {
      throw new Error('Task can only be completed from pending or in-progress status');
    }

    // Map document_type to the correct expiry column in employee_documents
    const expiryFieldMap: Record<string, string> = {
      passport: 'passport_expiry',
      iqama: 'iqama_expiry',
      insurance: 'insurance_expiry',
    };
    const expiryField = expiryFieldMap[existing.document_type];
    if (!expiryField) throw new Error(`Unknown document type: ${existing.document_type}`);

    // Update the employee_documents table with new expiry date
    const { error: docError } = await supabase
      .from('employee_documents')
      .update({
        [expiryField]: newExpiryDate,
        updated_at: now,
      })
      .eq('id', existing.document_id);

    if (docError) throw new Error(docError.message);

    // Mark the renewal task as completed and store the new expiry date
    const { error } = await supabase
      .from('renewal_tasks')
      .update({
        status: RenewalTaskStatus.Completed,
        expiry_date: newExpiryDate,
        completed_at: now,
        updated_at: now,
      })
      .eq('id', taskId);

    if (error) throw new Error(error.message);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', userId)
      .single();

    // Update the existing history row (single record per task) with confirmation details
    await supabase
      .from('renewal_task_history')
      .update({
        to_status: RenewalTaskStatus.Completed,
        completed_by: userId,
        completed_at: now,
        comment: comment || null,
        metadata: {
          document_type: existing.document_type,
          old_expiry: existing.expiry_date,
          new_expiry: newExpiryDate,
          confirmed_by_name: profile?.full_name || 'HR staff',
          confirmed_by_role: profile?.role || 'hr',
        },
      })
      .eq('task_id', taskId);

    // Notify the assigner that task is done
    if (existing.assigned_by_id) {
      const { data: empProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', existing.employee_id)
        .single();

      await supabase.from('notifications').insert({
        user_id: existing.assigned_by_id,
        type: NotificationType.RenewalTaskCompleted,
        title: 'Renewal Task Completed',
        body: `${profile?.full_name || 'HR staff'} renewed ${existing.document_type} for ${empProfile?.full_name || 'employee'} (${existing.task_number}). New expiry: ${newExpiryDate}.`,
        reference_id: taskId,
      });
    }
  },

  async cancelTask(taskId, userId, reason) {
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from('renewal_tasks')
      .select('status')
      .eq('id', taskId)
      .single();

    if (!existing || existing.status === RenewalTaskStatus.Completed || existing.status === RenewalTaskStatus.Cancelled) {
      throw new Error('Task cannot be cancelled from its current status');
    }

    const { error } = await supabase
      .from('renewal_tasks')
      .update({
        status: RenewalTaskStatus.Cancelled,
        updated_at: now,
      })
      .eq('id', taskId);

    if (error) throw new Error(error.message);
  },

  async getTaskHistory(taskId) {
    const { data, error } = await supabase
      .from('renewal_task_history')
      .select('*, performer:profiles!performed_by(id, full_name, role)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as RenewalTaskHistory[];
  },

  async getAllHistory(dateFrom, dateTo) {
    let query = supabase
      .from('renewal_task_history')
      .select(
        '*, performer:profiles!performed_by(id, full_name, role), task:renewal_tasks!task_id(id, task_number, document_type, expiry_date, assigned_at, completed_at, employee_id, employee:profiles!employee_id(id, full_name, role, department), assigned_to:profiles!assigned_to_id(id, full_name))'
      );

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  },
};
