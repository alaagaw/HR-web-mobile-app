import { AccessGate } from '@/components/access/access-gate';
import { requiredSx } from '@/lib/required-field';
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Platform, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useViewState } from '@/hooks/use-view-state';
import { useColorScheme } from 'nativewind';
import { ScreenHeader } from '@/components/layout/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useProjects } from '@/hooks/use-projects';
import { useAuth } from '@/hooks/use-auth';
import { ProjectStatus, ProjectEntryMode } from '@/types/enums';
import type { Project, ProjectDraft, Profile } from '@/types/models';
import { userService, projectManagersService } from '@/services';

const isWeb = Platform.OS === 'web';
const WIDE_SCREEN_BREAKPOINT = 1200; // keep in sync with MOBILE_BREAKPOINT (use-breakpoint.ts)

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
let TextField: any;
let Snackbar: any;
let Alert: any;
let MenuItem: any;
let Autocomplete: any;
let useMediaQuery: any;

if (isWeb) {
  const dg = require('@mui/x-data-grid');
  DataGrid = dg.DataGrid;
  useMediaQuery = require('@mui/material/useMediaQuery').default;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  Chip = require('@mui/material/Chip').default;
  Dialog = require('@mui/material/Dialog').default;
  DialogTitle = require('@mui/material/DialogTitle').default;
  DialogContent = require('@mui/material/DialogContent').default;
  DialogActions = require('@mui/material/DialogActions').default;
  MuiButton = require('@mui/material/Button').default;
  TextField = require('@mui/material/TextField').default;
  Snackbar = require('@mui/material/Snackbar').default;
  Alert = require('@mui/material/Alert').default;
  MenuItem = require('@mui/material/MenuItem').default;
  Autocomplete = require('@mui/material/Autocomplete').default;
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
// STATUS HELPERS
// ============================================================

const STATUS_OPTIONS = [
  { value: ProjectStatus.Active, label: 'Active' },
  { value: ProjectStatus.Completed, label: 'Completed' },
  { value: ProjectStatus.OnHold, label: 'On Hold' },
  { value: ProjectStatus.Cancelled, label: 'Cancelled' },
];

function getStatusChipProps(status: ProjectStatus): { color: 'success' | 'warning' | 'error' | 'default'; label: string } {
  switch (status) {
    case ProjectStatus.Active:
      return { color: 'success', label: 'Active' };
    case ProjectStatus.OnHold:
      return { color: 'warning', label: 'On Hold' };
    case ProjectStatus.Cancelled:
      return { color: 'error', label: 'Cancelled' };
    case ProjectStatus.Completed:
      return { color: 'default', label: 'Completed' };
    default:
      return { color: 'default', label: String(status) };
  }
}

function getStatusBadgeStyle(status: ProjectStatus): { bg: string; text: string; label: string } {
  switch (status) {
    case ProjectStatus.Active:
      return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', label: 'Active' };
    case ProjectStatus.OnHold:
      return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', label: 'On Hold' };
    case ProjectStatus.Cancelled:
      return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', label: 'Cancelled' };
    case ProjectStatus.Completed:
      return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Completed' };
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: String(status) };
  }
}

// ============================================================
// DIALOG STATE
// ============================================================

interface ProjectDialogState {
  open: boolean;
  mode: 'add' | 'edit';
  projectId: string | null;
  project_number: string;
  name: string;
  client: string;
  location: string;
  scope: string;
  status: ProjectStatus;
  start_date: string;
  end_date: string;
  entry_mode: ProjectEntryMode;
  regular_hours_per_day: string;
  /** Profile IDs assigned as PMs on this project. Saved via projectManagersService.setForProject. */
  pm_ids: string[];
  submitting: boolean;
}

const INITIAL_DIALOG: ProjectDialogState = {
  open: false,
  mode: 'add',
  projectId: null,
  project_number: '',
  name: '',
  client: '',
  location: '',
  scope: '',
  status: ProjectStatus.Active,
  start_date: '',
  end_date: '',
  entry_mode: ProjectEntryMode.Auto,
  regular_hours_per_day: '8',
  pm_ids: [],
  submitting: false,
};

