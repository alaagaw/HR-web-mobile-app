import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Platform, Pressable, TextInput, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/hooks/use-auth';
import { useTimesheets } from '@/hooks/use-timesheets';
import { useProjects } from '@/hooks/use-projects';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useViewState } from '@/hooks/use-view-state';
import { userService, timesheetService, projectHoursChangeService } from '@/services';
import { ProjectHoursChangeScope } from '@/types/enums';
import { format, addDays, subDays } from 'date-fns';
import {
  getWeekRange,
  getWeekDays,
  formatWeekRange,
  computeColumnTotals,
  groupEntriesByEmployee,
  isDayLocked,
  splitRegularOvertime,
} from '@/lib/timesheet-utils';
import type { TimesheetEntry, TimesheetEntryDraft, Project, Profile, TimesheetAssignment, Supplier } from '@/types/models';
import { TimesheetSubmissionStatus, Role, ProjectEntryMode } from '@/types/enums';

const isWeb = Platform.OS === 'web';
const WIDE_SCREEN_BREAKPOINT = 1200; // keep in sync with MOBILE_BREAKPOINT (use-breakpoint.ts)

// ── Lazy-load MUI components only on web ──────────────────────
let MuiThemeProvider: any;
let Dialog: any;
let DialogTitle: any;
let DialogContent: any;
let DialogActions: any;
let MuiButton: any;
let TextField: any;
let Autocomplete: any;
let Snackbar: any;
let Alert: any;
let Chip: any;
let MenuItem: any;

if (isWeb) {
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  Dialog = require('@mui/material/Dialog').default;
  DialogTitle = require('@mui/material/DialogTitle').default;
  DialogContent = require('@mui/material/DialogContent').default;
  DialogActions = require('@mui/material/DialogActions').default;
  MuiButton = require('@mui/material/Button').default;
  TextField = require('@mui/material/TextField').default;
  Autocomplete = require('@mui/material/Autocomplete').default;
  Snackbar = require('@mui/material/Snackbar').default;
  Alert = require('@mui/material/Alert').default;
  Chip = require('@mui/material/Chip').default;
  MenuItem = require('@mui/material/MenuItem').default;
}

// ============================================================
// DESIGN TOKENS
// ============================================================

const DT = {
  bgMain: '#0b1220',
  cardBg: '#111a2e',
  border: '#1e293b',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

// ============================================================
// LOCAL GRID TYPES
// ============================================================

interface GridRow {
  key: string; // employee_id or employee_name
  employee_id: string | null;
  employee_name: string;
  employee_number: string | null;
  designation: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  shift: 'D' | 'N';
  /**
   * Per-day primary hours value, keyed by yyyy-MM-dd.
   *  - Auto mode: TOTAL hours typed by the keeper (split derived at save).
   *  - Manual mode: REGULAR hours typed by the keeper.
   */
  hours: Record<string, number>;
  /**
   * Per-day overtime hours, keyed by yyyy-MM-dd.
   *  - Auto mode: always 0 (auto-derived at save; not a real input).
   *  - Manual mode: OT hours typed by the keeper.
   */
  overtimeHours: Record<string, number>;
}

// ============================================================
// STATUS CHIP HELPERS
// ============================================================

function getSubmissionStatusLabel(status: TimesheetSubmissionStatus | null): string {
  switch (status) {
    case TimesheetSubmissionStatus.Submitted:
      return 'Submitted';
    case TimesheetSubmissionStatus.Approved:
      return 'Approved';
    case TimesheetSubmissionStatus.Rejected:
      return 'Rejected';
    default:
      return 'Draft';
  }
}

function getSubmissionChipColor(status: TimesheetSubmissionStatus | null): 'default' | 'warning' | 'success' | 'error' {
  switch (status) {
    case TimesheetSubmissionStatus.Submitted:
      return 'warning';
    case TimesheetSubmissionStatus.Approved:
      return 'success';
    case TimesheetSubmissionStatus.Rejected:
      return 'error';
    default:
      return 'default';
  }
}

function getSubmissionBadgeStyle(status: TimesheetSubmissionStatus | null): { bg: string; text: string } {
  switch (status) {
    case TimesheetSubmissionStatus.Submitted:
      return { bg: '#78350f', text: '#fbbf24' };
    case TimesheetSubmissionStatus.Approved:
      return { bg: '#14532d', text: '#4ade80' };
    case TimesheetSubmissionStatus.Rejected:
      return { bg: '#7f1d1d', text: '#f87171' };
    default:
      return { bg: '#334155', text: '#94a3b8' };
  }
}

// ============================================================
// HELPER: check if a dateStr is a Saudi weekend (Fri or Sat)
// ============================================================

function isSaudiWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun, 5=Fri, 6=Sat
  return day === 5 || day === 6;
}

// ============================================================
// HELPER: compute row total from hours map
// ============================================================

function computeRowTotalFromMap(hours: Record<string, number>): number {
  return Object.values(hours).reduce((sum, h) => sum + (h || 0), 0);
}

// ============================================================
// HELPER: build grid rows from entries
// ============================================================

function buildGridRows(
  entries: TimesheetEntry[],
  weekDays: { dateStr: string }[],
  entryMode: ProjectEntryMode = ProjectEntryMode.Auto,
): GridRow[] {
  const grouped = groupEntriesByEmployee(entries);
  const rows: GridRow[] = [];
  const isManual = entryMode === ProjectEntryMode.ManualSplit;

  grouped.forEach(({ employee, entries: empEntries }) => {
    const hours: Record<string, number> = {};
    const overtimeHours: Record<string, number> = {};
    for (const day of weekDays) {
      const entry = empEntries.find((e) => e.entry_date === day.dateStr);
      const std = entry ? Number(entry.standard_hours) : 0;
      const ot = entry ? Number(entry.overtime_hours) : 0;
      if (isManual) {
        // Surface the split as the keeper entered it.
        hours[day.dateStr] = std;
        overtimeHours[day.dateStr] = ot;
      } else {
        // Auto mode: keeper sees a single total per day.
        hours[day.dateStr] = std + ot;
        overtimeHours[day.dateStr] = 0;
      }
    }
    // Use the shift + supplier from the first entry (consistent per employee per week)
    const firstEntry = empEntries[0];
    rows.push({
      key: employee.employee_id || employee.employee_name,
      employee_id: employee.employee_id ?? null,
      employee_name: employee.employee_name,
      employee_number: employee.employee_number ?? null,
      designation: employee.designation ?? null,
      supplier_id: employee.supplier_id ?? null,
      supplier_name: firstEntry?.supplier?.name ?? null,
      shift: (firstEntry?.st_shift === 'N' ? 'N' : 'D') as 'D' | 'N',
      hours,
      overtimeHours,
    });
  });

  return rows;
}

// ============================================================
// HELPER: convert grid rows back to entry drafts
// ============================================================

/**
 * Convert grid rows into TimesheetEntryDraft rows ready for upsert.
 *
 * Auto mode:
 *   - row.hours[date] holds the keeper-typed total.
 *   - Split into standard + overtime using the project's regular_hours_per_day.
 *   - row.overtimeHours is ignored (always 0 in auto rows).
 *
 * Manual mode:
 *   - row.hours[date] is keeper-typed REGULAR hours.
 *   - row.overtimeHours[date] is keeper-typed OT hours.
 *   - Both written through verbatim, no auto-derive.
 *
 * regular_hours_per_day is frozen onto every draft as
 * effective_regular_hours_per_day so future config changes can't
 * retro-corrupt past payroll.
 */
function gridRowsToDrafts(
  rows: GridRow[],
  projectId: string,
  regularHoursPerDay: number,
  entryMode: ProjectEntryMode = ProjectEntryMode.Auto,
): TimesheetEntryDraft[] {
  const drafts: TimesheetEntryDraft[] = [];
  const limit = regularHoursPerDay > 0 ? regularHoursPerDay : 8;
  const isManual = entryMode === ProjectEntryMode.ManualSplit;

  for (const row of rows) {
    // Union of dates across both maps so manual rows that only have OT
    // (no regular) still produce a draft.
    const dateStrs = new Set<string>([
      ...Object.keys(row.hours),
      ...Object.keys(row.overtimeHours),
    ]);
    for (const dateStr of dateStrs) {
      if (isDayLocked(dateStr)) continue;
      let standard: number;
      let overtime: number;
      if (isManual) {
        standard = row.hours[dateStr] || 0;
        overtime = row.overtimeHours[dateStr] || 0;
      } else {
        const total = row.hours[dateStr] || 0;
        standard = Math.min(total, limit);
        overtime = Math.max(0, total - limit);
      }
      if (standard <= 0 && overtime <= 0) continue;
      drafts.push({
        project_id: projectId,
        employee_id: row.employee_id,
        employee_name: row.employee_name,
        employee_number: row.employee_number,
        designation: row.designation,
        supplier_id: row.supplier_id,
        entry_date: dateStr,
        standard_hours: standard,
        overtime_hours: overtime,
        effective_regular_hours_per_day: limit,
        st_shift: row.shift,
        ot_shift: row.shift,
      });
    }
  }
  return drafts;
}

// ============================================================
// CSV EXPORT
// ============================================================

