import { AccessGate } from '@/components/access/access-gate';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Platform, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useViewState } from '@/hooks/use-view-state';
import { useColorScheme } from 'nativewind';
import { ScreenHeader } from '@/components/layout/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useTimesheets } from '@/hooks/use-timesheets';
import { useProjects } from '@/hooks/use-projects';
import { useAuth } from '@/hooks/use-auth';
import { userService } from '@/services';
import type { TimesheetAssignment } from '@/types/models';
import type { Profile, Project } from '@/types/models';

const isWeb = Platform.OS === 'web';
const WIDE_SCREEN_BREAKPOINT = 1280;

function useWindowWidth() {
  const [width, setWidth] = useState(() => (isWeb ? window.innerWidth : 0));
  useEffect(() => {
    if (!isWeb) return;
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

// Lazy-load MUI components only on web
let DataGrid: any;
let MuiThemeProvider: any;
let Chip: any;
let Dialog: any;
let DialogTitle: any;
let DialogContent: any;
let DialogActions: any;
let MuiButton: any;
let Autocomplete: any;
let TextField: any;
let Snackbar: any;
let Alert: any;

if (isWeb) {
  const dg = require('@mui/x-data-grid');
  DataGrid = dg.DataGrid;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  Chip = require('@mui/material/Chip').default;
  Dialog = require('@mui/material/Dialog').default;
  DialogTitle = require('@mui/material/DialogTitle').default;
  DialogContent = require('@mui/material/DialogContent').default;
  DialogActions = require('@mui/material/DialogActions').default;
  MuiButton = require('@mui/material/Button').default;
  Autocomplete = require('@mui/material/Autocomplete').default;
  TextField = require('@mui/material/TextField').default;
  Snackbar = require('@mui/material/Snackbar').default;
  Alert = require('@mui/material/Alert').default;
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
// WEB: ASSIGN KEEPER DIALOG
// ============================================================

function AssignKeeperDialog({
  open,
  isDark,
  projects,
  onClose,
  onAssigned,
}: {
  open: boolean;
  isDark: boolean;
  projects: Project[];
  onClose: () => void;
  onAssigned: (projectId: string, employeeId: string) => Promise<void>;
}) {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // Load employees when dialog opens
  useEffect(() => {
    if (!open) return;
    setEmployeesLoading(true);
    userService
      .getEmployees({ is_active: true })
      .then(setEmployees)
      .catch(() => {})
      .finally(() => setEmployeesLoading(false));
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedProject || !selectedEmployee) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAssigned(selectedProject.id, selectedEmployee.id);
      setSelectedProject(null);
      setSelectedEmployee(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign keeper');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setSelectedProject(null);
    setSelectedEmployee(null);
    setError(null);
    onClose();
  };

  if (!Dialog) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
        <div style={{ fontSize: 18, fontWeight: 700 }}>Assign Timesheet Keeper</div>
        <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.6, marginTop: 2 }}>
          Select a project and the employee who will manage its timesheet
        </div>
      </DialogTitle>
      <DialogContent
        sx={{
          pt: '24px !important',
          pb: 1,
          px: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          overflow: 'visible',
        }}
      >
        {/* Project selector */}
        <Autocomplete
          options={projects}
          getOptionLabel={(opt: Project) => `${opt.name} (${opt.project_number})`}
          value={selectedProject}
          onChange={(_: any, val: Project | null) => setSelectedProject(val)}
          filterOptions={(options: Project[], state: any) => {
            const q = (state.inputValue || '').toLowerCase();
            if (!q) return options;
            return options.filter(
              (p: Project) =>
                p.name.toLowerCase().includes(q) ||
                p.project_number.toLowerCase().includes(q)
            );
          }}
          renderOption={(props: any, option: Project) => (
            <li {...props} key={option.id}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{option.name}</div>
                <div style={{ fontSize: 12, color: isDark ? DT.textSecondary : DT.textMuted }}>
                  {option.project_number}
                  {option.client ? ` \u00B7 ${option.client}` : ''}
                </div>
              </div>
            </li>
          )}
          renderInput={(params: any) => (
            <TextField
              {...params}
              label="Project"
              size="small"
              placeholder="Search by name or number..."
            />
          )}
          fullWidth
          size="small"
        />

        {/* Employee selector */}
        <Autocomplete
          options={employees}
          loading={employeesLoading}
          getOptionLabel={(opt: Profile) =>
            `${opt.full_name}${opt.department ? ` (${opt.department})` : ''}`
          }
          value={selectedEmployee}
          onChange={(_: any, val: Profile | null) => setSelectedEmployee(val)}
          filterOptions={(options: Profile[], state: any) => {
            const q = (state.inputValue || '').toLowerCase();
            if (!q) return options;
            return options.filter(
              (e: Profile) =>
                e.full_name.toLowerCase().includes(q) ||
                (e.department || '').toLowerCase().includes(q) ||
                e.email.toLowerCase().includes(q)
            );
          }}
          renderOption={(props: any, option: Profile) => (
            <li {...props} key={option.id}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{option.full_name}</div>
                <div style={{ fontSize: 12, color: isDark ? DT.textSecondary : DT.textMuted }}>
                  {option.department || 'No department'} \u00B7 {option.email}
                </div>
              </div>
            </li>
          )}
          renderInput={(params: any) => (
            <TextField
              {...params}
              label="Employee (Timesheet Keeper)"
              size="small"
              placeholder="Search by name..."
            />
          )}
          fullWidth
          size="small"
        />

        {error && (
          <div style={{ color: DT.danger, fontSize: 13, marginTop: 4 }}>{error}</div>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <MuiButton
          onClick={handleClose}
          disabled={submitting}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Cancel
        </MuiButton>
        <MuiButton
          variant="contained"
          onClick={handleSubmit}
          disabled={!selectedProject || !selectedEmployee || submitting}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
        >
          {submitting ? 'Assigning...' : 'Assign Keeper'}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// WEB: REMOVE CONFIRMATION DIALOG
// ============================================================

function RemoveDialog({
  open,
  isDark,
  assignment,
  onClose,
  onConfirm,
}: {
  open: boolean;
  isDark: boolean;
  assignment: TimesheetAssignment | null;
  onClose: () => void;
  onConfirm: (assignmentId: string) => Promise<void>;
}) {
  const [removing, setRemoving] = useState(false);

  const handleConfirm = async () => {
    if (!assignment) return;
    setRemoving(true);
    try {
      await onConfirm(assignment.id);
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setRemoving(false);
    }
  };

  if (!Dialog) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Remove Assignment</DialogTitle>
      <DialogContent>
        <div style={{ fontSize: 14, color: isDark ? '#CBD5E1' : '#475569' }}>
          Are you sure you want to remove{' '}
          <strong>{assignment?.assigned_to?.full_name || 'this keeper'}</strong> from project{' '}
          <strong>{assignment?.project?.name || ''}</strong>?
          This will revoke their timesheet keeper access for this project.
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton onClick={onClose} disabled={removing}>
          Cancel
        </MuiButton>
        <MuiButton
          variant="contained"
          color="error"
          onClick={handleConfirm}
          disabled={removing}
        >
          {removing ? 'Removing...' : 'Remove'}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// WEB: DATA GRID TABLE
// ============================================================

function WebAssignmentsTable({
  data,
  isDark,
  onRemove,
}: {
  data: TimesheetAssignment[];
  isDark: boolean;
  onRemove: (assignment: TimesheetAssignment) => void;
}) {
  const [paginationModel, setPaginationModel] = useViewState(
    'admin/timesheet-assignments.pagination',
    { page: 0, pageSize: 25 }
  );
  const [sortModel, setSortModel] = useViewState<any[]>('admin/timesheet-assignments.sort', []);

  const columns = [
    {
      field: 'project_name',
      headerName: 'Project',
      flex: 1.4,
      minWidth: 200,
      valueGetter: (_value: any, row: TimesheetAssignment) =>
        `${row.project?.name || '\u2014'} (${row.project?.project_number || ''})`,
      renderCell: (params: any) => {
        const row = params.row as TimesheetAssignment;
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
              {row.project?.name || '\u2014'}
            </div>
            <div style={{ fontSize: 12, color: isDark ? DT.textSecondary : DT.textMuted }}>
              {row.project?.project_number || ''}
            </div>
          </div>
        );
      },
    },
    {
      field: 'assigned_to_name',
      headerName: 'Assigned Keeper',
      flex: 1.2,
      minWidth: 180,
      valueGetter: (_value: any, row: TimesheetAssignment) =>
        row.assigned_to?.full_name || '\u2014',
      renderCell: (params: any) => {
        const row = params.row as TimesheetAssignment;
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
              {row.assigned_to?.full_name || '\u2014'}
            </div>
            <div style={{ fontSize: 12, color: isDark ? DT.textSecondary : DT.textMuted }}>
              {row.assigned_to?.department || 'No department'}
            </div>
          </div>
        );
      },
    },
    {
      field: 'assigned_by_name',
      headerName: 'Assigned By',
      flex: 1,
      minWidth: 150,
      valueGetter: (_value: any, row: TimesheetAssignment) =>
        row.assigned_by?.full_name || '\u2014',
      renderCell: (params: any) => {
        const row = params.row as TimesheetAssignment;
        return (
          <span style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
            {row.assigned_by?.full_name || '\u2014'}
          </span>
        );
      },
    },
    {
      field: 'is_active',
      headerName: 'Active',
      width: 100,
      renderCell: (params: any) => {
        const row = params.row as TimesheetAssignment;
        return (
          <Chip
            label={row.is_active ? 'Active' : 'Inactive'}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: 11,
              minWidth: 70,
              backgroundColor: row.is_active
                ? 'rgba(34,197,94,0.15)'
                : 'rgba(239,68,68,0.15)',
              color: row.is_active ? DT.success : DT.danger,
              border: 'none',
            }}
          />
        );
      },
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      flex: 1,
      minWidth: 160,
      renderCell: (params: any) => {
        const row = params.row as TimesheetAssignment;
        if (!row.created_at) return <span style={{ color: DT.textMuted }}>\u2014</span>;
        const d = new Date(row.created_at);
        return (
          <span style={{ fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
            {d.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (params: any) => {
        const row = params.row as TimesheetAssignment;
        if (!row.is_active) return null;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(row);
            }}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: `1px solid ${isDark ? '#7F1D1D' : '#FECACA'}`,
              backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
              color: DT.danger,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            Remove
          </button>
        );
      },
    },
  ];

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <DataGrid
        rows={data}
        columns={columns}
        getRowId={(row: any) => row.id}
        disableRowSelectionOnClick
        disableColumnFilter
        disableColumnMenu
        columnHeaderHeight={50}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        pageSizeOptions={[10, 25, 50]}
        rowHeight={56}
        sx={{
          borderRadius: 3,
          '& .MuiDataGrid-cell': {
            whiteSpace: 'normal',
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'center',
          },
          '& .MuiDataGrid-columnHeader': { alignItems: 'flex-start' },
          '& .MuiDataGrid-columnHeaderTitleContainer': { overflow: 'visible' },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)',
          },
        }}
      />
    </div>
  );
}

// ============================================================
// MOBILE: ASSIGNMENT CARD
// ============================================================

function MobileAssignmentCard({
  assignment,
  onRemove,
}: {
  assignment: TimesheetAssignment;
  onRemove: (a: TimesheetAssignment) => void;
}) {
  const createdDate = assignment.created_at
    ? new Date(assignment.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '\u2014';

  return (
    <View
      className={`mb-3 p-4 rounded-xl border ${
        assignment.is_active
          ? 'border-border dark:border-slate-700 bg-surface dark:bg-slate-800'
          : 'border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10'
      }`}
    >
      {/* Project name + number */}
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-3">
          <Text className="text-base font-bold text-text-primary dark:text-white">
            {assignment.project?.name || '\u2014'}
          </Text>
          <Text className="text-xs text-text-muted dark:text-slate-400">
            {assignment.project?.project_number || ''}
          </Text>
        </View>
        <View
          className={`px-2 py-1 rounded-md ${
            assignment.is_active
              ? 'bg-green-100 dark:bg-green-900/20'
              : 'bg-red-100 dark:bg-red-900/20'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              assignment.is_active
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {assignment.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* Keeper info */}
      <View className="flex-row justify-between items-center py-1">
        <Text className="text-xs text-text-muted dark:text-slate-400 w-24">Keeper</Text>
        <Text className="text-xs font-semibold text-text-primary dark:text-slate-200 flex-1 text-right">
          {assignment.assigned_to?.full_name || '\u2014'}
          {assignment.assigned_to?.department ? ` (${assignment.assigned_to.department})` : ''}
        </Text>
      </View>

      <View className="flex-row justify-between items-center py-1">
        <Text className="text-xs text-text-muted dark:text-slate-400 w-24">Assigned By</Text>
        <Text className="text-xs font-semibold text-text-primary dark:text-slate-200 flex-1 text-right">
          {assignment.assigned_by?.full_name || '\u2014'}
        </Text>
      </View>

      <View className="flex-row justify-between items-center py-1">
        <Text className="text-xs text-text-muted dark:text-slate-400 w-24">Created</Text>
        <Text className="text-xs text-text-primary dark:text-slate-200 flex-1 text-right">
          {createdDate}
        </Text>
      </View>

      {/* Remove button */}
      {assignment.is_active && (
        <Pressable
          onPress={() => onRemove(assignment)}
          className="mt-3 py-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 items-center"
        >
          <Text className="text-xs font-bold text-red-600 dark:text-red-400">
            Remove Assignment
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function TimesheetAssignmentsScreen() {
  return (
    <AccessGate resourceKey="page:admin/timesheet-assignments">
      <TimesheetAssignmentsScreenInner />
    </AccessGate>
  );
}

function TimesheetAssignmentsScreenInner() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const windowWidth = useWindowWidth();
  const isWideScreen = isWeb && windowWidth >= WIDE_SCREEN_BREAKPOINT;

  const {
    assignments,
    assignmentsLoading,
    fetchAssignments,
    assignKeeper,
    removeAssignment,
  } = useTimesheets();

  const { projects, fetchAll: fetchProjects } = useProjects();

  const [assignOpen, setAssignOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TimesheetAssignment | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load data on mount
  const loadData = useCallback(() => {
    fetchAssignments();
    fetchProjects();
  }, [fetchAssignments, fetchProjects]);

  const { invalidate } = useAutoRefresh(() => {
    loadData();
  }, []);

  // Also load once on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Assign handler
  const handleAssign = async (projectId: string, employeeId: string) => {
    if (!user) return;
    await assignKeeper(projectId, employeeId, user.id);
    setSnackbar({
      open: true,
      message: 'Timesheet keeper assigned successfully!',
      severity: 'success',
    });
    invalidate();
  };

  // Remove handler
  const handleRemove = async (assignmentId: string) => {
    try {
      await removeAssignment(assignmentId);
      setSnackbar({
        open: true,
        message: 'Assignment removed successfully.',
        severity: 'success',
      });
      invalidate();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Failed to remove assignment',
        severity: 'error',
      });
    }
  };

  // ---- Web render (wide screens) ----
  if (isWideScreen) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? DT.bgMain : '#F8FAFC' }}>
        {/* Page header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: `1px solid ${isDark ? DT.border : '#E2E8F0'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                router.replace('/(app)/(tabs)/admin' as any);
              }
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isDark ? '#E2E8F0' : '#0F172A'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: isDark ? DT.textPrimary : '#0F172A',
              }}
            >
              Timesheet Keeper Assignments
            </div>
            <div
              style={{
                fontSize: 13,
                color: isDark ? DT.textSecondary : DT.textMuted,
                marginTop: 2,
              }}
            >
              Assign timesheet keepers to projects so they can manage weekly timesheets
            </div>
          </div>

          {/* Stats badge */}
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 10,
              border: `1.5px solid ${isDark ? '#334155' : '#E2E8F0'}`,
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              textAlign: 'center',
              minWidth: 80,
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: DT.primary,
                lineHeight: 1.2,
              }}
            >
              {assignments.filter((a) => a.is_active).length}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: isDark ? DT.textSecondary : DT.textMuted,
                marginTop: 1,
                whiteSpace: 'nowrap',
              }}
            >
              Active
            </div>
          </div>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 10,
              border: `1.5px solid ${isDark ? '#334155' : '#E2E8F0'}`,
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              textAlign: 'center',
              minWidth: 80,
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: isDark ? DT.textSecondary : DT.textMuted,
                lineHeight: 1.2,
              }}
            >
              {assignments.length}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: isDark ? DT.textSecondary : DT.textMuted,
                marginTop: 1,
                whiteSpace: 'nowrap',
              }}
            >
              Total
            </div>
          </div>

          {/* Assign button */}
          <button
            onClick={() => setAssignOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              backgroundColor: DT.primary,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg
              width="18"
              height="18"
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
            Assign Keeper
          </button>
        </div>

        {/* DataGrid */}
        <View style={{ flex: 1, padding: 16 }}>
          {assignments.length > 0 || assignmentsLoading ? (
            <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
              <MuiThemeProvider isDark={isDark}>
                <WebAssignmentsTable
                  data={assignments}
                  isDark={isDark}
                  onRemove={(a) => setRemoveTarget(a)}
                />
              </MuiThemeProvider>
            </View>
          ) : (
            <EmptyState
              title="No assignments yet"
              description="Click 'Assign Keeper' to assign a timesheet keeper to a project."
            />
          )}
        </View>

        {/* Dialogs + Snackbar */}
        {isWeb && (
          <MuiThemeProvider isDark={isDark}>
            <AssignKeeperDialog
              open={assignOpen}
              isDark={isDark}
              projects={projects}
              onClose={() => setAssignOpen(false)}
              onAssigned={handleAssign}
            />
            <RemoveDialog
              open={!!removeTarget}
              isDark={isDark}
              assignment={removeTarget}
              onClose={() => setRemoveTarget(null)}
              onConfirm={handleRemove}
            />
            {Snackbar && (
              <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((s: any) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              >
                <Alert
                  onClose={() => setSnackbar((s: any) => ({ ...s, open: false }))}
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

  // ---- Mobile render ----
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-[#0F172A]" edges={['top']}>
      <ScreenHeader title="Keeper Assignments" />

      {/* Assign button (mobile) */}
      <View className="px-4 pt-3 pb-2">
        <Pressable
          onPress={() => {
            // On mobile, a simple alert/prompt since we can't show MUI dialogs
            // For now, show a message that this feature is best used on desktop
            if (isWeb) {
              setAssignOpen(true);
            }
          }}
          className="py-3 rounded-xl bg-primary items-center"
        >
          <Text className="text-sm font-bold text-white">+ Assign Keeper</Text>
        </Pressable>

        {/* Stats row */}
        <View className="flex-row gap-2 mt-3">
          <View className="flex-1 p-3 rounded-xl border border-border dark:border-slate-700 bg-surface dark:bg-slate-800 items-center">
            <Text className="text-lg font-extrabold text-primary">
              {assignments.filter((a) => a.is_active).length}
            </Text>
            <Text className="text-xs text-text-muted dark:text-slate-400">Active</Text>
          </View>
          <View className="flex-1 p-3 rounded-xl border border-border dark:border-slate-700 bg-surface dark:bg-slate-800 items-center">
            <Text className="text-lg font-extrabold text-text-secondary dark:text-slate-400">
              {assignments.length}
            </Text>
            <Text className="text-xs text-text-muted dark:text-slate-400">Total</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, flexGrow: 1 }}>
        {assignmentsLoading && assignments.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <ActivityIndicator size="large" color={DT.primary} />
          </View>
        ) : assignments.length === 0 ? (
          <EmptyState
            title="No assignments yet"
            description="Assign a timesheet keeper to a project to get started."
          />
        ) : (
          assignments.map((assignment) => (
            <MobileAssignmentCard
              key={assignment.id}
              assignment={assignment}
              onRemove={(a) => setRemoveTarget(a)}
            />
          ))
        )}
      </ScrollView>

      {/* Mobile remove confirmation - using web dialog if on web narrow screen */}
      {isWeb && (
        <MuiThemeProvider isDark={isDark}>
          <AssignKeeperDialog
            open={assignOpen}
            isDark={isDark}
            projects={projects}
            onClose={() => setAssignOpen(false)}
            onAssigned={handleAssign}
          />
          <RemoveDialog
            open={!!removeTarget}
            isDark={isDark}
            assignment={removeTarget}
            onClose={() => setRemoveTarget(null)}
            onConfirm={handleRemove}
          />
          {Snackbar && (
            <Snackbar
              open={snackbar.open}
              autoHideDuration={4000}
              onClose={() => setSnackbar((s: any) => ({ ...s, open: false }))}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              <Alert
                onClose={() => setSnackbar((s: any) => ({ ...s, open: false }))}
                severity={snackbar.severity}
                variant="filled"
              >
                {snackbar.message}
              </Alert>
            </Snackbar>
          )}
        </MuiThemeProvider>
      )}
    </SafeAreaView>
  );
}