// Keys persisted as Add-mode draft. Edit mode never persists payroll fields
// because they aren't editable from this dialog.
const PROJECT_DRAFT_KEYS: (keyof ProjectDialogState)[] = [
  'project_number', 'name', 'client', 'location', 'scope', 'status',
  'start_date', 'end_date', 'entry_mode', 'regular_hours_per_day',
];

// ============================================================
// WEB: DATA GRID TABLE
// ============================================================

function WebProjectsTable({
  data,
  isDark,
  globalSearch,
  onEdit,
}: {
  data: Project[];
  isDark: boolean;
  globalSearch: string;
  onEdit: (project: Project) => void;
}) {
  const [filters, setFilters] = useViewState('admin/projects.columnFilters', {
    project_number: '',
    name: '',
    client: '',
    location: '',
    status: '',
    start_date: '',
    end_date: '',
  });

  const [paginationModel, setPaginationModel] = useViewState(
    'admin/projects.pagination',
    { page: 0, pageSize: 25 }
  );
  const [sortModel, setSortModel] = useViewState<any[]>('admin/projects.sort', []);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const pn = (row.project_number || '').toLowerCase();
      const name = (row.name || '').toLowerCase();
      const client = (row.client || '').toLowerCase();
      const location = (row.location || '').toLowerCase();
      const status = (row.status || '').toLowerCase();
      const startDate = (row.start_date || '').toLowerCase();
      const endDate = (row.end_date || '').toLowerCase();

      // Global search
      if (globalSearch) {
        const q = globalSearch.toLowerCase();
        const haystack = [pn, name, client, location, status, startDate, endDate].join(' ');
        if (!haystack.includes(q)) return false;
      }

      // Per-column filters
      if (filters.project_number && !pn.includes(filters.project_number.toLowerCase())) return false;
      if (filters.name && !name.includes(filters.name.toLowerCase())) return false;
      if (filters.client && !client.includes(filters.client.toLowerCase())) return false;
      if (filters.location && !location.includes(filters.location.toLowerCase())) return false;
      if (filters.status && !status.includes(filters.status.toLowerCase())) return false;
      if (filters.start_date && !startDate.includes(filters.start_date.toLowerCase())) return false;
      if (filters.end_date && !endDate.includes(filters.end_date.toLowerCase())) return false;

      return true;
    });
  }, [data, globalSearch, filters]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '5px 8px',
    fontSize: 11,
    border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
    borderRadius: 6,
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    color: isDark ? '#F8FAFC' : '#0F172A',
    outline: 'none',
  };

  const renderHeader = (label: string, filterKey: keyof typeof filters) => () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 0' }}>
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const }}>{label}</span>
      <input
        placeholder="Filter..."
        value={filters[filterKey]}
        onChange={(e) => setFilters((f) => ({ ...f, [filterKey]: e.target.value }))}
        onClick={(e) => e.stopPropagation()}
        style={inputStyle}
      />
    </div>
  );

  const formatDate = (date: string | null) => {
    if (!date) return '\u2014';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '\u2014';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const columns = [
    {
      field: 'project_number',
      headerName: 'Project Number',
      flex: 0.8,
      minWidth: 130,
      renderHeader: renderHeader('Project #', 'project_number'),
      renderCell: (params: any) => (
        <span style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
          {params.row.project_number}
        </span>
      ),
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1.2,
      minWidth: 160,
      renderHeader: renderHeader('Name', 'name'),
      renderCell: (params: any) => (
        <span style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
          {params.row.name}
        </span>
      ),
    },
    {
      field: 'client',
      headerName: 'Client',
      flex: 1,
      minWidth: 140,
      renderHeader: renderHeader('Client', 'client'),
      valueGetter: (_value: any, row: Project) => row.client || '',
      renderCell: (params: any) => (
        <span style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#475569' }}>
          {params.row.client || '\u2014'}
        </span>
      ),
    },
    {
      field: 'location',
      headerName: 'Location',
      flex: 1,
      minWidth: 140,
      renderHeader: renderHeader('Location', 'location'),
      valueGetter: (_value: any, row: Project) => row.location || '',
      renderCell: (params: any) => (
        <span style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#475569' }}>
          {params.row.location || '\u2014'}
        </span>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderHeader: renderHeader('Status', 'status'),
      renderCell: (params: any) => {
        const chip = getStatusChipProps(params.row.status);
        return (
          <Chip
            label={chip.label}
            size="small"
            color={chip.color}
            variant="filled"
            sx={{ fontWeight: 700, fontSize: 11, minWidth: 70 }}
          />
        );
      },
    },
    {
      field: 'start_date',
      headerName: 'Start Date',
      flex: 0.8,
      minWidth: 130,
      renderHeader: renderHeader('Start Date', 'start_date'),
      valueGetter: (_value: any, row: Project) => row.start_date || '',
      renderCell: (params: any) => (
        <span style={{ fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
          {formatDate(params.row.start_date)}
        </span>
      ),
    },
    {
      field: 'end_date',
      headerName: 'End Date',
      flex: 0.8,
      minWidth: 130,
      renderHeader: renderHeader('End Date', 'end_date'),
      valueGetter: (_value: any, row: Project) => row.end_date || '',
      renderCell: (params: any) => (
        <span style={{ fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
          {formatDate(params.row.end_date)}
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(params.row as Project);
          }}
          style={{
            padding: '5px 14px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
            backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF',
            color: DT.primary,
            cursor: 'pointer',
            transition: 'all 0.12s ease',
          }}
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <DataGrid
        rows={filteredData}
        columns={columns}
        getRowId={(row: any) => row.id}
        disableRowSelectionOnClick
        disableColumnFilter
        disableColumnMenu
        columnHeaderHeight={70}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        pageSizeOptions={[10, 25, 50, 100]}
        rowHeight={48}
        sx={{
          borderRadius: 3,
          '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
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
// WEB: PROJECT DIALOG (Add / Edit)
// ============================================================

function ProjectDialog({
  state,
  isDark,
  employees,
  onClose,
  onCancel,
  onChange,
  onSubmit,
}: {
  state: ProjectDialogState;
  isDark: boolean;
  employees: Profile[];
  onClose: () => void;
  onCancel: () => void;
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
}) {
  const fullScreen = useMediaQuery ? useMediaQuery('(max-width:1199.95px)') : false;
  if (!Dialog) return null;

  const isValid = state.project_number.trim().length > 0 && state.name.trim().length > 0;
  const isEdit = state.mode === 'edit';
  const selectedPMs = useMemo(
    () => employees.filter((e) => state.pm_ids.includes(e.id)),
    [employees, state.pm_ids],
  );

  return (
    <Dialog
      open={state.open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          borderRadius: fullScreen ? 0 : 3,
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
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          {isEdit ? 'Edit Project' : 'Add Project'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.6, marginTop: 2 }}>
          {isEdit ? `Editing ${state.name || 'project'}` : 'Create a new project entry'}
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
        <div style={{ display: 'flex', gap: 12 }}>
          <TextField
            label="Project Number"
            value={state.project_number}
            onChange={(e: any) => onChange('project_number', e.target.value)}
            fullWidth
            size="small"
            required
            sx={requiredSx(state.project_number)}
          />
          <TextField
            label="Name"
            value={state.name}
            onChange={(e: any) => onChange('name', e.target.value)}
            fullWidth
            size="small"
            required
            sx={requiredSx(state.name)}
          />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <TextField
            label="Client"
            value={state.client}
            onChange={(e: any) => onChange('client', e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Location"
            value={state.location}
            onChange={(e: any) => onChange('location', e.target.value)}
            fullWidth
            size="small"
          />
        </div>
        <TextField
          label="Scope"
          value={state.scope}
          onChange={(e: any) => onChange('scope', e.target.value)}
          fullWidth
          size="small"
          multiline
          rows={3}
        />
        <TextField
          label="Status"
          value={state.status}
          onChange={(e: any) => onChange('status', e.target.value)}
          fullWidth
          size="small"
          select
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <div style={{ display: 'flex', gap: 12 }}>
          <TextField
            label="Start Date"
            type="date"
            value={state.start_date}
            onChange={(e: any) => onChange('start_date', e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            value={state.end_date}
            onChange={(e: any) => onChange('end_date', e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </div>

        {/* Payroll config — entry_mode is set once at creation and locked
            forever; regular_hours_per_day is editable only via the project-
            hours change-request approval pipeline (see PR #8). */}
        <div
          style={{
            borderTop: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
            paddingTop: 16,
            marginTop: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: isDark ? DT.textMuted : '#64748B', textTransform: 'uppercase' }}>
            Payroll Config
          </div>
          <TextField
            label="Entry Mode"
            value={state.entry_mode}
            onChange={(e: any) => onChange('entry_mode', e.target.value)}
            fullWidth
            size="small"
            select
            disabled={isEdit}
            helperText={
              isEdit
                ? 'Entry mode cannot be changed after creation. Create a new project if it needs to be different.'
                : 'Standard: keeper enters total hours, OT auto-derived. Manual: keeper enters Regular and OT separately.'
            }
          >
            <MenuItem value={ProjectEntryMode.Auto}>Standard (auto OT)</MenuItem>
            <MenuItem value={ProjectEntryMode.ManualSplit}>Manual R + OT split</MenuItem>
          </TextField>
          <TextField
            label="Regular Hours / Day"
            type="number"
            value={state.regular_hours_per_day}
            onChange={(e: any) => onChange('regular_hours_per_day', e.target.value)}
            fullWidth
            size="small"
            disabled={isEdit}
            inputProps={{ min: 0.5, max: 24, step: 0.5 }}
            helperText={
              isEdit
                ? 'Editable only via the project-hours change-request approval pipeline.'
                : 'Default 8. Auto-derives overtime: anything above this limit per day becomes OT.'
            }
          />

          {/* Project Managers — feeds the approval pipeline (PMs are allowed
              to request project-hours changes on their own projects and to
              see related notifications). Editable in both add and edit
              modes; persisted via projectManagersService.setForProject. */}
          {Autocomplete && (
            <Autocomplete
              multiple
              options={employees}
              value={selectedPMs}
              getOptionLabel={(opt: Profile) => `${opt.full_name}${opt.department ? ` · ${opt.department}` : ''}`}
              isOptionEqualToValue={(opt: Profile, val: Profile) => opt.id === val.id}
              onChange={(_: any, vals: Profile[]) => onChange('pm_ids', vals.map((v) => v.id))}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Project Managers"
                  size="small"
                  placeholder="Search by name or department..."
                  helperText="PMs assigned here can request project-hours changes for this project and see related approvals."
                />
              )}
              size="small"
              fullWidth
            />
          )}
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <MuiButton
          onClick={onCancel}
          disabled={state.submitting}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Cancel
        </MuiButton>
        <MuiButton
          variant="contained"
          onClick={onSubmit}
          disabled={!isValid || state.submitting}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            px: 3,
          }}
        >
          {state.submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Project'}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// WEB: DELETE CONFIRMATION DIALOG
// ============================================================

function DeleteConfirmDialog({
  open,
  projectName,
  deleting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  projectName: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!Dialog) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Project</DialogTitle>
      <DialogContent>
        <div style={{ fontSize: 14, lineHeight: 1.6 }}>
          Are you sure you want to delete <strong>{projectName}</strong>? This action cannot be undone.
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton onClick={onClose} disabled={deleting}>
          Cancel
        </MuiButton>
        <MuiButton
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={deleting}
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function ProjectsScreen() {
  return (
    <AccessGate resourceKey="nav:timesheet-management">
      <ProjectsScreenInner />
    </AccessGate>
  );
}

function ProjectsScreenInner() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const windowWidth = useWindowWidth();
  const isWideScreen = isWeb && windowWidth >= WIDE_SCREEN_BREAKPOINT;

  const { projects, loading, fetchAll, create, update, remove } = useProjects();

  // PM picker source list — active employees only. Loaded once on mount;
  // re-fetched whenever the dialog opens to catch newly-invited employees.
  const [employees, setEmployees] = useState<Profile[]>([]);
  useEffect(() => {
    userService
      .getEmployees({ is_active: true })
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, []);

  const [globalSearch, setGlobalSearch] = useViewState('admin/projects.globalSearch', '');
  const [dialog, setDialog] = useState<ProjectDialogState>(INITIAL_DIALOG);
  const [addDraft, setAddDraft] = useViewState<Partial<ProjectDialogState>>(
    'admin/projects.addDraft',
    {}
  );
  const [editDraft, setEditDraft] = useViewState<{ projectId: string; fields: Partial<ProjectDialogState> } | null>(
    'admin/projects.editDraft',
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { invalidate } = useAutoRefresh(() => {
    fetchAll();
  }, []);

  // --- Dialog handlers ---

  const handleOpenAdd = () => {
    setDialog({ ...INITIAL_DIALOG, ...addDraft, open: true, mode: 'add' });
  };

  const handleOpenEdit = async (project: Project) => {
    const draftFields = editDraft?.projectId === project.id ? editDraft.fields : {};
    setDialog({
      open: true,
      mode: 'edit',
      projectId: project.id,
      project_number: project.project_number,
      name: project.name,
      client: project.client || '',
      location: project.location || '',
      scope: project.scope || '',
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      entry_mode: project.entry_mode,
      regular_hours_per_day: String(project.regular_hours_per_day),
      pm_ids: [],
      submitting: false,
      ...draftFields,
      // Payroll fields are NEVER taken from a draft in edit mode — they are
      // read-only here and only changeable via the approval pipeline.
      // Override any leftover draft values with the live project values.
      ...({
        entry_mode: project.entry_mode,
        regular_hours_per_day: String(project.regular_hours_per_day),
      } as Partial<ProjectDialogState>),
    });

    // Load existing PM assignments asynchronously. Don't clobber unsaved
    // draft selections if the user reopened the dialog mid-edit.
    try {
      const assignments = await projectManagersService.getForProject(project.id);
      const liveIds = assignments.map((a) => a.profile_id);
      setDialog((s) => {
        if (s.projectId !== project.id) return s;
        if (draftFields.pm_ids && draftFields.pm_ids.length > 0) return s;
        return { ...s, pm_ids: liveIds };
      });
    } catch {
      // Non-fatal — PM list stays empty.
    }
  };

  // Backdrop / Esc / nav-away: keep draft
  const handleCloseDialog = () => {
    if (!dialog.submitting) setDialog(INITIAL_DIALOG);
  };

  // Cancel button: discard draft for this dialog mode
  const handleCancelDialog = () => {
    if (dialog.submitting) return;
    if (dialog.mode === 'add') setAddDraft({});
    else setEditDraft(null);
    setDialog(INITIAL_DIALOG);
  };

  const handleDialogChange = (field: string, value: any) => {
    setDialog((s) => ({ ...s, [field]: value }));
  };

  // Save form fields to draft on every change
  useEffect(() => {
    if (!dialog.open || dialog.submitting) return;
    const fields: Partial<ProjectDialogState> = {};
    PROJECT_DRAFT_KEYS.forEach((k) => { (fields as any)[k] = dialog[k]; });
    if (dialog.mode === 'add') {
      setAddDraft(fields);
    } else if (dialog.projectId) {
      setEditDraft({ projectId: dialog.projectId, fields });
    }
  }, [dialog]);

  const handleSubmitDialog = async () => {
    if (!user) return;
    setDialog((s) => ({ ...s, submitting: true }));

    const draft: ProjectDraft = {
      project_number: dialog.project_number.trim(),
      name: dialog.name.trim(),
      client: dialog.client.trim() || null,
      location: dialog.location.trim() || null,
      scope: dialog.scope.trim() || null,
      status: dialog.status,
      start_date: dialog.start_date || null,
      end_date: dialog.end_date || null,
    };

    // Payroll config is only set on create. On edit, entry_mode is
    // permanently locked and regular_hours_per_day flows through the
    // approval pipeline, not this form.
    if (dialog.mode === 'add') {
      draft.entry_mode = dialog.entry_mode;
      const hours = parseFloat(dialog.regular_hours_per_day);
      if (!Number.isNaN(hours) && hours > 0 && hours <= 24) {
        draft.regular_hours_per_day = hours;
      }
    }

    try {
      let projectId = dialog.projectId;
      if (dialog.mode === 'add') {
        const newProject = await create(draft, user.id);
        projectId = newProject.id;
        setAddDraft({});
        setSnackbar({ open: true, message: 'Project created successfully', severity: 'success' });
      } else if (dialog.projectId) {
        await update(dialog.projectId, draft);
        setEditDraft(null);
        setSnackbar({ open: true, message: 'Project updated successfully', severity: 'success' });
      }
      // Persist PM assignments either way. Replaces the full set; idempotent.
      if (projectId) {
        try {
          await projectManagersService.setForProject(projectId, dialog.pm_ids, user.id);
        } catch (pmErr: any) {
          // Project saved fine; PM sync failed. Surface a non-blocking warning.
          setSnackbar({ open: true, message: `Project saved, but PM assignments failed: ${pmErr.message}`, severity: 'error' });
        }
      }
      setDialog(INITIAL_DIALOG);
      invalidate();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to save project', severity: 'error' });
      setDialog((s) => ({ ...s, submitting: false }));
    }
  };

  // --- Delete handlers ---

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await remove(deleteTarget.id);
      setSnackbar({ open: true, message: `${deleteTarget.name} deleted successfully`, severity: 'success' });
      setDeleteTarget(null);
      invalidate();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to delete project', severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  // --- Mobile search filtering ---

  const mobileFiltered = useMemo(() => {
    if (!globalSearch) return projects;
    const q = globalSearch.toLowerCase();
    return projects.filter((p) => {
      const haystack = [
        p.project_number,
        p.name,
        p.client || '',
        p.location || '',
        p.status,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [projects, globalSearch]);

  // ============================================================
  // WEB RENDER (wide screens)
  // ============================================================

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
            <div style={{ fontSize: 22, fontWeight: 700, color: isDark ? DT.textPrimary : '#0F172A' }}>
              Projects
            </div>
            <div style={{ fontSize: 13, color: isDark ? DT.textSecondary : DT.textMuted, marginTop: 2 }}>
              Manage projects, track status, and assign details
            </div>
          </div>
          <button
            onClick={handleOpenAdd}
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
            Add Project
          </button>
        </div>

        {/* Toolbar + DataGrid */}
        <View style={{ flex: 1, paddingHorizontal: 24 }}>
          {/* Global search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingTop: 16,
              paddingBottom: 12,
            }}
          >
            <div style={{ position: 'relative', minWidth: 280 }}>
              <input
                placeholder="Search projects..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 14px 7px 34px',
                  fontSize: 13,
                  border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
                  borderRadius: 8,
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                  outline: 'none',
                }}
              />
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isDark ? DT.textMuted : DT.textSecondary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
          </div>

          {/* DataGrid */}
          {projects.length > 0 || loading ? (
            <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              <MuiThemeProvider isDark={isDark}>
                <WebProjectsTable
                  data={projects}
                  isDark={isDark}
                  globalSearch={globalSearch}
                  onEdit={handleOpenEdit}
                />
              </MuiThemeProvider>
            </View>
          ) : (
            <EmptyState
              title="No projects found"
              description="Click 'Add Project' to create your first project."
            />
          )}
        </View>

        {/* Dialogs + Snackbar */}
        {isWeb && (
          <MuiThemeProvider isDark={isDark}>
            <ProjectDialog
              state={dialog}
              isDark={isDark}
              employees={employees}
              onClose={handleCloseDialog}
              onCancel={handleCancelDialog}
              onChange={handleDialogChange}
              onSubmit={handleSubmitDialog}
            />
            <DeleteConfirmDialog
              open={!!deleteTarget}
              projectName={deleteTarget?.name || ''}
              deleting={deleting}
              onClose={() => setDeleteTarget(null)}
              onConfirm={handleDelete}
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

  // ============================================================
  // MOBILE RENDER
  // ============================================================

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-[#0F172A]" edges={['top']}>
      <ScreenHeader title="Projects" />

      {/* Mobile search + Add */}
      <View className="px-4 py-3">
        <View className="flex-row items-center bg-surface dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl px-4 py-2.5">
          <Text className="text-text-muted dark:text-slate-400" style={{ fontSize: 18, marginRight: 8 }}>
            {'\u{1F50D}'}
          </Text>
          <TextInput
            value={globalSearch}
            onChangeText={setGlobalSearch}
            placeholder="Search projects…"
            placeholderTextColor="#94A3B8"
            className="flex-1 text-base text-text-primary dark:text-white"
          />
        </View>
        {isWeb && (
          <Pressable
            onPress={handleOpenAdd}
            className="mt-3 flex-row items-center justify-center bg-primary rounded-xl py-3 active:opacity-80"
          >
            <Text className="text-white font-semibold text-sm">+ Add Project</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, flexGrow: 1 }}>
        {mobileFiltered.length === 0 && !loading ? (
          <EmptyState
            title="No projects found"
            description="No projects have been created yet."
          />
        ) : (
          mobileFiltered.map((project) => {
            const badge = getStatusBadgeStyle(project.status);
            return (
              <Pressable
                key={project.id}
                onPress={() => handleOpenEdit(project)}
              >
                <View
                  className="mb-3 p-4 rounded-xl border border-border dark:border-slate-700 bg-surface dark:bg-slate-800"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-3">
                      <Text className="text-base font-bold text-text-primary dark:text-white">
                        {project.name}
                      </Text>
                      <Text className="text-xs text-text-muted dark:text-slate-400 mt-0.5">
                        {project.project_number}
                      </Text>
                    </View>
                    <View className={`px-2 py-1 rounded-md ${badge.bg}`}>
                      <Text className={`text-xs font-bold ${badge.text}`}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  {/* Details */}
                  {project.client ? (
                    <View className="flex-row items-center mt-1">
                      <Text className="text-xs text-text-muted dark:text-slate-400 w-16">Client</Text>
                      <Text className="text-xs font-semibold text-text-primary dark:text-slate-200 flex-1">
                        {project.client}
                      </Text>
                    </View>
                  ) : null}

                  {project.location ? (
                    <View className="flex-row items-center mt-1">
                      <Text className="text-xs text-text-muted dark:text-slate-400 w-16">Location</Text>
                      <Text className="text-xs font-semibold text-text-primary dark:text-slate-200 flex-1">
                        {project.location}
                      </Text>
                    </View>
                  ) : null}

                  {(project.start_date || project.end_date) && (
                    <View className="flex-row items-center mt-1">
                      <Text className="text-xs text-text-muted dark:text-slate-400 w-16">Dates</Text>
                      <Text className="text-xs font-semibold text-text-primary dark:text-slate-200 flex-1">
                        {project.start_date || '\u2014'} to {project.end_date || '\u2014'}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Dialogs — mobile web (MUI); Add/Edit form goes fullScreen < 1200px. */}
      {isWeb && MuiThemeProvider && (
        <MuiThemeProvider isDark={isDark}>
          <ProjectDialog
            state={dialog}
            isDark={isDark}
            employees={employees}
            onClose={handleCloseDialog}
            onCancel={handleCancelDialog}
            onChange={handleDialogChange}
            onSubmit={handleSubmitDialog}
          />
          <DeleteConfirmDialog
            open={!!deleteTarget}
            projectName={deleteTarget?.name || ''}
            deleting={deleting}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
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