function exportGridToCSV(
  rows: GridRow[],
  weekDays: { dateStr: string; dayShort: string }[],
  projectName: string,
  weekLabel: string,
) {
  const header = ['#', 'Employee', 'Designation', 'Supplier', 'Shift', ...weekDays.map((d) => `${d.dayShort} ${d.dateStr}`), 'TOTAL'];
  const csvRows = [header.join(',')];

  rows.forEach((row, idx) => {
    const rowTotal = computeRowTotalFromMap(row.hours);
    const cells = [
      String(idx + 1),
      `"${row.employee_name}"`,
      `"${row.designation || ''}"`,
      `"${row.supplier_name || ''}"`,
      row.shift,
      ...weekDays.map((d) => String(row.hours[d.dateStr] || 0)),
      String(rowTotal),
    ];
    csvRows.push(cells.join(','));
  });

  // Total row
  const totalCells = ['', 'Total Hours', '', '', ''];
  for (const day of weekDays) {
    const colTotal = rows.reduce((sum, r) => sum + (r.hours[day.dateStr] || 0), 0);
    totalCells.push(String(colTotal));
  }
  const grandTotal = rows.reduce((sum, r) => sum + computeRowTotalFromMap(r.hours), 0);
  totalCells.push(String(grandTotal));
  csvRows.push(totalCells.join(','));

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `timesheet-${projectName.replace(/\s+/g, '_')}-${weekLabel.replace(/\s+/g, '_')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// WEB COMPONENT
// ============================================================

function WebTimesheetEntry({ isDark }: { isDark: boolean }) {
  const { user } = useAuth();

  // ── Hooks ─────────────────────────────────────────────────
  const {
    entries,
    entriesLoading,
    fetchEntriesForWeek,
    upsertEntries,
    assignments,
    assignmentsLoading,
    fetchAssignments,
    fetchMyAssignments,
    currentSubmission,
    fetchSubmissionForWeek,
    submitForApproval,
  } = useTimesheets();

  const { projects, fetchAll: fetchAllProjects } = useProjects();
  const { suppliers, fetchAll: fetchAllSuppliers } = useSuppliers();

  // ── Role check ──────────────────────────────────────────────
  const isHR = user?.role === Role.HR || user?.role === Role.HRDirector;

  // ── Local state ─────────────────────────────────────────────
  const [selectedProjectId, setSelectedProjectId] = useViewState<string | null>(
    'tabs/timesheet-entry.selectedProjectId',
    null
  );
  const [weekStartIso, setWeekStartIso] = useViewState(
    'tabs/timesheet-entry.weekStart',
    getWeekRange(new Date()).weekStart.toISOString()
  );
  // Re-align to current week-start convention (Sunday). Snaps any value persisted
  // under a previous convention (e.g., Monday) back to the start of its week.
  const weekStart = useMemo(
    () => getWeekRange(new Date(weekStartIso)).weekStart,
    [weekStartIso]
  );
  const setWeekStart = useCallback(
    (next: Date | ((prev: Date) => Date)) => {
      if (typeof next === 'function') {
        setWeekStartIso((prevIso) =>
          (next as (prev: Date) => Date)(new Date(prevIso)).toISOString()
        );
      } else {
        setWeekStartIso(next.toISOString());
      }
    },
    [setWeekStartIso]
  );
  const [gridRows, setGridRows] = useState<GridRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Add Employee dialog
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [employeeSearchResults, setEmployeeSearchResults] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [manualEmployee, setManualEmployee] = useState({ name: '', number: '', designation: '' });
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Auto-fill dialog
  const [autoFillOpen, setAutoFillOpen] = useState(false);
  const [autoFillHours, setAutoFillHours] = useState('11');

  // Request a project-hours change. Visible only to HR/HRD/Manager for now
  // (server-side RLS does the final gate; PMs and GMs route through the same
  // dialog once capability checks land).
  const [hoursChangeOpen, setHoursChangeOpen] = useState(false);
  const [hoursChangeScope, setHoursChangeScope] = useState<ProjectHoursChangeScope>(
    ProjectHoursChangeScope.ThisWeek,
  );
  const [hoursChangeValue, setHoursChangeValue] = useState('');
  const [hoursChangeReason, setHoursChangeReason] = useState('');
  const [hoursChangeSubmitting, setHoursChangeSubmitting] = useState(false);

  // ── Computed values ───────────────────────────────────────
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekLabel = useMemo(() => formatWeekRange(weekStart, weekEnd), [weekStart, weekEnd]);
  const weekStartStr = useMemo(() => format(weekStart, 'yyyy-MM-dd'), [weekStart]);
  const weekEndStr = useMemo(() => format(weekEnd, 'yyyy-MM-dd'), [weekEnd]);

  const availableProjects = useMemo(() => {
    if (isHR) return projects; // HR sees all projects
    const projectIds = assignments.map((a) => a.project_id);
    return projects.filter((p) => projectIds.includes(p.id));
  }, [isHR, assignments, projects]);

  // Map project_id -> keeper name(s) from assignments
  const keeperByProject = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of assignments) {
      if (!a.is_active) continue;
      const name = a.assigned_to?.full_name ?? 'Unknown';
      if (map[a.project_id]) {
        map[a.project_id] += `, ${name}`;
      } else {
        map[a.project_id] = name;
      }
    }
    return map;
  }, [assignments]);

  const selectedProject = useMemo(
    () => availableProjects.find((p) => p.id === selectedProjectId) || null,
    [availableProjects, selectedProjectId],
  );

  const submissionStatus: TimesheetSubmissionStatus | null = currentSubmission?.status ?? null;
  const isEditable = submissionStatus === null || submissionStatus === TimesheetSubmissionStatus.Draft || submissionStatus === TimesheetSubmissionStatus.Rejected;

  const isManualMode = selectedProject?.entry_mode === ProjectEntryMode.ManualSplit;
  const regularHoursLimit = selectedProject?.regular_hours_per_day ?? 8;

  // For the auto-mode grid: per-row derived totals (Regular | OT | Grand).
  // Each day's typed total is split via splitRegularOvertime(total, limit);
  // sums across the week give the row's R / OT / Grand. The display values
  // intentionally mirror what gridRowsToDrafts writes on save, so the grid
  // and the persisted entries are guaranteed to agree.
  const autoRowSplits = useMemo(() => {
    const map = new Map<string, { regular: number; overtime: number; total: number }>();
    for (const r of gridRows) {
      let reg = 0;
      let ot = 0;
      for (const d of weekDays) {
        const total = r.hours[d.dateStr] || 0;
        const { regular, overtime } = splitRegularOvertime(total, regularHoursLimit);
        reg += regular;
        ot += overtime;
      }
      map.set(r.key, { regular: reg, overtime: ot, total: reg + ot });
    }
    return map;
  }, [gridRows, weekDays, regularHoursLimit]);

  // Footer column totals split across all rows.
  const autoGrandSplit = useMemo(() => {
    let reg = 0;
    let ot = 0;
    for (const r of gridRows) {
      const s = autoRowSplits.get(r.key);
      if (!s) continue;
      reg += s.regular;
      ot += s.overtime;
    }
    return { regular: reg, overtime: ot, total: reg + ot };
  }, [gridRows, autoRowSplits]);

  // Column totals: in manual mode, totals include both R and OT.
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const day of weekDays) {
      totals[day.dateStr] = gridRows.reduce(
        (sum, r) => sum + (r.hours[day.dateStr] || 0) + (isManualMode ? (r.overtimeHours[day.dateStr] || 0) : 0),
        0,
      );
    }
    return totals;
  }, [gridRows, weekDays, isManualMode]);

  // Per-day OT totals — only meaningful in manual mode (where keepers enter OT
  // explicitly). Auto-mode OT splits are derived at save and shown in PR #6.
  const columnOvertimeTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const day of weekDays) {
      totals[day.dateStr] = gridRows.reduce((sum, r) => sum + (r.overtimeHours[day.dateStr] || 0), 0);
    }
    return totals;
  }, [gridRows, weekDays]);

  const grandTotal = useMemo(
    () =>
      gridRows.reduce(
        (sum, r) =>
          sum +
          computeRowTotalFromMap(r.hours) +
          (isManualMode ? computeRowTotalFromMap(r.overtimeHours) : 0),
        0,
      ),
    [gridRows, isManualMode],
  );

  // Supplier column auto-width
  const supplierColWidth = useMemo(() => {
    const names = suppliers.map((s) => s.name || '');
    const longest = names.reduce((a, b) => (a.length > b.length ? a : b), 'SUPPLIER');
    return Math.max(100, Math.min(200, longest.length * 7 + 40));
  }, [suppliers]);

  // ── Data fetching ─────────────────────────────────────────

  // Fetch assignments + all projects on mount
  useEffect(() => {
    if (!user) return;
    fetchAllProjects();
    fetchAllSuppliers();
    if (isHR) {
      fetchAssignments(); // HR sees all assignments (for keeper info)
    } else {
      fetchMyAssignments(user.id);
    }
  }, [user, isHR]);

  // Auto-select first project
  useEffect(() => {
    if (availableProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(availableProjects[0].id);
    }
  }, [availableProjects, selectedProjectId]);

  // Fetch entries + submission when project or week changes
  useEffect(() => {
    if (!selectedProjectId) return;
    fetchEntriesForWeek(selectedProjectId, weekStartStr, weekEndStr);
    fetchSubmissionForWeek(selectedProjectId, weekStartStr);
  }, [selectedProjectId, weekStartStr, weekEndStr]);

  // Rebuild grid whenever entries OR the week OR the project mode change.
  //
  // weekDays must be in the dep array: clicking < / > to navigate updates
  // weekDays (and triggers a fetch for the new range), but the in-flight
  // fetch's response races with this effect. Without weekDays in deps, the
  // grid can stick on the previous week's data if entries' reference happens
  // to match closely enough or if the fetch resolves before this effect
  // re-evaluates.
  //
  // Merge logic: preserve locally-added rows (e.g. a just-added employee with
  // 0 hours) that haven't been persisted yet — but only if their hours keys
  // belong to the CURRENT week. This prevents Save/refetch from wiping a new
  // row before the user has a chance to enter hours, while still discarding
  // stale rows when the user navigates to a different week.
  useEffect(() => {
    setGridRows((prev) => {
      const built = buildGridRows(entries, weekDays, selectedProject?.entry_mode);
      const builtKeys = new Set(built.map((r) => r.key));
      const currentDateStrs = new Set(weekDays.map((d) => d.dateStr));
      const pending = prev.filter(
        (r) =>
          !builtKeys.has(r.key) &&
          (Object.keys(r.hours).some((k) => currentDateStrs.has(k)) ||
            Object.keys(r.overtimeHours).some((k) => currentDateStrs.has(k))),
      );
      return [...built, ...pending];
    });
  }, [entries, weekDays, selectedProject?.entry_mode]);

  // ── Week navigation ───────────────────────────────────────

  const goToPrevWeek = useCallback(() => {
    setWeekStart((prev) => subDays(prev, 7));
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => addDays(prev, 7));
  }, []);

  // ── Auto-save with debounce ─────────────────────────────────
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridRowsRef = useRef(gridRows);
  gridRowsRef.current = gridRows;
  const selectedProjectIdRef = useRef(selectedProjectId);
  selectedProjectIdRef.current = selectedProjectId;
  const userRef = useRef(user);
  userRef.current = user;

  const selectedProjectRef = useRef(selectedProject);
  selectedProjectRef.current = selectedProject;

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      const pid = selectedProjectIdRef.current;
      const u = userRef.current;
      const rows = gridRowsRef.current;
      const proj = selectedProjectRef.current;
      if (!pid || !u || rows.length === 0) return;
      try {
        const drafts = gridRowsToDrafts(rows, pid, proj?.regular_hours_per_day ?? 8, proj?.entry_mode);
        if (drafts.length === 0) return;
        await upsertEntries(drafts, u.id);
      } catch (_err) {
        // Silent fail — user can still use manual Save
      }
    }, 1500);
  }, [upsertEntries]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // ── Cell change handler ───────────────────────────────────

  /**
   * Update a single grid cell. `kind` selects which map to write:
   *  - 'regular'  → row.hours (auto: total; manual: regular only)
   *  - 'overtime' → row.overtimeHours (manual mode only)
   */
  const handleCellChange = useCallback(
    (rowKey: string, dateStr: string, value: string, kind: 'regular' | 'overtime' = 'regular') => {
      if (isDayLocked(dateStr)) return;
      const parsed = parseFloat(value);
      const next = isNaN(parsed) ? 0 : Math.min(24, Math.max(0, parsed));
      setGridRows((prev) =>
        prev.map((r) => {
          if (r.key !== rowKey) return r;
          if (kind === 'overtime') {
            return { ...r, overtimeHours: { ...r.overtimeHours, [dateStr]: next } };
          }
          return { ...r, hours: { ...r.hours, [dateStr]: next } };
        }),
      );
      scheduleAutoSave();
    },
    [scheduleAutoSave],
  );

  const handleShiftChange = useCallback((rowKey: string) => {
    setGridRows((prev) =>
      prev.map((r) =>
        r.key === rowKey ? { ...r, shift: r.shift === 'D' ? 'N' : 'D' } : r,
      ),
    );
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleSupplierChange = useCallback((rowKey: string, supplier: Supplier | null) => {
    setGridRows((prev) =>
      prev.map((r) =>
        r.key === rowKey
          ? { ...r, supplier_id: supplier?.id ?? null, supplier_name: supplier?.name ?? null }
          : r,
      ),
    );
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  // ── Save (manual) ──────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!selectedProjectId || !user) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaving(true);
    try {
      const drafts = gridRowsToDrafts(gridRows, selectedProjectId, selectedProject?.regular_hours_per_day ?? 8, selectedProject?.entry_mode);
      await upsertEntries(drafts, user.id);
      await fetchEntriesForWeek(selectedProjectId, weekStartStr, weekEndStr);
      setSnackbar({ open: true, message: 'Timesheet saved successfully', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to save timesheet', severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, [selectedProjectId, selectedProject, user, gridRows, weekStartStr, weekEndStr]);

  // ── Submit for Approval ───────────────────────────────────

  const handleSubmitForApproval = useCallback(async () => {
    if (!selectedProjectId || !user) return;
    setSubmitting(true);
    try {
      const drafts = gridRowsToDrafts(gridRows, selectedProjectId, selectedProject?.regular_hours_per_day ?? 8, selectedProject?.entry_mode);
      await upsertEntries(drafts, user.id);
      await submitForApproval(selectedProjectId, weekStartStr, weekEndStr, user.id, user.role);
      setSnackbar({ open: true, message: 'Timesheet submitted for approval', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to submit timesheet', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [selectedProjectId, selectedProject, user, gridRows, weekStartStr, weekEndStr]);

  // ── Copy Last Week ────────────────────────────────────────

  const handleCopyLastWeek = useCallback(async () => {
    if (!selectedProjectId) return;
    const prevWeekStart = subDays(weekStart, 7);
    const prevWeekEnd = addDays(prevWeekStart, 6);
    const prevStartStr = format(prevWeekStart, 'yyyy-MM-dd');
    const prevEndStr = format(prevWeekEnd, 'yyyy-MM-dd');

    try {
      const prevEntries = await timesheetService.getEntriesForWeek(selectedProjectId, prevStartStr, prevEndStr);
      if (prevEntries.length === 0) {
        setSnackbar({ open: true, message: 'No entries found for previous week', severity: 'error' });
        return;
      }

      const prevWeekDays = getWeekDays(prevWeekStart);
      const prevRows = buildGridRows(prevEntries, prevWeekDays, selectedProject?.entry_mode);

      // Map previous week hours to current week days (skip locked days).
      // Manual mode also copies the OT split.
      const newRows: GridRow[] = prevRows.map((prevRow) => {
        const hours: Record<string, number> = {};
        const overtimeHours: Record<string, number> = {};
        weekDays.forEach((currentDay, idx) => {
          const prevDay = prevWeekDays[idx];
          if (isDayLocked(currentDay.dateStr)) {
            hours[currentDay.dateStr] = 0;
            overtimeHours[currentDay.dateStr] = 0;
          } else {
            hours[currentDay.dateStr] = prevRow.hours[prevDay.dateStr] || 0;
            overtimeHours[currentDay.dateStr] = prevRow.overtimeHours[prevDay.dateStr] || 0;
          }
        });
        return { ...prevRow, hours, overtimeHours };
      });

      setGridRows(newRows);
      setSnackbar({ open: true, message: 'Copied hours from previous week', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to copy last week', severity: 'error' });
    }
  }, [selectedProjectId, selectedProject, weekStart, weekDays]);

  // ── Auto-Fill ─────────────────────────────────────────────

  const handleAutoFill = useCallback(() => {
    const h = parseFloat(autoFillHours);
    if (isNaN(h) || h < 0 || h > 24) return;
    // Auto-fill always populates the "primary" hours field. In auto mode that's
    // total hours; in manual mode that's regular hours only (keepers in manual
    // mode set OT explicitly per day, so we don't bulk-fill OT here).
    setGridRows((prev) =>
      prev.map((row) => {
        const hours = { ...row.hours };
        for (const day of weekDays) {
          if (!isSaudiWeekend(day.dateStr) && !isDayLocked(day.dateStr)) {
            hours[day.dateStr] = h;
          }
        }
        return { ...row, hours };
      }),
    );
    setAutoFillOpen(false);
    setSnackbar({ open: true, message: `Auto-filled ${h} hours for all weekdays`, severity: 'success' });
  }, [autoFillHours, weekDays]);

  // ── Add Employee ──────────────────────────────────────────

  const handleSearchEmployees = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setEmployeeSearchResults([]);
      return;
    }
    try {
      const results = await userService.getEmployees({ search: searchTerm, is_active: true });
      setEmployeeSearchResults(results);
    } catch {
      setEmployeeSearchResults([]);
    }
  }, []);

  const handleAddEmployee = useCallback(() => {
    let newRow: GridRow;

    const hours: Record<string, number> = {};
    const overtimeHours: Record<string, number> = {};
    for (const day of weekDays) {
      hours[day.dateStr] = 0;
      overtimeHours[day.dateStr] = 0;
    }

    if (selectedProfile) {
      const exists = gridRows.some((r) => r.employee_id === selectedProfile.id);
      if (exists) {
        setSnackbar({ open: true, message: 'Employee is already in the timesheet', severity: 'error' });
        return;
      }
      newRow = {
        key: selectedProfile.id,
        employee_id: selectedProfile.id,
        employee_name: selectedProfile.full_name,
        // Pull the employee number from the profile's joined emp_code so the
        // EMP # column in the consolidated view stays consistent across all
        // entries for this employee, no matter who adds them or when.
        employee_number: selectedProfile.emp_code ?? null,
        designation: selectedProfile.department,
        supplier_id: selectedSupplier?.id ?? null,
        supplier_name: selectedSupplier?.name ?? null,
        shift: 'D',
        hours,
        overtimeHours,
      };
    } else if (manualEmployee.name.trim()) {
      const exists = gridRows.some(
        (r) => r.employee_name.toLowerCase() === manualEmployee.name.trim().toLowerCase(),
      );
      if (exists) {
        setSnackbar({ open: true, message: 'Employee is already in the timesheet', severity: 'error' });
        return;
      }
      newRow = {
        key: manualEmployee.name.trim(),
        employee_id: null,
        employee_name: manualEmployee.name.trim(),
        employee_number: manualEmployee.number.trim() || null,
        designation: manualEmployee.designation.trim() || null,
        supplier_id: selectedSupplier?.id ?? null,
        supplier_name: selectedSupplier?.name ?? null,
        shift: 'D',
        hours,
        overtimeHours,
      };
    } else {
      return;
    }

    setGridRows((prev) => [...prev, newRow]);
    setAddEmployeeOpen(false);
    setSelectedProfile(null);
    setSelectedSupplier(null);
    setManualEmployee({ name: '', number: '', designation: '' });
    setEmployeeSearchResults([]);
    setSnackbar({ open: true, message: `Added ${newRow.employee_name}`, severity: 'success' });
  }, [selectedProfile, selectedSupplier, manualEmployee, gridRows, weekDays]);

  // ── Request a project-hours change ────────────────────────

  const canRequestHoursChange = !!user && (user.role === Role.HR || user.role === Role.HRDirector || user.role === Role.Manager);

  const handleOpenHoursChange = useCallback(() => {
    if (!selectedProject) return;
    setHoursChangeScope(ProjectHoursChangeScope.ThisWeek);
    setHoursChangeValue(String(selectedProject.regular_hours_per_day));
    setHoursChangeReason('');
    setHoursChangeOpen(true);
  }, [selectedProject]);

  const handleSubmitHoursChange = useCallback(async () => {
    if (!selectedProject || !user) return;
    if (!hoursChangeScope) {
      setSnackbar({ open: true, message: 'Scope is required', severity: 'error' });
      return;
    }
    const requested = parseFloat(hoursChangeValue);
    if (Number.isNaN(requested) || requested <= 0 || requested > 24) {
      setSnackbar({ open: true, message: 'Requested hours must be between 0.5 and 24', severity: 'error' });
      return;
    }
    const reason = hoursChangeReason.trim();
    if (!reason) {
      setSnackbar({ open: true, message: 'Reason is required', severity: 'error' });
      return;
    }
    setHoursChangeSubmitting(true);
    try {
      await projectHoursChangeService.create(
        {
          project_id: selectedProject.id,
          scope: hoursChangeScope,
          week_start: weekStartStr,
          current_value: selectedProject.regular_hours_per_day,
          requested_value: requested,
          reason,
        },
        user.id,
        user.role,
      );
      setHoursChangeOpen(false);
      setSnackbar({ open: true, message: 'Change request submitted', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to submit request', severity: 'error' });
    } finally {
      setHoursChangeSubmitting(false);
    }
  }, [selectedProject, user, hoursChangeScope, hoursChangeValue, hoursChangeReason, weekStartStr]);

  // ── CSV Export ────────────────────────────────────────────

  const handleExportCSV = useCallback(() => {
    if (gridRows.length === 0) return;
    exportGridToCSV(gridRows, weekDays, selectedProject?.name || 'project', weekLabel);
  }, [gridRows, weekDays, selectedProject, weekLabel]);

  // ── Table styles ──────────────────────────────────────────

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: DT.cardBg,
    borderRadius: 12,
    overflow: 'hidden',
  };

  const thStyle: React.CSSProperties = {
    backgroundColor: '#1a2744',
    color: DT.textSecondary,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    textAlign: 'left',
    borderBottom: `1px solid ${DT.border}`,
  };

  const thCenterStyle: React.CSSProperties = {
    ...thStyle,
    textAlign: 'center',
  };

  const tdStyle: React.CSSProperties = {
    padding: 4,
    borderBottom: `1px solid ${DT.border}`,
    fontSize: 13,
    color: DT.textPrimary,
  };

  const inputBaseStyle: React.CSSProperties = {
    width: 52,
    height: 36,
    backgroundColor: '#0f1729',
    border: `1px solid ${DT.border}`,
    borderRadius: 6,
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 14,
    outline: 'none',
  };

  const weekendBg = '#0d1525';
  const totalRowBg = '#0d1525';

  const btnStyle = (bg: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    backgroundColor: bg,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  });

  const outlineBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: DT.textSecondary,
    border: `1px solid ${DT.border}`,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? DT.bgMain : '#F8FAFC' }}>
      {/* ── Page Header ────────────────────────────────── */}
      <div
        style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${isDark ? DT.border : '#E2E8F0'}`,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, color: isDark ? DT.textPrimary : '#0F172A' }}>
          Timesheet Entry
        </div>
        <div style={{ fontSize: 13, color: isDark ? DT.textSecondary : DT.textMuted, marginTop: 2 }}>
          {isHR ? 'View and manage timesheets for all projects' : 'Enter daily hours for your assigned projects'}
        </div>
      </div>

      {/* ── Content Area ───────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
        {assignmentsLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: DT.textSecondary }}>
            Loading assignments...
          </div>
        ) : availableProjects.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 60,
              color: DT.textSecondary,
              fontSize: 15,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>--</div>
            <div style={{ fontWeight: 600, fontSize: 17, color: DT.textPrimary, marginBottom: 8 }}>
              {isHR ? 'No Projects Found' : 'No Project Assignments'}
            </div>
            <div>{isHR ? 'No projects have been created yet. Add projects from the Projects admin page.' : 'You have not been assigned to any projects yet. Contact your administrator.'}</div>
          </div>
        ) : (
          <>
          {/* ── Project Selector + Week Nav ───────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
              marginBottom: 16,
            }}
          >
            {/* Project dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: DT.textSecondary }}>Project:</span>
              <select
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: `1px solid ${DT.border}`,
                  borderRadius: 8,
                  backgroundColor: DT.cardBg,
                  color: DT.textPrimary,
                  outline: 'none',
                  cursor: 'pointer',
                  minWidth: 200,
                }}
              >
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_number} - {p.name}{keeperByProject[p.id] ? ` [${keeperByProject[p.id]}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Week navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: DT.textSecondary }}>Week:</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: DT.textPrimary,
                  padding: '8px 12px',
                  backgroundColor: DT.cardBg,
                  border: `1px solid ${DT.border}`,
                  borderRadius: 8,
                  minWidth: 200,
                  textAlign: 'center',
                }}
              >
                {weekLabel}
              </span>
              <button
                onClick={goToPrevWeek}
                style={{
                  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${DT.border}`, borderRadius: 8, backgroundColor: DT.cardBg, color: DT.textPrimary, cursor: 'pointer', fontSize: 16,
                }}
              >
                {'<'}
              </button>
              <button
                onClick={goToNextWeek}
                style={{
                  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${DT.border}`, borderRadius: 8, backgroundColor: DT.cardBg, color: DT.textPrimary, cursor: 'pointer', fontSize: 16,
                }}
              >
                {'>'}
              </button>
            </div>
          </div>

          {/* ── Status + Action Buttons ───────────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 16,
            }}
          >
            {/* Status badge + Keeper info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: DT.textSecondary }}>Status:</span>
                {Chip ? (
                  <Chip
                    label={getSubmissionStatusLabel(submissionStatus)}
                    size="small"
                    color={getSubmissionChipColor(submissionStatus)}
                    variant="filled"
                    sx={{ fontWeight: 700, fontSize: 11 }}
                  />
                ) : (
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'inline-block',
                      backgroundColor: getSubmissionBadgeStyle(submissionStatus).bg,
                      color: getSubmissionBadgeStyle(submissionStatus).text,
                    }}
                  >
                    {getSubmissionStatusLabel(submissionStatus)}
                  </span>
                )}
              </div>
              {selectedProjectId && keeperByProject[selectedProjectId] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: DT.textSecondary }}>Assigned to:</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: DT.warning }}>
                    {keeperByProject[selectedProjectId]}
                  </span>
                </div>
              )}
              {/* Project payroll-mode indicator so the keeper always knows
                  which entry model + regular-hours limit they're entering
                  against on this project. */}
              {selectedProject && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: isManualMode ? '#7c2d12' : '#1e3a5f',
                    color: isManualMode ? '#F59E0B' : '#60a5fa',
                    border: `1px solid ${isManualMode ? '#F59E0B40' : `${DT.primary}40`}`,
                  }}
                  title={
                    isManualMode
                      ? 'Keeper enters Regular and Overtime explicitly per day.'
                      : 'Keeper enters total hours per day; overtime is auto-derived as anything above the limit.'
                  }
                >
                  {isManualMode ? 'MANUAL R+OT' : 'STANDARD'}
                  <span style={{ opacity: 0.7, fontWeight: 600 }}>·</span>
                  <span>{selectedProject.regular_hours_per_day}h/day</span>
                </div>
              )}
              {selectedProject && canRequestHoursChange && (
                <button
                  onClick={handleOpenHoursChange}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 12,
                    border: `1px solid ${DT.primary}80`,
                    backgroundColor: 'transparent',
                    color: DT.primary,
                    cursor: 'pointer',
                  }}
                  title="Submit a request to change the regular hours/day for this project. Approved by GM or HR Director."
                >
                  Request change
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {isEditable && (
                <>
                  <button onClick={handleCopyLastWeek} style={outlineBtnStyle}>
                    Copy Last Week
                  </button>
                  <button onClick={() => setAutoFillOpen(true)} style={outlineBtnStyle}>
                    Auto-Fill
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      ...btnStyle(DT.primary),
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleSubmitForApproval}
                    disabled={submitting || gridRows.length === 0}
                    style={{
                      ...btnStyle(DT.success),
                      opacity: submitting || gridRows.length === 0 ? 0.6 : 1,
                    }}
                  >
                    {submitting ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Grid Table ────────────────────────────── */}
          {entriesLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: DT.textSecondary }}>
              Loading entries...
            </div>
          ) : (
            <div
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                border: `1px solid ${DT.border}`,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', overflow: 'hidden' }}>
                {/* ── LEFT: Employee Info ──
                    rowSpan={2} + explicit height (matching the rendered
                    73.5px the table naturally produces with the existing
                    th padding) is what actually holds — `height` on tr/th
                    alone is ignored by table layout when content disagrees.
                    Auto mode keeps the existing 52px single-row header. */}
                <div style={{ flexShrink: 0 }}>
                  <table style={{ ...tableStyle, borderRadius: 0 }}>
                    <thead>
                      <tr>
                        <th rowSpan={isManualMode ? 2 : 1} style={{ ...thCenterStyle, width: 36, height: isManualMode ? 73.5 : 52, verticalAlign: 'middle' }}>#</th>
                        <th rowSpan={isManualMode ? 2 : 1} style={{ ...thStyle, minWidth: 150, height: isManualMode ? 73.5 : 52, verticalAlign: 'middle' }}>Employee</th>
                        <th rowSpan={isManualMode ? 2 : 1} style={{ ...thStyle, minWidth: 120, height: isManualMode ? 73.5 : 52, verticalAlign: 'middle', borderRight: `2px solid ${DT.primary}40` }}>Designation</th>
                        <th rowSpan={isManualMode ? 2 : 1} style={{ ...thStyle, minWidth: supplierColWidth, height: isManualMode ? 73.5 : 52, verticalAlign: 'middle' }}>Supplier</th>
                        <th rowSpan={isManualMode ? 2 : 1} style={{ ...thCenterStyle, width: 56, height: isManualMode ? 73.5 : 52, verticalAlign: 'middle' }}>Shift</th>
                      </tr>
                      {isManualMode && <tr />}
                    </thead>
                    <tbody>
                      {gridRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: 32, color: DT.textMuted }}>
                            No employees added yet.
                          </td>
                        </tr>
                      ) : (
                        gridRows.map((row, idx) => (
                          <tr key={row.key}>
                            <td style={{ ...tdStyle, textAlign: 'center', color: DT.textMuted, fontSize: 12, height: 48 }}>
                              {idx + 1}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: 600, paddingLeft: 10, height: 48, whiteSpace: 'nowrap' }}>
                              {row.employee_name}
                            </td>
                            <td style={{ ...tdStyle, color: DT.textSecondary, paddingLeft: 10, height: 48, fontSize: 12, borderRight: `2px solid ${DT.primary}40` }}>
                              {row.designation || '\u2014'}
                            </td>
                            <td style={{ ...tdStyle, paddingLeft: 6, height: 48, fontSize: 12, whiteSpace: 'nowrap' }}>
                              {isEditable ? (
                                <select
                                  value={row.supplier_id || ''}
                                  onChange={(e) => {
                                    const s = suppliers.find((sup) => sup.id === e.target.value) || null;
                                    handleSupplierChange(row.key, s);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    fontSize: 11,
                                    border: `1px solid ${DT.border}`,
                                    borderRadius: 4,
                                    backgroundColor: '#0f1729',
                                    color: DT.textSecondary,
                                    cursor: 'pointer',
                                    outline: 'none',
                                    colorScheme: 'dark',
                                  } as React.CSSProperties}
                                >
                                  <option value="">{'\u2014'}</option>
                                  {suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span style={{ color: DT.textSecondary, paddingLeft: 4, whiteSpace: 'nowrap' }}>
                                  {row.supplier_name || '\u2014'}
                                </span>
                              )}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', height: 48 }}>
                              {isEditable ? (
                                <button
                                  onClick={() => handleShiftChange(row.key)}
                                  title={row.shift === 'D' ? 'Day shift \u2014 click to switch' : 'Night shift \u2014 click to switch'}
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    border: `1px solid ${row.shift === 'N' ? '#3b82f6' : DT.border}`,
                                    backgroundColor: row.shift === 'N' ? '#1e3a5f' : 'transparent',
                                    color: row.shift === 'N' ? '#60a5fa' : DT.textMuted,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {row.shift}
                                </button>
                              ) : (
                                <span style={{ fontSize: 11, fontWeight: 700, color: row.shift === 'N' ? '#60a5fa' : DT.textMuted }}>
                                  {row.shift}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                      {/* Total row spacer */}
                      {gridRows.length > 0 && (
                        <tr style={{ backgroundColor: totalRowBg }}>
                          <td style={{ ...tdStyle, height: 48 }} />
                          <td colSpan={2} style={{ ...tdStyle, fontWeight: 700, paddingLeft: 10, fontSize: 13, height: 48, borderRight: `2px solid ${DT.primary}40` }}>
                            Total Hours
                          </td>
                          <td colSpan={2} style={{ ...tdStyle, height: 48 }} />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ── DIVIDER ── */}
                <div style={{ width: 2, flexShrink: 0, backgroundColor: `${DT.primary}50` }} />

                {/* ── RIGHT: Time Grid (scrollable) ── */}
                <div style={{ flex: 1, overflowX: 'auto' }}>
                  {isManualMode ? (
                    /* MANUAL R+OT SPLIT GRID — keeper enters Regular and OT
                       explicitly per day. Totals split into R | OT | Grand. */
                    <table style={{ ...tableStyle, borderRadius: 0 }}>
                      <thead>
                        <tr style={{ height: 36 }}>
                          {weekDays.map((day) => {
                            const dayLocked = isDayLocked(day.dateStr);
                            return (
                              <th
                                key={day.dateStr}
                                colSpan={2}
                                title={dayLocked ? 'Locked — past edit window' : undefined}
                                style={{
                                  ...thCenterStyle,
                                  verticalAlign: 'middle',
                                  backgroundColor: isSaudiWeekend(day.dateStr) ? weekendBg : dayLocked ? '#1e293b' : '#1a2744',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                                  {day.dayShort}
                                  {dayLocked && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                  )}
                                </div>
                                <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2, color: dayLocked ? '#64748b' : undefined }}>
                                  {format(day.date, 'ddMMM')}
                                </div>
                              </th>
                            );
                          })}
                          <th colSpan={3} style={{ ...thCenterStyle, verticalAlign: 'middle', borderLeft: `2px solid ${DT.primary}40` }}>
                            TOTAL
                          </th>
                        </tr>
                        <tr style={{ height: 22 }}>
                          {weekDays.map((day) => {
                            const isWeekendDay = isSaudiWeekend(day.dateStr);
                            const dayLocked = isDayLocked(day.dateStr);
                            const subBg = isWeekendDay ? weekendBg : dayLocked ? '#1e293b' : '#1a2744';
                            return (
                              <React.Fragment key={day.dateStr}>
                                <th style={{ ...thCenterStyle, width: 56, height: 22, fontSize: 10, padding: '2px 0', backgroundColor: subBg, borderLeft: `1px solid ${DT.border}` }}>
                                  R
                                </th>
                                <th style={{ ...thCenterStyle, width: 56, height: 22, fontSize: 10, padding: '2px 0', color: '#F59E0B', backgroundColor: subBg }}>
                                  OT
                                </th>
                              </React.Fragment>
                            );
                          })}
                          <th style={{ ...thCenterStyle, width: 50, height: 22, fontSize: 10, padding: '2px 0', borderLeft: `2px solid ${DT.primary}40` }}>
                            R
                          </th>
                          <th style={{ ...thCenterStyle, width: 50, height: 22, fontSize: 10, padding: '2px 0', color: '#F59E0B' }}>
                            OT
                          </th>
                          <th style={{ ...thCenterStyle, width: 56, height: 22, fontSize: 10, padding: '2px 0', color: DT.primary }}>
                            ALL
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {gridRows.length === 0 ? (
                          <tr>
                            <td colSpan={weekDays.length * 2 + 3} style={{ ...tdStyle, textAlign: 'center', padding: 32, color: DT.textMuted }}>
                              &nbsp;
                            </td>
                          </tr>
                        ) : (
                          gridRows.map((row) => {
                            const rowR = computeRowTotalFromMap(row.hours);
                            const rowOT = computeRowTotalFromMap(row.overtimeHours);
                            return (
                              <tr key={row.key}>
                                {weekDays.map((day) => {
                                  const isWeekendDay = isSaudiWeekend(day.dateStr);
                                  const dayLocked = isDayLocked(day.dateStr);
                                  const cellEditable = isEditable && !dayLocked;
                                  const cellBg = isWeekendDay ? weekendBg : dayLocked ? '#1e293b' : undefined;
                                  return (
                                    <React.Fragment key={day.dateStr}>
                                      <td
                                        title={dayLocked ? 'Locked — past edit window' : undefined}
                                        style={{
                                          ...tdStyle,
                                          textAlign: 'center',
                                          height: 48,
                                          backgroundColor: cellBg,
                                          borderLeft: `1px solid ${DT.border}`,
                                        }}
                                      >
                                        {cellEditable ? (
                                          <input
                                            type="number"
                                            min="0"
                                            max="24"
                                            step="0.5"
                                            value={row.hours[day.dateStr] || ''}
                                            onChange={(e) => handleCellChange(row.key, day.dateStr, e.target.value, 'regular')}
                                            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = DT.primary; }}
                                            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = DT.border; }}
                                            style={{ ...inputBaseStyle, width: 38 }}
                                          />
                                        ) : (
                                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 32, fontSize: 13, color: dayLocked ? '#64748b' : '#475569' }}>
                                            {row.hours[day.dateStr] || 0}
                                          </span>
                                        )}
                                      </td>
                                      <td
                                        title={dayLocked ? 'Locked — past edit window' : undefined}
                                        style={{
                                          ...tdStyle,
                                          textAlign: 'center',
                                          height: 48,
                                          backgroundColor: cellBg,
                                        }}
                                      >
                                        {cellEditable ? (
                                          <input
                                            type="number"
                                            min="0"
                                            max="24"
                                            step="0.5"
                                            value={row.overtimeHours[day.dateStr] || ''}
                                            onChange={(e) => handleCellChange(row.key, day.dateStr, e.target.value, 'overtime')}
                                            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#F59E0B'; }}
                                            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = DT.border; }}
                                            style={{ ...inputBaseStyle, width: 38, color: '#F59E0B' }}
                                          />
                                        ) : (
                                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 32, fontSize: 13, color: dayLocked ? '#64748b' : '#F59E0B' }}>
                                            {row.overtimeHours[day.dateStr] || 0}
                                          </span>
                                        )}
                                      </td>
                                    </React.Fragment>
                                  );
                                })}
                                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 13, height: 48, borderLeft: `2px solid ${DT.primary}40` }}>
                                  {rowR}
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 13, height: 48, color: '#F59E0B' }}>
                                  {rowOT}
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 14, height: 48, color: DT.primary }}>
                                  {rowR + rowOT}
                                </td>
                              </tr>
                            );
                          })
                        )}
                        {gridRows.length > 0 && (
                          <tr style={{ backgroundColor: totalRowBg }}>
                            {weekDays.map((day) => {
                              const r = gridRows.reduce((s, row) => s + (row.hours[day.dateStr] || 0), 0);
                              const ot = columnOvertimeTotals[day.dateStr] || 0;
                              return (
                                <React.Fragment key={day.dateStr}>
                                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 13, height: 48, borderLeft: `1px solid ${DT.border}` }}>
                                    {r}
                                  </td>
                                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 13, height: 48, color: '#F59E0B' }}>
                                    {ot}
                                  </td>
                                </React.Fragment>
                              );
                            })}
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 13, height: 48, borderLeft: `2px solid ${DT.primary}40` }}>
                              {gridRows.reduce((s, r) => s + computeRowTotalFromMap(r.hours), 0)}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 13, height: 48, color: '#F59E0B' }}>
                              {gridRows.reduce((s, r) => s + computeRowTotalFromMap(r.overtimeHours), 0)}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 14, height: 48, color: DT.primary }}>
                              {grandTotal}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                  <table style={{ ...tableStyle, borderRadius: 0 }}>
                    <thead>
                      <tr>
                        {weekDays.map((day) => {
                          const dayLocked = isDayLocked(day.dateStr);
                          return (
                            <th
                              key={day.dateStr}
                              title={dayLocked ? 'Locked \u2014 past edit window' : undefined}
                              style={{
                                ...thCenterStyle,
                                width: 74,
                                height: 52,
                                verticalAlign: 'middle',
                                backgroundColor: isSaudiWeekend(day.dateStr) ? weekendBg : dayLocked ? '#1e293b' : '#1a2744',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                                {day.dayShort}
                                {dayLocked && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                  </svg>
                                )}
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2, color: dayLocked ? '#64748b' : undefined }}>
                                {format(day.date, 'ddMMM')}
                              </div>
                            </th>
                          );
                        })}
                        {/* TOTAL is split into Regular | OT | Grand sub-columns
                            so the keeper sees the derived overtime even though
                            they only enter total hours per day. */}
                        <th style={{ ...thCenterStyle, width: 48, height: 52, verticalAlign: 'middle', borderLeft: `2px solid ${DT.primary}40`, fontSize: 11 }}>
                          R
                        </th>
                        <th style={{ ...thCenterStyle, width: 48, height: 52, verticalAlign: 'middle', color: '#F59E0B', fontSize: 11 }}>
                          OT
                        </th>
                        <th style={{ ...thCenterStyle, width: 52, height: 52, verticalAlign: 'middle', color: DT.primary, fontSize: 11 }}>
                          ALL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {gridRows.length === 0 ? (
                        <tr>
                          <td colSpan={weekDays.length + 1} style={{ ...tdStyle, textAlign: 'center', padding: 32, color: DT.textMuted }}>
                            &nbsp;
                          </td>
                        </tr>
                      ) : (
                        gridRows.map((row) => {
                          const split = autoRowSplits.get(row.key) ?? { regular: 0, overtime: 0, total: 0 };
                          return (
                            <tr key={row.key}>
                              {weekDays.map((day) => {
                                const isWeekendDay = isSaudiWeekend(day.dateStr);
                                const dayLocked = isDayLocked(day.dateStr);
                                const cellEditable = isEditable && !dayLocked;
                                return (
                                  <td
                                    key={day.dateStr}
                                    title={dayLocked ? 'Locked \u2014 past edit window' : undefined}
                                    style={{
                                      ...tdStyle,
                                      textAlign: 'center',
                                      height: 48,
                                      backgroundColor: isWeekendDay ? weekendBg : dayLocked ? '#1e293b' : undefined,
                                    }}
                                  >
                                    {cellEditable ? (
                                      <input
                                        type="number"
                                        min="0"
                                        max="24"
                                        step="0.5"
                                        value={row.hours[day.dateStr] || ''}
                                        onChange={(e) => handleCellChange(row.key, day.dateStr, e.target.value)}
                                        onFocus={(e) => {
                                          (e.target as HTMLInputElement).style.borderColor = DT.primary;
                                        }}
                                        onBlur={(e) => {
                                          (e.target as HTMLInputElement).style.borderColor = DT.border;
                                        }}
                                        style={inputBaseStyle}
                                      />
                                    ) : (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: 52,
                                          height: 36,
                                          fontSize: 14,
                                          color: dayLocked ? '#64748b' : '#475569',
                                        }}
                                      >
                                        {row.hours[day.dateStr] || 0}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 13, height: 48, borderLeft: `2px solid ${DT.primary}40` }}>
                                {split.regular}
                              </td>
                              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 13, height: 48, color: '#F59E0B' }}>
                                {split.overtime}
                              </td>
                              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 14, height: 48, color: DT.primary }}>
                                {split.total}
                              </td>
                            </tr>
                          );
                        })
                      )}
                      {/* ── Total Row ── */}
                      {gridRows.length > 0 && (
                        <tr style={{ backgroundColor: totalRowBg }}>
                          {weekDays.map((day) => (
                            <td
                              key={day.dateStr}
                              style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 14, height: 48 }}
                            >
                              {columnTotals[day.dateStr] || 0}
                            </td>
                          ))}
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 13, height: 48, borderLeft: `2px solid ${DT.primary}40` }}>
                            {autoGrandSplit.regular}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 13, height: 48, color: '#F59E0B' }}>
                            {autoGrandSplit.overtime}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 14, height: 48, color: DT.primary }}>
                            {autoGrandSplit.total}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Footer: Add Employee + Count + CSV ────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isEditable && (
                <button
                  onClick={() => setAddEmployeeOpen(true)}
                  style={{
                    ...btnStyle('transparent'),
                    color: DT.primary,
                    border: `1px solid ${DT.primary}`,
                    padding: '8px 16px',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Employee
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 13, color: DT.textMuted }}>
                Showing {gridRows.length} {gridRows.length === 1 ? 'entry' : 'entries'}
              </span>
              <button
                onClick={handleExportCSV}
                disabled={gridRows.length === 0}
                style={{
                  ...outlineBtnStyle,
                  opacity: gridRows.length === 0 ? 0.4 : 1,
                }}
              >
                CSV
              </button>
            </div>
          </div>
        </>
        )}
      </div>

      {/* ── Dialogs + Snackbar ─────────────────────────── */}
      {isWeb && (
        <MuiThemeProvider isDark={isDark}>
          {/* Add Employee Dialog */}
          {Dialog && (
            <Dialog
              open={addEmployeeOpen}
              onClose={() => {
                setAddEmployeeOpen(false);
                setSelectedProfile(null);
                setSelectedSupplier(null);
                setManualEmployee({ name: '', number: '', designation: '' });
                setEmployeeSearchResults([]);
              }}
              maxWidth="sm"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: 3,
                  backgroundImage: 'none',
                },
              }}
            >
              <DialogTitle
                sx={{
                  pb: 1,
                  pt: 3,
                  px: 3,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700 }}>Add Employee</div>
                <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.6, marginTop: 2 }}>
                  Search for an existing employee or enter details manually
                </div>
              </DialogTitle>
              <DialogContent
                sx={{
                  pt: '24px !important',
                  pb: 1,
                  px: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  overflow: 'visible',
                }}
              >
                {/* Autocomplete search */}
                {Autocomplete && (
                  <Autocomplete
                    options={employeeSearchResults}
                    getOptionLabel={(option: Profile) => `${option.full_name} (${option.email})`}
                    value={selectedProfile}
                    onChange={(_: any, newValue: Profile | null) => {
                      setSelectedProfile(newValue);
                      if (newValue) {
                        setManualEmployee({ name: '', number: '', designation: '' });
                      }
                    }}
                    onInputChange={(_: any, inputValue: string) => {
                      handleSearchEmployees(inputValue);
                    }}
                    renderInput={(params: any) => (
                      <TextField
                        {...params}
                        label="Search Employee"
                        placeholder="Type name or email..."
                        size="small"
                        fullWidth
                      />
                    )}
                    noOptionsText="No employees found"
                    clearOnBlur={false}
                    filterOptions={(x: any) => x}
                  />
                )}

                <div
                  style={{
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    color: isDark ? DT.textMuted : '#94A3B8',
                    margin: '4px 0',
                  }}
                >
                  -- OR enter manually --
                </div>

                <TextField
                  label="Employee Name"
                  value={manualEmployee.name}
                  onChange={(e: any) => {
                    setManualEmployee((m) => ({ ...m, name: e.target.value }));
                    if (e.target.value) setSelectedProfile(null);
                  }}
                  fullWidth
                  size="small"
                  disabled={!!selectedProfile}
                />
                <div style={{ display: 'flex', gap: 12 }}>
                  <TextField
                    label="Employee Number"
                    value={manualEmployee.number}
                    onChange={(e: any) => setManualEmployee((m) => ({ ...m, number: e.target.value }))}
                    fullWidth
                    size="small"
                    disabled={!!selectedProfile}
                  />
                  <TextField
                    label="Designation"
                    value={manualEmployee.designation}
                    onChange={(e: any) => setManualEmployee((m) => ({ ...m, designation: e.target.value }))}
                    fullWidth
                    size="small"
                    disabled={!!selectedProfile}
                  />
                </div>

                {/* Supplier picker */}
                <div
                  style={{
                    borderTop: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                    paddingTop: 16,
                    marginTop: 8,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? DT.textMuted : '#94A3B8', marginBottom: 8 }}>
                    Supplier / Vendor (optional)
                  </div>
                  {Autocomplete && (
                    <Autocomplete
                      options={suppliers}
                      getOptionLabel={(option: Supplier) => `${option.name}${option.code ? ` (${option.code})` : ''}`}
                      value={selectedSupplier}
                      onChange={(_: any, newValue: Supplier | null) => setSelectedSupplier(newValue)}
                      renderInput={(params: any) => (
                        <TextField
                          {...params}
                          label="Select Supplier"
                          placeholder="Search suppliers..."
                          size="small"
                          fullWidth
                        />
                      )}
                      noOptionsText="No suppliers found"
                      clearOnBlur={false}
                    />
                  )}
                </div>
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <MuiButton
                  onClick={() => {
                    setAddEmployeeOpen(false);
                    setSelectedProfile(null);
                    setSelectedSupplier(null);
                    setManualEmployee({ name: '', number: '', designation: '' });
                    setEmployeeSearchResults([]);
                  }}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Cancel
                </MuiButton>
                <MuiButton
                  variant="contained"
                  onClick={handleAddEmployee}
                  disabled={!selectedProfile && !manualEmployee.name.trim()}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 3,
                  }}
                >
                  Add Employee
                </MuiButton>
              </DialogActions>
            </Dialog>
          )}

          {/* Auto-Fill Dialog */}
          {Dialog && (
            <Dialog
              open={autoFillOpen}
              onClose={() => setAutoFillOpen(false)}
              maxWidth="xs"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: 3,
                  backgroundImage: 'none',
                },
              }}
            >
              <DialogTitle
                sx={{
                  pb: 1,
                  pt: 3,
                  px: 3,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700 }}>Auto-Fill Hours</div>
                <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.6, marginTop: 2 }}>
                  Fill all weekday cells (Sun-Thu) for every employee
                </div>
              </DialogTitle>
              <DialogContent
                sx={{
                  pt: '24px !important',
                  pb: 1,
                  px: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <TextField
                  label="Hours per day"
                  type="number"
                  value={autoFillHours}
                  onChange={(e: any) => setAutoFillHours(e.target.value)}
                  fullWidth
                  size="small"
                  inputProps={{ min: 0, max: 24, step: 0.5 }}
                />
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <MuiButton onClick={() => setAutoFillOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Cancel
                </MuiButton>
                <MuiButton
                  variant="contained"
                  onClick={handleAutoFill}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 3,
                  }}
                >
                  Fill Hours
                </MuiButton>
              </DialogActions>
            </Dialog>
          )}

          {/* Project-hours change request dialog */}
          {Dialog && selectedProject && (
            <Dialog
              open={hoursChangeOpen}
              onClose={() => !hoursChangeSubmitting && setHoursChangeOpen(false)}
              maxWidth="sm"
              fullWidth
              PaperProps={{ sx: { borderRadius: 3, backgroundImage: 'none' } }}
            >
              <DialogTitle sx={{ pb: 1, pt: 3, px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Request Hours Change</div>
                <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.6, marginTop: 2 }}>
                  {selectedProject.project_number} · {selectedProject.name}
                </div>
              </DialogTitle>
              <DialogContent sx={{ pt: '24px !important', pb: 1, px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Scope"
                  value={hoursChangeScope}
                  onChange={(e: any) => setHoursChangeScope(e.target.value)}
                  fullWidth
                  size="small"
                  select
                  helperText={
                    hoursChangeScope === ProjectHoursChangeScope.ThisWeek
                      ? `Override applies to the week starting ${weekStartStr} only.`
                      : hoursChangeScope === ProjectHoursChangeScope.FromWeekForward
                      ? `Permanent change to the project baseline, starting ${weekStartStr}.`
                      : `Correction to a prior week (${weekStartStr}). Allowed only if that month is still open.`
                  }
                >
                  <MenuItem value={ProjectHoursChangeScope.ThisWeek}>This week only</MenuItem>
                  <MenuItem value={ProjectHoursChangeScope.FromWeekForward}>From this week forward (permanent)</MenuItem>
                  <MenuItem value={ProjectHoursChangeScope.RetroactiveWeek}>Retroactive (correct prior week)</MenuItem>
                </TextField>
                <div style={{ display: 'flex', gap: 12 }}>
                  <TextField
                    label="Current"
                    value={`${selectedProject.regular_hours_per_day} h/day`}
                    fullWidth
                    size="small"
                    disabled
                  />
                  <TextField
                    label="Requested"
                    type="number"
                    value={hoursChangeValue}
                    onChange={(e: any) => setHoursChangeValue(e.target.value)}
                    fullWidth
                    size="small"
                    required
                    error={!!hoursChangeValue && (Number.isNaN(parseFloat(hoursChangeValue)) || parseFloat(hoursChangeValue) <= 0 || parseFloat(hoursChangeValue) > 24)}
                    inputProps={{ min: 0.5, max: 24, step: 0.5 }}
                    helperText={
                      !!hoursChangeValue && (Number.isNaN(parseFloat(hoursChangeValue)) || parseFloat(hoursChangeValue) <= 0 || parseFloat(hoursChangeValue) > 24)
                        ? 'Must be between 0.5 and 24'
                        : undefined
                    }
                  />
                </div>
                <TextField
                  label="Reason"
                  value={hoursChangeReason}
                  onChange={(e: any) => setHoursChangeReason(e.target.value)}
                  fullWidth
                  size="small"
                  required
                  multiline
                  rows={3}
                  placeholder="Why is this change needed? GM/HR Director will see this when approving."
                  helperText="Required. GM/HR Director uses this to decide."
                />
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <MuiButton
                  onClick={() => setHoursChangeOpen(false)}
                  disabled={hoursChangeSubmitting}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Cancel
                </MuiButton>
                <MuiButton
                  variant="contained"
                  onClick={handleSubmitHoursChange}
                  disabled={
                    hoursChangeSubmitting ||
                    !hoursChangeScope ||
                    !hoursChangeValue.trim() ||
                    Number.isNaN(parseFloat(hoursChangeValue)) ||
                    parseFloat(hoursChangeValue) <= 0 ||
                    parseFloat(hoursChangeValue) > 24 ||
                    !hoursChangeReason.trim()
                  }
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
                >
                  {hoursChangeSubmitting ? 'Submitting…' : 'Submit Request'}
                </MuiButton>
              </DialogActions>
            </Dialog>
          )}

          {/* Snackbar */}
          {Snackbar && (
            <Snackbar
              open={snackbar.open}
              autoHideDuration={4000}
              onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              <Alert
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                severity={snackbar.severity}
                variant="filled"
              >
                {snackbar.message}
              </Alert>
            </Snackbar>
          )}
        </MuiThemeProvider>
      )}
    </View>
  );
}

