import { useState, useCallback } from 'react';
import { timesheetService } from '@/services';
import type {
  TimesheetEntry,
  TimesheetEntryDraft,
  TimesheetSubmission,
  TimesheetAssignment,
  ComplianceFlag,
  TimesheetFilters,
} from '@/types/models';

export function useTimesheets() {
  // ── Entries state ──────────────────────────────────────────
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  // ── Submissions state ──────────────────────────────────────
  const [submissions, setSubmissions] = useState<TimesheetSubmission[]>([]);
  const [currentSubmission, setCurrentSubmission] = useState<TimesheetSubmission | null>(null);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

  // ── Assignments state ──────────────────────────────────────
  const [assignments, setAssignments] = useState<TimesheetAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);

  // ── Compliance state ───────────────────────────────────────
  const [complianceFlags, setComplianceFlags] = useState<ComplianceFlag[]>([]);

  // ── Entry actions ──────────────────────────────────────────

  const fetchEntriesForWeek = useCallback(async (projectId: string, weekStart: string, weekEnd: string) => {
    setEntriesLoading(true);
    setEntriesError(null);
    try {
      const data = await timesheetService.getEntriesForWeek(projectId, weekStart, weekEnd);
      setEntries(data);
    } catch (err: any) {
      setEntriesError(err.message);
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  const fetchEntriesForMonth = useCallback(async (projectId: string, month: number, year: number) => {
    setEntriesLoading(true);
    setEntriesError(null);
    try {
      const data = await timesheetService.getEntriesForMonth(projectId, month, year);
      setEntries(data);
    } catch (err: any) {
      setEntriesError(err.message);
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  const upsertEntry = useCallback(async (entry: TimesheetEntryDraft, enteredBy: string) => {
    const result = await timesheetService.upsertEntry(entry, enteredBy);
    setEntries((prev) => {
      const idx = prev.findIndex(
        (e) => e.project_id === entry.project_id && e.employee_id === entry.employee_id && e.entry_date === entry.entry_date
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = result;
        return updated;
      }
      return [...prev, result];
    });
    return result;
  }, []);

  const upsertEntries = useCallback(async (entriesToSave: TimesheetEntryDraft[], enteredBy: string) => {
    const results = await timesheetService.upsertEntries(entriesToSave, enteredBy);
    // Refresh is simpler than trying to merge — caller should refetch
    return results;
  }, []);

  const deleteEntry = useCallback(async (entryId: string) => {
    await timesheetService.deleteEntry(entryId);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }, []);

  // ── Submission actions ─────────────────────────────────────

  const fetchSubmissions = useCallback(async (filters?: TimesheetFilters) => {
    setSubmissionsLoading(true);
    setSubmissionsError(null);
    try {
      const data = await timesheetService.getSubmissions(filters);
      setSubmissions(data);
    } catch (err: any) {
      setSubmissionsError(err.message);
    } finally {
      setSubmissionsLoading(false);
    }
  }, []);

  const fetchSubmissionForWeek = useCallback(async (projectId: string, weekStart: string) => {
    try {
      const data = await timesheetService.getSubmissionForWeek(projectId, weekStart);
      setCurrentSubmission(data);
    } catch (err: any) {
      setSubmissionsError(err.message);
    }
  }, []);

  const submitForApproval = useCallback(
    async (projectId: string, weekStart: string, weekEnd: string, userId: string, userRole: string) => {
      const sub = await timesheetService.submitForApproval(projectId, weekStart, weekEnd, userId, userRole);
      setCurrentSubmission(sub);
      return sub;
    },
    []
  );

  const approve = useCallback(async (submissionId: string, userId: string, userRole: string, comment?: string) => {
    const sub = await timesheetService.approve(submissionId, userId, userRole, comment);
    setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? sub : s)));
    setCurrentSubmission(sub);
    return sub;
  }, []);

  const reject = useCallback(async (submissionId: string, userId: string, userRole: string, reason: string) => {
    const sub = await timesheetService.reject(submissionId, userId, userRole, reason);
    setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? sub : s)));
    setCurrentSubmission(sub);
    return sub;
  }, []);

  // ── Assignment actions ─────────────────────────────────────

  const fetchAssignments = useCallback(async (projectId?: string) => {
    setAssignmentsLoading(true);
    setAssignmentsError(null);
    try {
      const data = await timesheetService.getAssignments(projectId);
      setAssignments(data);
    } catch (err: any) {
      setAssignmentsError(err.message);
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  const fetchMyAssignments = useCallback(async (userId: string) => {
    setAssignmentsLoading(true);
    setAssignmentsError(null);
    try {
      const data = await timesheetService.getMyAssignments(userId);
      setAssignments(data);
    } catch (err: any) {
      setAssignmentsError(err.message);
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  const assignKeeper = useCallback(async (projectId: string, assignedToId: string, assignedById: string) => {
    const assignment = await timesheetService.assignKeeper(projectId, assignedToId, assignedById);
    setAssignments((prev) => [assignment, ...prev]);
    return assignment;
  }, []);

  const removeAssignment = useCallback(async (assignmentId: string) => {
    await timesheetService.removeAssignment(assignmentId);
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  }, []);

  // ── Compliance actions ─────────────────────────────────────

  const fetchComplianceFlags = useCallback(async (projectId?: string) => {
    try {
      const data = await timesheetService.getComplianceFlags(projectId);
      setComplianceFlags(data);
    } catch (err: any) {
      // silent - compliance is supplementary
    }
  }, []);

  const resolveFlag = useCallback(async (flagId: string, userId: string, note?: string) => {
    await timesheetService.resolveFlag(flagId, userId, note);
    setComplianceFlags((prev) => prev.filter((f) => f.id !== flagId));
  }, []);

  return {
    // Entries
    entries,
    entriesLoading,
    entriesError,
    fetchEntriesForWeek,
    fetchEntriesForMonth,
    upsertEntry,
    upsertEntries,
    deleteEntry,

    // Submissions
    submissions,
    currentSubmission,
    submissionsLoading,
    submissionsError,
    fetchSubmissions,
    fetchSubmissionForWeek,
    submitForApproval,
    approve,
    reject,

    // Assignments
    assignments,
    assignmentsLoading,
    assignmentsError,
    fetchAssignments,
    fetchMyAssignments,
    assignKeeper,
    removeAssignment,

    // Compliance
    complianceFlags,
    fetchComplianceFlags,
    resolveFlag,
  };
}