// ============================================================
// MOBILE COMPONENT
// ============================================================

function MobileTimesheetEntry({ isDark }: { isDark: boolean }) {
  const { user } = useAuth();

  const {
    entries,
    entriesLoading,
    fetchEntriesForWeek,
    assignments,
    assignmentsLoading,
    fetchAssignments,
    fetchMyAssignments,
    currentSubmission,
    fetchSubmissionForWeek,
    upsertEntries,
    submitForApproval,
  } = useTimesheets();

  const { projects, fetchAll: fetchAllProjects } = useProjects();
  const { suppliers, fetchAll: fetchAllSuppliers } = useSuppliers();

  const isHR = user?.role === Role.HR || user?.role === Role.HRDirector;

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekRange(new Date()).weekStart);
  const [gridRows, setGridRows] = useState<GridRow[]>([]);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const weekLabel = useMemo(() => formatWeekRange(weekStart, weekEnd), [weekStart, weekEnd]);
  const weekStartStr = useMemo(() => format(weekStart, 'yyyy-MM-dd'), [weekStart]);
  const weekEndStr = useMemo(() => format(weekEnd, 'yyyy-MM-dd'), [weekEnd]);

  const availableProjects = useMemo(() => {
    if (isHR) return projects;
    const projectIds = assignments.map((a) => a.project_id);
    return projects.filter((p) => projectIds.includes(p.id));
  }, [isHR, assignments, projects]);

  const keeperByProject = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of assignments) {
      if (!a.is_active) continue;
      const name = a.assigned_to?.full_name ?? 'Unknown';
      if (map[a.project_id]) {
        map[a.project_id] += `, ${name}`;
      } else {
        map[a.project_id] = name;
      }
    }
    return map;
  }, [assignments]);

  const selectedProject = useMemo(
    () => availableProjects.find((p) => p.id === selectedProjectId) || null,
    [availableProjects, selectedProjectId],
  );

  const submissionStatus: TimesheetSubmissionStatus | null = currentSubmission?.status ?? null;

  const grandTotal = useMemo(
    () => gridRows.reduce((sum, r) => sum + computeRowTotalFromMap(r.hours), 0),
    [gridRows],
  );

  useEffect(() => {
    if (!user) return;
    fetchAllProjects();
    fetchAllSuppliers();
    if (isHR) {
      fetchAssignments();
    } else {
      fetchMyAssignments(user.id);
    }
  }, [user, isHR]);

  useEffect(() => {
    if (availableProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(availableProjects[0].id);
    }
  }, [availableProjects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    fetchEntriesForWeek(selectedProjectId, weekStartStr, weekEndStr);
    fetchSubmissionForWeek(selectedProjectId, weekStartStr);
  }, [selectedProjectId, weekStartStr, weekEndStr]);

  useEffect(() => {
    setGridRows(buildGridRows(entries, weekDays));
  }, [entries]);

  const goToPrevWeek = useCallback(() => {
    setWeekStart((prev) => subDays(prev, 7));
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => addDays(prev, 7));
  }, []);

  // Editable only in draft/rejected/not-yet-submitted states — mirrors
  // the web (WebTimesheetEntry.isEditable). Submitted/approved weeks are
  // read-only until an approver sends them back.
  const isEditable =
    submissionStatus === null ||
    submissionStatus === TimesheetSubmissionStatus.Draft ||
    submissionStatus === TimesheetSubmissionStatus.Rejected;

  const handleCellChange = useCallback((rowKey: string, dateStr: string, value: string) => {
    if (isDayLocked(dateStr)) return;
    const parsed = parseFloat(value);
    const next = isNaN(parsed) ? 0 : Math.min(24, Math.max(0, parsed));
    setGridRows((prev) =>
      prev.map((r) => (r.key === rowKey ? { ...r, hours: { ...r.hours, [dateStr]: next } } : r)),
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedProjectId || !user) return;
    setSaving(true);
    setFeedback(null);
    try {
      const drafts = gridRowsToDrafts(gridRows, selectedProjectId, selectedProject?.regular_hours_per_day ?? 8, selectedProject?.entry_mode);
      await upsertEntries(drafts, user.id);
      await fetchEntriesForWeek(selectedProjectId, weekStartStr, weekEndStr);
      setFeedback('Timesheet saved');
    } catch (err: any) {
      setFeedback(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [selectedProjectId, selectedProject, user, gridRows, weekStartStr, weekEndStr, upsertEntries, fetchEntriesForWeek]);

  const handleSubmit = useCallback(async () => {
    if (!selectedProjectId || !user) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const drafts = gridRowsToDrafts(gridRows, selectedProjectId, selectedProject?.regular_hours_per_day ?? 8, selectedProject?.entry_mode);
      await upsertEntries(drafts, user.id);
      await submitForApproval(selectedProjectId, weekStartStr, weekEndStr, user.id, user.role);
      await fetchSubmissionForWeek(selectedProjectId, weekStartStr);
      setFeedback('Submitted for approval');
    } catch (err: any) {
      setFeedback(err?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }, [selectedProjectId, selectedProject, user, gridRows, weekStartStr, weekEndStr, upsertEntries, submitForApproval, fetchSubmissionForWeek]);

  const [autoFillHours, setAutoFillHours] = useState('');

  // Copy the previous week's hours into the current week (skip locked days).
  const handleCopyLastWeek = useCallback(async () => {
    if (!selectedProjectId) return;
    const prevWeekStart = subDays(weekStart, 7);
    const prevStartStr = format(prevWeekStart, 'yyyy-MM-dd');
    const prevEndStr = format(addDays(prevWeekStart, 6), 'yyyy-MM-dd');
    try {
      const prevEntries = await timesheetService.getEntriesForWeek(selectedProjectId, prevStartStr, prevEndStr);
      if (prevEntries.length === 0) { setFeedback('No entries for previous week'); return; }
      const prevWeekDays = getWeekDays(prevWeekStart);
      const prevRows = buildGridRows(prevEntries, prevWeekDays, selectedProject?.entry_mode);
      const newRows: GridRow[] = prevRows.map((prevRow) => {
        const hours: Record<string, number> = {};
        const overtimeHours: Record<string, number> = {};
        weekDays.forEach((currentDay, idx) => {
          const prevDay = prevWeekDays[idx];
          if (isDayLocked(currentDay.dateStr)) { hours[currentDay.dateStr] = 0; overtimeHours[currentDay.dateStr] = 0; }
          else { hours[currentDay.dateStr] = prevRow.hours[prevDay.dateStr] || 0; overtimeHours[currentDay.dateStr] = prevRow.overtimeHours[prevDay.dateStr] || 0; }
        });
        return { ...prevRow, hours, overtimeHours };
      });
      setGridRows(newRows);
      setFeedback('Copied hours from previous week');
    } catch (err: any) { setFeedback(err?.message || 'Failed to copy last week'); }
  }, [selectedProjectId, selectedProject, weekStart, weekDays]);

  // Fill every non-weekend, non-locked day with the given hours.
  const handleAutoFill = useCallback(() => {
    const h = parseFloat(autoFillHours);
    if (isNaN(h) || h < 0 || h > 24) { setFeedback('Enter hours between 0 and 24'); return; }
    setGridRows((prev) =>
      prev.map((row) => {
        const hours = { ...row.hours };
        for (const day of weekDays) {
          if (!isSaudiWeekend(day.dateStr) && !isDayLocked(day.dateStr)) hours[day.dateStr] = h;
        }
        return { ...row, hours };
      }),
    );
    setFeedback(`Auto-filled ${h}h on weekdays`);
  }, [autoFillHours, weekDays]);

  const handleExport = useCallback(() => {
    if (gridRows.length === 0) return;
    exportGridToCSV(gridRows, weekDays, selectedProject?.name || 'project', weekLabel);
  }, [gridRows, weekDays, selectedProject, weekLabel]);

  // ── Add Employee (mobile: inline search + add) ────────────
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [addResults, setAddResults] = useState<Profile[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (addSearch.trim().length < 2) { setAddResults([]); return; }
    userService
      .getEmployees({ search: addSearch.trim(), is_active: true })
      .then((res) => { if (!cancelled) setAddResults(res); })
      .catch(() => { if (!cancelled) setAddResults([]); });
    return () => { cancelled = true; };
  }, [addSearch]);

  const addEmployeeRow = useCallback((profile: Profile) => {
    if (gridRows.some((r) => r.employee_id === profile.id)) { setFeedback('Employee already in the timesheet'); return; }
    const hours: Record<string, number> = {};
    const overtimeHours: Record<string, number> = {};
    for (const day of weekDays) { hours[day.dateStr] = 0; overtimeHours[day.dateStr] = 0; }
    const newRow: GridRow = {
      key: profile.id,
      employee_id: profile.id,
      employee_name: profile.full_name,
      employee_number: (profile as any).emp_code ?? null,
      designation: profile.department,
      supplier_id: null,
      supplier_name: null,
      shift: 'D',
      hours,
      overtimeHours,
    };
    setGridRows((prev) => [...prev, newRow]);
    setAddSearch('');
    setAddResults([]);
    setAddOpen(false);
    setFeedback(`Added ${profile.full_name}`);
  }, [gridRows, weekDays]);

  // ── Request Hours Change (HR/HRD/Manager: retroactive/forward) ──
  const canRequestHoursChange = !!user && (user.role === Role.HR || user.role === Role.HRDirector || user.role === Role.Manager);
  const [hcOpen, setHcOpen] = useState(false);
  const [hcScope, setHcScope] = useState<ProjectHoursChangeScope>(ProjectHoursChangeScope.ThisWeek);
  const [hcValue, setHcValue] = useState('');
  const [hcReason, setHcReason] = useState('');
  const [hcSubmitting, setHcSubmitting] = useState(false);

  const openHoursChange = useCallback(() => {
    if (!selectedProject) return;
    setHcScope(ProjectHoursChangeScope.ThisWeek);
    setHcValue(String(selectedProject.regular_hours_per_day));
    setHcReason('');
    setHcOpen(true);
  }, [selectedProject]);

  const submitHoursChange = useCallback(async () => {
    if (!selectedProject || !user) return;
    const requested = parseFloat(hcValue);
    if (Number.isNaN(requested) || requested <= 0 || requested > 24) { setFeedback('Requested hours must be between 0.5 and 24'); return; }
    const reason = hcReason.trim();
    if (!reason) { setFeedback('Reason is required'); return; }
    setHcSubmitting(true);
    try {
      await projectHoursChangeService.create(
        { project_id: selectedProject.id, scope: hcScope, week_start: weekStartStr, current_value: selectedProject.regular_hours_per_day, requested_value: requested, reason },
        user.id,
        user.role,
      );
      setHcOpen(false);
      setFeedback('Change request submitted');
    } catch (err: any) { setFeedback(err?.message || 'Failed to submit request'); }
    finally { setHcSubmitting(false); }
  }, [selectedProject, user, hcScope, hcValue, hcReason, weekStartStr]);

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-[#0F172A]" edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: isDark ? '#F8FAFC' : '#0F172A' }}>
          Timesheet Entry
        </Text>
        <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
          Enter daily hours for your projects
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8, flexGrow: 1 }}>
        {availableProjects.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-base font-semibold text-text-primary dark:text-white mb-2">
              {isHR ? 'No Projects Found' : 'No Project Assignments'}
            </Text>
            <Text className="text-sm text-text-muted dark:text-slate-400 text-center px-8">
              {isHR ? 'No projects have been created yet.' : 'You have not been assigned to any projects yet. Contact your administrator.'}
            </Text>
          </View>
        ) : (
          <>
            {/* Project selector (mobile) */}
            <View className="mb-3 p-4 rounded-xl border border-border dark:border-slate-700 bg-surface dark:bg-slate-800">
              <Text className="text-xs text-text-muted dark:text-slate-400 mb-1 font-semibold">PROJECT</Text>
              <Text className="text-base font-bold text-text-primary dark:text-white">
                {selectedProject ? `${selectedProject.project_number} - ${selectedProject.name}` : 'None selected'}
              </Text>
              {selectedProjectId && keeperByProject[selectedProjectId] && (
                <Text className="text-xs text-amber-400 mt-1 font-semibold">
                  Assigned to: {keeperByProject[selectedProjectId]}
                </Text>
              )}
            </View>

            {/* Week display (mobile) */}
            <View className="mb-3 p-4 rounded-xl border border-border dark:border-slate-700 bg-surface dark:bg-slate-800">
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={goToPrevWeek}
                  className="w-10 h-10 items-center justify-center rounded-full active:opacity-70"
                >
                  <Text className="text-lg font-bold text-text-primary dark:text-white">{'<'}</Text>
                </Pressable>
                <View className="flex-1 items-center">
                  <Text className="text-xs text-text-muted dark:text-slate-400 font-semibold">WEEK</Text>
                  <Text className="text-sm font-bold text-text-primary dark:text-white mt-0.5">
                    {weekLabel}
                  </Text>
                </View>
                <Pressable
                  onPress={goToNextWeek}
                  className="w-10 h-10 items-center justify-center rounded-full active:opacity-70"
                >
                  <Text className="text-lg font-bold text-text-primary dark:text-white">{'>'}</Text>
                </Pressable>
              </View>
            </View>

            {/* Status (mobile) */}
            <View className="mb-3 p-3 rounded-xl border border-border dark:border-slate-700 bg-surface dark:bg-slate-800 flex-row items-center justify-between">
              <Text className="text-xs text-text-muted dark:text-slate-400 font-semibold">STATUS</Text>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 10,
                  backgroundColor: getSubmissionBadgeStyle(submissionStatus).bg,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: getSubmissionBadgeStyle(submissionStatus).text,
                  }}
                >
                  {getSubmissionStatusLabel(submissionStatus)}
                </Text>
              </View>
            </View>

            {/* Editing status / feedback */}
            {!isEditable && (
              <View className="mb-3 p-3 rounded-xl border border-border dark:border-slate-700 bg-blue-900/20">
                <Text className="text-xs text-blue-400 text-center font-semibold">
                  This week is {getSubmissionStatusLabel(submissionStatus)} — editing is locked.
                </Text>
              </View>
            )}
            {feedback && (
              <View className="mb-3 p-3 rounded-xl border border-border dark:border-slate-700 bg-surface dark:bg-slate-800">
                <Text className="text-xs text-center font-semibold text-text-primary dark:text-white">{feedback}</Text>
              </View>
            )}

            {/* Quick actions */}
            {gridRows.length > 0 && (
              <View className="mb-3 flex-row flex-wrap items-center gap-2">
                {isEditable && (
                  <Pressable onPress={handleCopyLastWeek} className="px-3 py-2 rounded-lg border border-border dark:border-slate-700 bg-surface dark:bg-slate-800 active:opacity-80">
                    <Text className="text-xs font-semibold text-text-primary dark:text-white">Copy Last Week</Text>
                  </Pressable>
                )}
                {isEditable && (
                  <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg border border-border dark:border-slate-700 bg-surface dark:bg-slate-800">
                    <TextInput
                      value={autoFillHours}
                      onChangeText={setAutoFillHours}
                      keyboardType="numeric"
                      placeholder="hrs"
                      placeholderTextColor="#94A3B8"
                      className="text-xs text-text-primary dark:text-white"
                      style={{ width: 40, paddingVertical: 4, textAlign: 'center' }}
                    />
                    <Pressable onPress={handleAutoFill} className="px-2 py-1 rounded bg-primary active:opacity-80">
                      <Text className="text-xs font-semibold text-white">Fill all</Text>
                    </Pressable>
                  </View>
                )}
                <Pressable onPress={handleExport} className="px-3 py-2 rounded-lg border border-border dark:border-slate-700 bg-surface dark:bg-slate-800 active:opacity-80">
                  <Text className="text-xs font-semibold text-text-primary dark:text-white">Export CSV</Text>
                </Pressable>
              </View>
            )}

            {/* Add Employee (mobile: inline search) */}
            {isEditable && (
              <View className="mb-3">
                <Pressable
                  onPress={() => setAddOpen((v) => !v)}
                  className="flex-row items-center justify-center rounded-lg border border-dashed border-border dark:border-slate-600 py-2.5 active:opacity-80"
                >
                  <Text className="text-xs font-semibold text-primary dark:text-blue-400">
                    {addOpen ? 'Close' : '+ Add Employee'}
                  </Text>
                </Pressable>
                {addOpen && (
                  <View className="mt-2 p-3 rounded-xl border border-border dark:border-slate-700 bg-surface dark:bg-slate-800">
                    <TextInput
                      value={addSearch}
                      onChangeText={setAddSearch}
                      placeholder="Search employee (name or code)…"
                      placeholderTextColor="#94A3B8"
                      className="border border-border dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-text-primary dark:text-white bg-background dark:bg-slate-900"
                    />
                    {addResults.map((p) => (
                      <Pressable
                        key={p.id}
                        onPress={() => addEmployeeRow(p)}
                        className="mt-2 p-2 rounded-lg flex-row justify-between items-center active:opacity-70"
                      >
                        <Text className="text-sm text-text-primary dark:text-white flex-1">{p.full_name}</Text>
                        <Text className="text-xs text-text-muted dark:text-slate-400 ml-2">{(p as any).emp_code || ''}</Text>
                      </Pressable>
                    ))}
                    {addSearch.trim().length >= 2 && addResults.length === 0 && (
                      <Text className="text-xs text-text-muted dark:text-slate-400 mt-2 text-center">No matches</Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Request Hours Change (HR/HRD/Manager) */}
            {canRequestHoursChange && selectedProject && (
              <View className="mb-3">
                {!hcOpen ? (
                  <Pressable onPress={openHoursChange} className="flex-row items-center justify-center rounded-lg border border-border dark:border-slate-700 py-2.5 active:opacity-80">
                    <Text className="text-xs font-semibold text-text-primary dark:text-white">Request Hours Change</Text>
                  </Pressable>
                ) : (
                  <View className="p-3 rounded-xl border border-border dark:border-slate-700 bg-surface dark:bg-slate-800">
                    <Text className="text-xs font-semibold text-text-muted dark:text-slate-400 mb-2">SCOPE</Text>
                    <View className="flex-row flex-wrap gap-2 mb-3">
                      {[
                        { s: ProjectHoursChangeScope.ThisWeek, l: 'This week' },
                        { s: ProjectHoursChangeScope.FromWeekForward, l: 'From week forward' },
                        { s: ProjectHoursChangeScope.RetroactiveWeek, l: 'Retroactive' },
                      ].map((o) => (
                        <Pressable
                          key={o.s}
                          onPress={() => setHcScope(o.s)}
                          style={{
                            paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
                            borderColor: hcScope === o.s ? '#2563EB' : (isDark ? '#334155' : '#E2E8F0'),
                            backgroundColor: hcScope === o.s ? (isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF') : 'transparent',
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: hcScope === o.s ? '#2563EB' : (isDark ? '#94A3B8' : '#64748B') }}>{o.l}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View className="flex-row items-center gap-2 mb-3">
                      <Text className="text-xs text-text-muted dark:text-slate-400">Requested h/day</Text>
                      <TextInput
                        value={hcValue}
                        onChangeText={setHcValue}
                        keyboardType="numeric"
                        className="border border-border dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-text-primary dark:text-white bg-background dark:bg-slate-900 text-center"
                        style={{ width: 64 }}
                      />
                    </View>
                    <TextInput
                      value={hcReason}
                      onChangeText={setHcReason}
                      placeholder="Reason…"
                      placeholderTextColor="#94A3B8"
                      multiline
                      className="border border-border dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-text-primary dark:text-white bg-background dark:bg-slate-900 mb-3"
                      style={{ minHeight: 60, textAlignVertical: 'top' }}
                    />
                    <View className="flex-row gap-2">
                      <Pressable onPress={() => setHcOpen(false)} className="flex-1 items-center py-2.5 rounded-lg border border-border dark:border-slate-700 active:opacity-80">
                        <Text className="text-xs font-semibold text-text-primary dark:text-white">Cancel</Text>
                      </Pressable>
                      <Pressable onPress={submitHoursChange} disabled={hcSubmitting} className="flex-1 items-center py-2.5 rounded-lg bg-primary active:opacity-80" style={{ opacity: hcSubmitting ? 0.6 : 1 }}>
                        <Text className="text-xs font-semibold text-white">{hcSubmitting ? 'Submitting…' : 'Submit Request'}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Read-only employee cards (mobile) */}
            {entriesLoading ? (
              <View className="py-8 items-center">
                <Text className="text-sm text-text-muted dark:text-slate-400">Loading entries...</Text>
              </View>
            ) : gridRows.length === 0 ? (
              <View className="py-8 items-center">
                <Text className="text-sm text-text-muted dark:text-slate-400">No entries for this week</Text>
              </View>
            ) : (
              gridRows.map((row, idx) => {
                const rowTotal = computeRowTotalFromMap(row.hours);
                return (
                  <View
                    key={row.key}
                    className="mb-3 p-4 rounded-xl border border-border dark:border-slate-700 bg-surface dark:bg-slate-800"
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1 mr-3">
                        <Text className="text-base font-bold text-text-primary dark:text-white">
                          {row.employee_name}
                        </Text>
                        <Text className="text-xs text-text-muted dark:text-slate-400 mt-0.5">
                          {row.designation || 'No designation'}{row.supplier_name ? ` · ${row.supplier_name}` : ''} · {row.shift === 'N' ? 'Night' : 'Day'}
                        </Text>
                      </View>
                      <View className="bg-blue-900/30 px-2 py-1 rounded-md">
                        <Text className="text-xs font-bold text-blue-400">{rowTotal}h</Text>
                      </View>
                    </View>

                    {/* Daily hours */}
                    <View className="flex-row flex-wrap gap-1 mt-1">
                      {weekDays.map((day) => {
                        const h = row.hours[day.dateStr] || 0;
                        const isWeekendDay = isSaudiWeekend(day.dateStr);
                        return (
                          <View
                            key={day.dateStr}
                            style={{
                              width: '13%',
                              alignItems: 'center',
                              paddingVertical: 4,
                              borderRadius: 6,
                              backgroundColor: isWeekendDay
                                ? isDark ? '#1e293b' : '#f1f5f9'
                                : isDark ? '#0f172a' : '#f8fafc',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '600',
                                color: isDark ? '#64748b' : '#94a3b8',
                              }}
                            >
                              {day.dayShort}
                            </Text>
                            {isEditable && !isDayLocked(day.dateStr) ? (
                              <TextInput
                                value={h ? String(h) : ''}
                                onChangeText={(v) => handleCellChange(row.key, day.dateStr, v)}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={isDark ? '#475569' : '#cbd5e1'}
                                style={{
                                  fontSize: 13,
                                  fontWeight: '700',
                                  color: isDark ? '#FFFFFF' : '#0f172a',
                                  marginTop: 2,
                                  textAlign: 'center',
                                  width: '100%',
                                  paddingVertical: 0,
                                }}
                              />
                            ) : (
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: '700',
                                  color: h > 0 ? (isDark ? '#FFFFFF' : '#0f172a') : (isDark ? '#475569' : '#cbd5e1'),
                                  marginTop: 2,
                                }}
                              >
                                {h}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}

            {/* Mobile summary */}
            {gridRows.length > 0 && (
              <View className="mb-3 p-4 rounded-xl border border-border dark:border-slate-700 bg-surface dark:bg-slate-800">
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm font-semibold text-text-muted dark:text-slate-400">
                    Total ({gridRows.length} {gridRows.length === 1 ? 'employee' : 'employees'})
                  </Text>
                  <Text className="text-lg font-bold" style={{ color: DT.primary }}>
                    {grandTotal}h
                  </Text>
                </View>
              </View>
            )}

            {/* Save / Submit (editable weeks) */}
            {isEditable && gridRows.length > 0 && (
              <View className="flex-row gap-3 mb-8">
                <Pressable
                  onPress={handleSave}
                  disabled={saving || submitting}
                  className="flex-1 items-center justify-center rounded-xl py-3 border border-border dark:border-slate-700 bg-surface dark:bg-slate-800 active:opacity-80"
                  style={{ opacity: saving || submitting ? 0.6 : 1 }}
                >
                  <Text className="text-sm font-semibold text-text-primary dark:text-white">
                    {saving ? 'Saving…' : 'Save'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={saving || submitting}
                  className="flex-1 items-center justify-center rounded-xl py-3 bg-primary active:opacity-80"
                  style={{ opacity: saving || submitting ? 0.6 : 1 }}
                >
                  <Text className="text-sm font-semibold text-white">
                    {submitting ? 'Submitting…' : 'Submit for Approval'}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// MAIN EXPORT
// ============================================================

export default function TimesheetEntryScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const useWebLayout = isWeb && width >= WIDE_SCREEN_BREAKPOINT;

  if (useWebLayout) {
    return <WebTimesheetEntry isDark={isDark} />;
  }
  return <MobileTimesheetEntry isDark={isDark} />;
}
