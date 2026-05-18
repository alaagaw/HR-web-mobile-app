import { AccessGate } from '@/components/access/access-gate';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useViewState } from '@/hooks/use-view-state';
import { useColorScheme } from 'nativewind';
import { Search } from 'lucide-react-native';
import { ScreenHeader } from '@/components/layout/screen-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  userService,
  registrationService,
  documentService,
  profileCapabilitiesService,
  lookupService,
  authService,
  compensationService,
  canonicaliseDepartment,
  canonicaliseDesignation,
} from '@/services';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { getRoleLabel, getInitials } from '@/lib/utils';
import { rotateImageBlob } from '@/lib/image-rotation';
import { Role } from '@/types/enums';
import type { Profile } from '@/types/models';

const isWeb = Platform.OS === 'web';

// Lazy-load MUI components only on web
let DataGrid: any;
let MuiThemeProvider: any;
let Chip: any;
let Dialog: any;
let DialogTitle: any;
let DialogContent: any;
let DialogActions: any;
let MuiTextField: any;
let MuiButton: any;
let MuiAlert: any;
let Snackbar: any;
let MenuItem: any;
let Autocomplete: any;
let Switch: any;
let FormControlLabel: any;
let Checkbox: any;
let Menu: any;
let IconButton: any;

if (isWeb) {
  const dg = require('@mui/x-data-grid');
  DataGrid = dg.DataGrid;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  Chip = require('@mui/material/Chip').default;
  Dialog = require('@mui/material/Dialog').default;
  DialogTitle = require('@mui/material/DialogTitle').default;
  DialogContent = require('@mui/material/DialogContent').default;
  DialogActions = require('@mui/material/DialogActions').default;
  MuiTextField = require('@mui/material/TextField').default;
  MuiButton = require('@mui/material/Button').default;
  MuiAlert = require('@mui/material/Alert').default;
  Snackbar = require('@mui/material/Snackbar').default;
  MenuItem = require('@mui/material/MenuItem').default;
  Autocomplete = require('@mui/material/Autocomplete').default;
  Switch = require('@mui/material/Switch').default;
  FormControlLabel = require('@mui/material/FormControlLabel').default;
  Checkbox = require('@mui/material/Checkbox').default;
  Menu = require('@mui/material/Menu').default;
  IconButton = require('@mui/material/IconButton').default;
}

// --------------- Edit Dialog State ---------------

interface EditDialogState {
  open: boolean;
  employee: Profile | null;
  full_name: string;
  email: string;
  emp_code: string;
  phone: string;
  nationality: string;
  job_title: string;
  start_date: string;
  role: Role;
  department: string;
  supervisor_id: string | null;
  manager_id: string | null;
  workday_hours: string;
  annual_leave_entitlement_days: string;
  // Compensation (effective-dated). Loaded from v_current_compensation
  // on dialog open. If HR changes any of the four fields, a NEW row is
  // inserted into employee_compensation on save with the picked
  // effective_from — never an in-place overwrite. `comp_loaded_*` keep
  // the original snapshot so we can detect a change vs the stored row.
  comp_basic_salary: string;
  comp_hra: string;
  comp_transportation: string;
  comp_other_allowances: string;
  comp_currency: string;
  comp_effective_from: string;
  comp_notes: string;
  comp_loaded_basic_salary: string;
  comp_loaded_hra: string;
  comp_loaded_transportation: string;
  comp_loaded_other_allowances: string;
  is_active: boolean;
  show_all_supervisors: boolean;
  show_all_managers: boolean;
  /**
   * Replaces the old single `send_invite_now`. Mutually exclusive
   * actions, picked via radio in the dialog:
   *   - 'none'      → save only, no email
   *   - 'reset'     → send password reset OTP, no status change
   *   - 'invite'    → send reset OTP THEN, on success, info-form
   *                   request (= both, sequenced)
   *   - 'info_form' → send info-form request only (status →
   *                   info_rejected). No password reset.
   *   - 'warning'   → send manual warning email (no status change)
   */
  email_action: 'none' | 'reset' | 'invite' | 'info_form' | 'warning';
  /** Free-text comment HR wants the employee to see (info_form / warning). */
  email_action_comment: string;
  /** Per-employee opt-in for the daily auto-warning cron. */
  warn_on_uncompleted_form: boolean;
  /** Existing on-file ID document, preview-only inside this dialog. */
  id_document_url: string | null;
  id_document_signed_url: string;
  doc_rotation: number;
  doc_rotation_saving: boolean;
  // Capability flags layered on top of Role (profile_capabilities table).
  // Stored separately so HR can grant approval / decision rights without
  // changing role assignments. Loaded on edit-open, persisted on submit.
  is_general_manager: boolean;
  is_operations_manager: boolean;
  can_approve_project_hours_changes: boolean;
  can_close_month: boolean;
  submitting: boolean;
  error: string;
}

const INITIAL_DIALOG: EditDialogState = {
  open: false,
  employee: null,
  full_name: '',
  email: '',
  emp_code: '',
  phone: '',
  nationality: '',
  job_title: '',
  start_date: '',
  role: Role.Employee,
  department: '',
  supervisor_id: null,
  manager_id: null,
  workday_hours: '8',
  annual_leave_entitlement_days: '21',
  comp_basic_salary: '',
  comp_hra: '',
  comp_transportation: '',
  comp_other_allowances: '',
  comp_currency: 'SAR',
  comp_effective_from: '',
  comp_notes: '',
  comp_loaded_basic_salary: '',
  comp_loaded_hra: '',
  comp_loaded_transportation: '',
  comp_loaded_other_allowances: '',
  is_active: true,
  show_all_supervisors: false,
  show_all_managers: false,
  email_action: 'none',
  email_action_comment: '',
  warn_on_uncompleted_form: true,
  id_document_url: null,
  id_document_signed_url: '',
  doc_rotation: 0,
  doc_rotation_saving: false,
  is_general_manager: false,
  is_operations_manager: false,
  can_approve_project_hours_changes: false,
  can_close_month: false,
  submitting: false,
  error: '',
};

const ROLE_OPTIONS = [
  { value: Role.Employee, label: 'Employee' },
  { value: Role.Supervisor, label: 'Supervisor' },
  { value: Role.Manager, label: 'Manager' },
  { value: Role.HR, label: 'HR' },
  { value: Role.HRDirector, label: 'HR Director' },
];

// --------------- New Employee Dialog State ---------------

interface InviteDialogState {
  open: boolean;
  email: string;
  full_name: string;
  emp_code: string;
  phone: string;
  nationality: string;
  role: Role;
  department: string;
  supervisor_id: string | null;
  manager_id: string | null;
  job_title: string;
  start_date: string;
  workday_hours: string;
  annual_leave_entitlement_days: string;
  send_invite_now: boolean;
  show_all_supervisors: boolean;
  show_all_managers: boolean;
  submitting: boolean;
  error: string;
}

const INITIAL_INVITE: InviteDialogState = {
  open: false,
  email: '',
  full_name: '',
  emp_code: '',
  phone: '',
  nationality: '',
  role: Role.Employee,
  department: '',
  supervisor_id: null,
  manager_id: null,
  job_title: '',
  start_date: '',
  workday_hours: '8',
  annual_leave_entitlement_days: '21',
  send_invite_now: false,
  show_all_supervisors: false,
  show_all_managers: false,
  submitting: false,
  error: '',
};

// Form fields that survive close-without-cancel; re-applied on next open.
const INVITE_DRAFT_KEYS: (keyof InviteDialogState)[] = [
  'email', 'full_name', 'emp_code', 'phone', 'nationality', 'role', 'department',
  'supervisor_id', 'manager_id', 'job_title', 'start_date',
  'workday_hours', 'annual_leave_entitlement_days',
  'send_invite_now', 'show_all_supervisors', 'show_all_managers',
];

const EDIT_DRAFT_KEYS: (keyof EditDialogState)[] = [
  'full_name', 'email', 'emp_code', 'phone', 'nationality', 'job_title', 'start_date',
  'role', 'department', 'supervisor_id', 'manager_id', 'workday_hours',
  'annual_leave_entitlement_days',
  'is_active', 'show_all_supervisors', 'show_all_managers',
  'email_action', 'email_action_comment', 'warn_on_uncompleted_form',
  'comp_basic_salary', 'comp_hra', 'comp_transportation', 'comp_other_allowances',
  'comp_effective_from', 'comp_notes',
  'is_general_manager', 'is_operations_manager',
  'can_approve_project_hours_changes', 'can_close_month',
];

// --------------- Web Components ---------------

const STATUS_LABEL: Record<string, string> = {
  not_invited: 'Not Invited',
  email_unverified: 'Unverified',
  pending_info: 'Pending Info',
  pending_approval: 'Pending Approval',
  active: 'Active',
  rejected: 'Rejected',
};

/**
 * One row in the resend-email dialog. Email starts as the current value
 * and gets marked emailDirty when HR types into it, so we know to push
 * the change through update-employee-email before resending.
 */
interface ResendRow {
  id: string;
  full_name: string;
  original_email: string;
  email: string;
  emailDirty: boolean;
  is_active: boolean;
  registration_status: string;
}

function getStatusDisplay(row: Profile): { label: string; bg: string; fg: string } {
  if (!row.is_active) return { label: 'Inactive', bg: 'rgba(148,163,184,0.18)', fg: '#64748B' };
  switch (row.registration_status) {
    case 'not_invited':       return { label: 'Not Invited',      bg: 'rgba(245,158,11,0.18)', fg: '#D97706' };
    case 'email_unverified':  return { label: 'Unverified',       bg: 'rgba(148,163,184,0.18)', fg: '#64748B' };
    case 'pending_info':      return { label: 'Pending Info',     bg: 'rgba(59,130,246,0.18)',  fg: '#2563EB' };
    case 'pending_approval':  return { label: 'Pending Approval', bg: 'rgba(59,130,246,0.18)',  fg: '#2563EB' };
    case 'info_rejected':     return { label: 'Info Rejected',    bg: 'rgba(217,119,6,0.18)',   fg: '#D97706' };
    case 'rejected':          return { label: 'Rejected',         bg: 'rgba(239,68,68,0.18)',   fg: '#DC2626' };
    case 'active':
    default:                  return { label: 'Active',           bg: 'rgba(34,197,94,0.18)',   fg: '#16A34A' };
  }
}

// Cheap content fingerprint. Used so a refetch that returns the SAME
// data (e.g. the tab-refocus refresh, when nothing changed in 30 min)
// keeps the previous array reference — otherwise the memoized rows
// recompute and MUI DataGrid snaps the user back to page 1.
function employeesSignature(rows: Profile[]): string {
  return rows
    .map(
      (r) =>
        `${r.id}:${r.updated_at}:${r.emp_code ?? ''}:${r.registration_status}:${r.is_active}`,
    )
    .join('|');
}

function WebEmployeesTable({
  data,
  isDark,
  onEdit,
  selectedIds,
  onSelectionChange,
  onSendInvite,
}: {
  data: Profile[];
  isDark: boolean;
  onEdit: (emp: Profile) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onSendInvite: (id: string) => void;
}) {
  const [filters, setFilters] = useViewState('admin/employees.columnFilters', {
    empCode: '',
    name: '',
    email: '',
    department: '',
    role: '',
    phone: '',
    status: '',
  });

  const [paginationModel, setPaginationModel] = useViewState(
    'admin/employees.pagination',
    { page: 0, pageSize: 25 }
  );
  const [sortModel, setSortModel] = useViewState<any[]>('admin/employees.sort', []);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; row: Profile } | null>(null);

  // Memoized so the `rows` prop keeps a stable reference across the
  // re-render that a pagination/sort click triggers. Without this, a
  // fresh array every render makes MUI X DataGrid fire its
  // "rows changed → reset to page 0" safeguard, so paging never sticks.
  const filteredData = useMemo(
    () =>
      data.filter((row) => {
        const empCode = (row.emp_code || '').toLowerCase();
        const name = row.full_name.toLowerCase();
        const email = row.email.toLowerCase();
        const dept = (row.department || '').toLowerCase();
        const role = getRoleLabel(row.role).toLowerCase();
        const phone = (row.phone || '').toLowerCase();
        const status = getStatusDisplay(row).label.toLowerCase();
        if (filters.empCode && !empCode.includes(filters.empCode.toLowerCase())) return false;
        if (filters.name && !name.includes(filters.name.toLowerCase())) return false;
        if (filters.email && !email.includes(filters.email.toLowerCase())) return false;
        if (filters.department && !dept.includes(filters.department.toLowerCase())) return false;
        if (filters.role && !role.includes(filters.role.toLowerCase())) return false;
        if (filters.phone && !phone.includes(filters.phone.toLowerCase())) return false;
        if (filters.status && !status.includes(filters.status.toLowerCase())) return false;
        return true;
      }),
    [data, filters]
  );

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
      <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const }}>{label}</span>
      <input
        placeholder="Filter..."
        value={filters[filterKey]}
        onChange={(e) => setFilters((f) => ({ ...f, [filterKey]: e.target.value }))}
        onClick={(e) => e.stopPropagation()}
        style={inputStyle}
      />
    </div>
  );

  const columns = [
    {
      field: 'emp_code',
      headerName: 'Emp Code',
      flex: 0.7,
      minWidth: 110,
      renderHeader: renderHeader('Emp Code', 'empCode'),
      valueGetter: (_value: any, row: Profile) => row.emp_code || '',
      renderCell: (params: any) => (
        <span style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#475569' }}>
          {params.row.emp_code || '—'}
        </span>
      ),
    },
    {
      field: 'full_name',
      headerName: 'Employee',
      flex: 1.2,
      minWidth: 150,
      renderHeader: renderHeader('Employee', 'name'),
      renderCell: (params: any) => (
        <span style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
          {params.row.full_name}
        </span>
      ),
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1.3,
      minWidth: 200,
      renderHeader: renderHeader('Email', 'email'),
      renderCell: (params: any) => (
        <span style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#475569' }}>{params.row.email}</span>
      ),
    },
    {
      field: 'phone',
      headerName: 'Phone',
      flex: 0.8,
      minWidth: 130,
      renderHeader: renderHeader('Phone', 'phone'),
      renderCell: (params: any) => (
        <span style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#475569' }}>
          {params.row.phone || '—'}
        </span>
      ),
    },
    {
      field: 'department',
      headerName: 'Department',
      flex: 1,
      minWidth: 140,
      renderHeader: renderHeader('Department', 'department'),
      valueGetter: (_value: any, row: Profile) => row.department || '',
      renderCell: (params: any) => (
        <span style={{ fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
          {params.row.department || '—'}
        </span>
      ),
    },
    {
      field: 'role',
      headerName: 'Role',
      flex: 0.7,
      minWidth: 110,
      renderHeader: renderHeader('Role', 'role'),
      valueGetter: (_value: any, row: Profile) => getRoleLabel(row.role),
      renderCell: (params: any) => (
        <Chip
          label={getRoleLabel(params.row.role)}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: 12 }}
        />
      ),
    },
    {
      field: 'registration_status',
      headerName: 'Status',
      flex: 0.7,
      minWidth: 120,
      renderHeader: renderHeader('Status', 'status'),
      valueGetter: (_value: any, row: Profile) => getStatusDisplay(row).label,
      renderCell: (params: any) => {
        const s = getStatusDisplay(params.row);
        return (
          <Chip
            label={s.label}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: 11,
              backgroundColor: s.bg,
              color: s.fg,
              border: 'none',
            }}
          />
        );
      },
    },
    {
      field: '_actions',
      headerName: '',
      width: 56,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: any) => (
        <IconButton
          size="small"
          onClick={(e: any) => {
            e.stopPropagation();
            setMenuAnchor({ el: e.currentTarget, row: params.row });
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94A3B8' : '#475569'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
          </svg>
        </IconButton>
      ),
    },
  ];

  const closeMenu = () => setMenuAnchor(null);
  const menuRow = menuAnchor?.row;
  const menuStatus = menuRow?.registration_status;

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <DataGrid
        rows={filteredData}
        columns={columns}
        getRowId={(row: any) => row.id}
        checkboxSelection
        rowSelectionModel={{ type: 'include', ids: new Set(selectedIds) }}
        onRowSelectionModelChange={(model: any) => {
          // MUI X DataGrid v8 returns { type, ids: Set } instead of an array.
          const ids = model?.ids instanceof Set ? Array.from(model.ids) : (Array.isArray(model) ? model : []);
          onSelectionChange(ids as string[]);
        }}
        disableRowSelectionOnClick
        disableColumnFilter
        disableColumnMenu
        columnHeaderHeight={70}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        pageSizeOptions={[10, 25, 50]}
        rowHeight={48}
        onRowClick={(params: any) => onEdit(params.row)}
        sx={{
          borderRadius: 3,
          cursor: 'pointer',
          '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
          '& .MuiDataGrid-columnHeader': { alignItems: 'flex-start' },
          '& .MuiDataGrid-columnHeaderTitleContainer': { overflow: 'visible' },
          '& .MuiDataGrid-row:hover': { backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)' },
        }}
      />

      {/* Per-row action menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={!!menuAnchor}
        onClose={closeMenu}
      >
        {/* HR can send / resend an invite at any time, as long as the
            employee is still active. Label adapts based on status. */}
        {menuRow?.is_active && (
          <MenuItem
            onClick={() => {
              if (menuRow) onSendInvite(menuRow.id);
              closeMenu();
            }}
          >
            {menuStatus === 'not_invited'
              ? 'Send Invite'
              : 'Resend Invite (regenerate password)'}
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            if (menuRow) onEdit(menuRow);
            closeMenu();
          }}
        >
          Edit Employee
        </MenuItem>
      </Menu>
    </div>
  );
}

// --------------- Edit Employee Dialog ---------------

function EditEmployeeDialog({
  state,
  onClose,
  onCancel,
  onChange,
  onSubmit,
  employees,
  departments,
  designations,
}: {
  state: EditDialogState;
  onClose: () => void;
  onCancel: () => void;
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
  employees: Profile[];
  departments: string[];
  designations: string[];
}) {
  const emp = state.employee;
  if (!emp) return null;

  // Same role-filtered defaults as the New Employee dialog, plus the
  // "Show all employees" override toggle.
  const activeEmployees = employees.filter((e) => e.is_active && e.id !== emp.id);

  const supervisorOptions = state.show_all_supervisors
    ? activeEmployees
    : activeEmployees.filter((e) => SUPERVISOR_DEFAULT_ROLES.includes(e.role));

  const managerOptions = state.show_all_managers
    ? activeEmployees
    : activeEmployees.filter((e) => MANAGER_DEFAULT_ROLES.includes(e.role));

  const workdayHoursNum = parseFloat(state.workday_hours);
  const workdayHoursValid = !isNaN(workdayHoursNum) && workdayHoursNum > 0 && workdayHoursNum <= 24;

  // Edit dialog: emp_code stays required (it's HR-only and must remain set);
  // phone is now optional (employee fills it in during their registration form).
  const isValid =
    state.email.trim().length > 0 &&
    state.full_name.trim().length > 0 &&
    state.emp_code.trim().length > 0 &&
    state.nationality.trim().length > 0 &&
    state.department.trim().length > 0 &&
    state.job_title.trim().length > 0 &&
    state.start_date.trim().length > 0 &&
    workdayHoursValid &&
    !!state.supervisor_id &&
    !!state.manager_id;

  // "Send invite now" — available for any active employee. For not_invited
  // it's the first invite; for everything else it regenerates the password
  // and re-sends the email.
  const canShowSendInviteNow = emp.is_active;
  const isFirstInvite = emp.registration_status === 'not_invited';

  return (
    <Dialog
      open={state.open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ pb: 1, pt: 3, px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Edit Employee</div>
        <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.6, marginTop: 2 }}>
          {emp.full_name} · {emp.department || 'No department'}
        </div>
      </DialogTitle>
      <DialogContent sx={{ pt: '24px !important', pb: 1, px: 3, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'visible' }}>
        {state.error && (
          <MuiAlert severity="error" sx={{ mb: 1 }}>
            {state.error}
          </MuiAlert>
        )}

        {/* Identity row */}
        <div style={{ display: 'flex', gap: 12 }}>
          <MuiTextField
            label="Full Name"
            value={state.full_name}
            onChange={(e: any) => onChange('full_name', e.target.value)}
            fullWidth size="small" required
          />
          <MuiTextField
            label="Email"
            value={state.email}
            onChange={(e: any) => onChange('email', e.target.value)}
            fullWidth size="small" required type="email"
            helperText="Changing email re-points the auth account immediately."
          />
        </div>

        {/* Code (HR-editable, kept required since it must remain set) + phone (optional) */}
        <div style={{ display: 'flex', gap: 12 }}>
          <MuiTextField
            label="Employee Code"
            value={state.emp_code}
            onChange={(e: any) => onChange('emp_code', e.target.value)}
            fullWidth size="small" required placeholder="e.g. 70150"
            helperText="HR-editable. Database enforces uniqueness."
          />
          <MuiTextField
            label="Phone (optional)"
            value={state.phone}
            onChange={(e: any) => onChange('phone', e.target.value)}
            fullWidth size="small"
            placeholder="e.g. +966 50 123 4567"
          />
        </div>

        {/* Nationality — required. The employee can confirm/correct it
            during their registration form (pre-filled from this value). */}
        <div style={{ display: 'flex', gap: 12 }}>
          <MuiTextField
            label="Nationality"
            value={state.nationality}
            onChange={(e: any) => onChange('nationality', e.target.value)}
            fullWidth size="small" required
            placeholder="e.g. Saudi, Egyptian, Indian"
          />
        </div>

        {/* Job title + start date */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Autocomplete
            freeSolo forcePopupIcon
            options={designations}
            value={state.job_title || null}
            onChange={(_: any, val: string | null) => onChange('job_title', val || '')}
            onInputChange={(_: any, val: string) => onChange('job_title', val)}
            renderInput={(params: any) => (
              <MuiTextField {...params} label="Job Title" size="small" required placeholder="Search or type..." />
            )}
            fullWidth size="small"
          />
          <MuiTextField
            label="Start Date"
            value={state.start_date}
            onChange={(e: any) => onChange('start_date', e.target.value)}
            fullWidth size="small" required type="date"
            InputLabelProps={{ shrink: true }}
          />
        </div>

        {/* Role + Workday Hours */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Autocomplete
            options={ROLE_OPTIONS}
            value={ROLE_OPTIONS.find((o) => o.value === state.role) || null}
            onChange={(_: any, val: any) => val && onChange('role', val.value)}
            getOptionLabel={(opt: any) => opt.label}
            isOptionEqualToValue={(opt: any, val: any) => opt.value === val.value}
            renderInput={(params: any) => (
              <MuiTextField {...params} label="Role" size="small" required />
            )}
            fullWidth size="small" disableClearable
          />
          <MuiTextField
            label="Workday Hours"
            value={state.workday_hours}
            onChange={(e: any) => onChange('workday_hours', e.target.value)}
            fullWidth size="small" required type="number"
            inputProps={{ min: 1, max: 24, step: 0.5 }}
            helperText="Standard daily hours (default 8)"
          />
        </div>

        {/* Annual PTO entitlement — drives the monthly accrual */}
        <div style={{ display: 'flex', gap: 12 }}>
          <MuiTextField
            label="Annual PTO Entitlement (days/year)"
            value={state.annual_leave_entitlement_days}
            onChange={(e: any) => onChange('annual_leave_entitlement_days', e.target.value)}
            fullWidth size="small" required type="number"
            inputProps={{ min: 0, max: 60, step: 0.5 }}
            helperText="30 = Saudi 5+ yrs · 21 = under 5 yrs"
          />
          <MuiTextField
            label="Monthly Accrual (auto)"
            value={(() => {
              const days = parseFloat(state.annual_leave_entitlement_days) || 0;
              const hrs = parseFloat(state.workday_hours) || 8;
              const monthlyDays = days / 12;
              const monthlyHours = monthlyDays * hrs;
              if (!days) return '—';
              return `${monthlyDays.toFixed(2)} days/month  (${monthlyHours.toFixed(1)}h)`;
            })()}
            fullWidth size="small"
            InputProps={{ readOnly: true }}
            helperText="Auto-credited on day 1 of each month"
          />
        </div>

        {/* ── Compensation ─────────────────────────────────────────
            Effective-dated rows in employee_compensation (migration
            033). On save, if ANY of the four amounts changed vs the
            loaded snapshot, we INSERT a new row with the picked
            effective_from. Past rows stay as the audit trail. */}
        <div style={{ marginTop: 4, padding: 12, borderRadius: 8, border: '1px solid rgba(148,163,184,0.25)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.75, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Compensation ({state.comp_currency || 'SAR'})
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <MuiTextField
              label="Basic Salary"
              value={state.comp_basic_salary}
              onChange={(e: any) => onChange('comp_basic_salary', e.target.value)}
              fullWidth size="small" type="number"
              inputProps={{ min: 0, step: 0.01 }}
            />
            <MuiTextField
              label="HRA (Housing)"
              value={state.comp_hra}
              onChange={(e: any) => onChange('comp_hra', e.target.value)}
              fullWidth size="small" type="number"
              inputProps={{ min: 0, step: 0.01 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <MuiTextField
              label="Transportation"
              value={state.comp_transportation}
              onChange={(e: any) => onChange('comp_transportation', e.target.value)}
              fullWidth size="small" type="number"
              inputProps={{ min: 0, step: 0.01 }}
            />
            <MuiTextField
              label="Other Allowances"
              value={state.comp_other_allowances}
              onChange={(e: any) => onChange('comp_other_allowances', e.target.value)}
              fullWidth size="small" type="number"
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Phone, food, etc. — single bucket for now"
            />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'flex-start' }}>
            <MuiTextField
              label="Effective From"
              type="date"
              value={state.comp_effective_from}
              onChange={(e: any) => onChange('comp_effective_from', e.target.value)}
              fullWidth size="small"
              InputLabelProps={{ shrink: true }}
              helperText="Only applies if any amount above changed"
            />
            <MuiTextField
              label="Monthly Pay (auto)"
              value={(() => {
                const sum =
                  (parseFloat(state.comp_basic_salary) || 0) +
                  (parseFloat(state.comp_hra) || 0) +
                  (parseFloat(state.comp_transportation) || 0) +
                  (parseFloat(state.comp_other_allowances) || 0);
                return sum > 0 ? sum.toFixed(2) + ' ' + (state.comp_currency || 'SAR') : '—';
              })()}
              fullWidth size="small"
              InputProps={{ readOnly: true }}
            />
          </div>
          <MuiTextField
            label="Notes (optional)"
            value={state.comp_notes}
            onChange={(e: any) => onChange('comp_notes', e.target.value)}
            fullWidth size="small"
            multiline rows={1}
            placeholder='e.g. "2026 annual raise" or "Promotion to Senior Engineer"'
            sx={{ mt: 1 }}
          />
        </div>

        {/* Department */}
        <Autocomplete
          freeSolo forcePopupIcon
          options={departments}
          value={state.department || null}
          onChange={(_: any, val: string | null) => onChange('department', val || '')}
          onInputChange={(_: any, val: string) => onChange('department', val)}
          renderInput={(params: any) => (
            <MuiTextField {...params} label="Department" size="small" required placeholder="Search or type..." />
          )}
          fullWidth size="small"
        />

        {/* Supervisor / Reports To */}
        <div>
          <Autocomplete
            options={supervisorOptions}
            value={supervisorOptions.find((e) => e.id === state.supervisor_id) || null}
            onChange={(_: any, val: Profile | null) => onChange('supervisor_id', val?.id || null)}
            getOptionLabel={(opt: Profile) => `${opt.full_name} (${getRoleLabel(opt.role)})`}
            isOptionEqualToValue={(opt: Profile, val: Profile) => opt.id === val.id}
            renderInput={(params: any) => (
              <MuiTextField {...params} label="Supervisor / Reports To" size="small" required placeholder="Search by name, email, or department..." />
            )}
            fullWidth size="small"
          />
          <FormControlLabel
            control={
              <Switch
                checked={state.show_all_supervisors}
                onChange={(e: any) => onChange('show_all_supervisors', e.target.checked)}
                size="small"
              />
            }
            label={<span style={{ fontSize: 12, opacity: 0.75 }}>Show all employees (default: only supervisors / managers / HR)</span>}
            sx={{ ml: 0, mt: 0.5 }}
          />
        </div>

        {/* Manager */}
        <div>
          <Autocomplete
            options={managerOptions}
            value={managerOptions.find((e) => e.id === state.manager_id) || null}
            onChange={(_: any, val: Profile | null) => onChange('manager_id', val?.id || null)}
            getOptionLabel={(opt: Profile) => `${opt.full_name} (${getRoleLabel(opt.role)})`}
            isOptionEqualToValue={(opt: Profile, val: Profile) => opt.id === val.id}
            renderInput={(params: any) => (
              <MuiTextField {...params} label="Manager" size="small" required placeholder="Search by name, email, or department..." />
            )}
            fullWidth size="small"
          />
          <FormControlLabel
            control={
              <Switch
                checked={state.show_all_managers}
                onChange={(e: any) => onChange('show_all_managers', e.target.checked)}
                size="small"
              />
            }
            label={<span style={{ fontSize: 12, opacity: 0.75 }}>Show all employees (default: only managers / HR Director)</span>}
            sx={{ ml: 0, mt: 0.5 }}
          />
        </div>

        {/* Status (extra over the New form) */}
        <MuiTextField
          label="Status"
          value={state.is_active ? 'active' : 'inactive'}
          onChange={(e: any) => onChange('is_active', e.target.value === 'active')}
          fullWidth size="small" select
        >
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </MuiTextField>

        {/* ID document on file — preview + rotate-and-save. Mirrors the
            Review Registration dialog so HR doesn't have to leave Edit
            to fix a sideways scan. PDFs render as a clickable card; only
            images get the rotate button. */}
        {state.id_document_url && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              ID Document on File
            </div>
            {state.id_document_signed_url ? (
              <>
                {/\.pdf$/i.test(state.id_document_url) ? (
                  <a
                    href={state.id_document_signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      border: '1px solid rgba(148,163,184,0.4)',
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>📄</span>
                    <span style={{ fontSize: 13 }}>
                      {state.id_document_url.split('/').pop()}
                      <br />
                      <span style={{ fontSize: 11, opacity: 0.7 }}>Click to open in a new tab</span>
                    </span>
                  </a>
                ) : (
                  <>
                    <a
                      href={state.id_document_signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        border: '1px solid rgba(148,163,184,0.4)',
                        borderRadius: 8,
                        padding: 16,
                        backgroundColor: 'rgba(255,255,255,0.02)',
                      }}
                      title="Click to open full size"
                    >
                      <img
                        src={state.id_document_signed_url}
                        alt="ID document"
                        style={{
                          display: 'block',
                          maxWidth: '100%',
                          maxHeight: 240,
                          margin: '0 auto',
                          transform: `rotate(${state.doc_rotation}deg)`,
                          transition: 'transform 200ms',
                        }}
                      />
                    </a>
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MuiButton
                        size="small"
                        variant="outlined"
                        onClick={() => onChange('doc_rotation', (state.doc_rotation + 90) % 360)}
                        disabled={state.doc_rotation_saving}
                        title="Rotate 90° clockwise — click Save rotation to persist"
                        sx={{ textTransform: 'none' }}
                      >
                        ⟲ Rotate 90°
                      </MuiButton>
                      {state.doc_rotation !== 0 && (
                        <>
                          <MuiButton
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => onChange('__save_rotation__', true)}
                            disabled={state.doc_rotation_saving}
                            sx={{ textTransform: 'none' }}
                          >
                            {state.doc_rotation_saving ? 'Saving…' : 'Save rotation'}
                          </MuiButton>
                          <MuiButton
                            size="small"
                            color="inherit"
                            onClick={() => onChange('doc_rotation', 0)}
                            disabled={state.doc_rotation_saving}
                            sx={{ textTransform: 'none' }}
                          >
                            Reset
                          </MuiButton>
                        </>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.6, fontStyle: 'italic' }}>Loading preview…</div>
            )}
          </div>
        )}

        {/* Email actions — mutually exclusive (radio). Picking Invite
            is the same as picking Reset + Info Form; we send the reset
            first and the form request after the reset succeeds, per
            the agreed sequence. Auto-warning opt-in lives at the
            bottom so HR can toggle it independent of any send action. */}
        {canShowSendInviteNow && (
          <div style={{ marginTop: 8, padding: 12, borderRadius: 8, border: '1px dashed rgba(148,163,184,0.5)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.75, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Email After Save
            </div>
            {([
              { val: 'none',      label: 'Save only',                     hint: 'No email.' },
              { val: 'reset',     label: 'Send password reset',           hint: 'Just the 6-digit OTP. Status unchanged.' },
              { val: 'invite',    label: 'Send invite (reset + form)',    hint: 'Two emails, sent in order: password reset first; on success, info-form request.' },
              { val: 'info_form', label: 'Send info-form request',        hint: 'No password reset. Sets status to Info Rejected and emails them a link to update.' },
              { val: 'warning',   label: 'Send manual warning',           hint: 'Logs to form_warnings_log with type=manual. No status change.' },
            ] as const).map((opt) => (
              <FormControlLabel
                key={opt.val}
                control={
                  <Checkbox
                    checked={state.email_action === opt.val}
                    onChange={() => onChange('email_action', opt.val)}
                    sx={{ py: 0.5 }}
                  />
                }
                label={
                  <span style={{ fontSize: 13 }}>
                    <strong>{opt.label}</strong>{' '}
                    <span style={{ opacity: 0.7 }}>— {opt.hint}</span>
                  </span>
                }
                sx={{ ml: 0, display: 'flex', mb: 0.25 }}
              />
            ))}

            {(state.email_action === 'info_form' || state.email_action === 'warning') && (
              <MuiTextField
                label={state.email_action === 'info_form' ? 'Comment for employee (optional)' : 'Warning message (optional)'}
                value={state.email_action_comment}
                onChange={(e: any) => onChange('email_action_comment', e.target.value)}
                fullWidth size="small"
                multiline rows={2}
                placeholder={state.email_action === 'info_form'
                  ? 'e.g. "Please update your iqama expiry and re-upload the scan."'
                  : 'e.g. "Day-5 reminder: this is now blocking payroll."'}
                sx={{ mt: 1 }}
              />
            )}
          </div>
        )}

        {/* Auto-warning opt-in. Persisted to profiles.warn_on_uncompleted_form
            (migration 031). The daily cron only emails when this is true
            AND the employee has been in pending_info / info_rejected
            for 3+ days. */}
        <div style={{ marginTop: 4, padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.25)' }}>
          <FormControlLabel
            control={
              <Switch
                checked={state.warn_on_uncompleted_form}
                onChange={(e: any) => onChange('warn_on_uncompleted_form', e.target.checked)}
                size="small"
              />
            }
            label={
              <span style={{ fontSize: 13 }}>
                <strong>Auto-warn if registration form goes uncompleted</strong>{' '}
                <span style={{ opacity: 0.7 }}>
                  — at day 3 a reminder email is sent to the employee + HR; at day 4 a "salary on hold" email is sent.
                </span>
              </span>
            }
            sx={{ ml: 0 }}
          />
        </div>

        {/* Capability flags — layered on top of Role for specific approval
            and decision rights without growing the Role enum. */}
        <div style={{ marginTop: 8, padding: 12, borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, opacity: 0.75, marginBottom: 6, textTransform: 'uppercase' }}>
            Capabilities
          </div>
          <FormControlLabel
            control={
              <Checkbox
                checked={state.is_general_manager}
                onChange={(e: any) => onChange('is_general_manager', e.target.checked)}
              />
            }
            label={<span style={{ fontSize: 13 }}><strong>General Manager.</strong> <span style={{ opacity: 0.7 }}>Can approve project-hours change requests.</span></span>}
            sx={{ ml: 0, display: 'flex' }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={state.is_operations_manager}
                onChange={(e: any) => onChange('is_operations_manager', e.target.checked)}
              />
            }
            label={<span style={{ fontSize: 13 }}><strong>Operations Manager.</strong> <span style={{ opacity: 0.7 }}>Visible separately from Role for reporting.</span></span>}
            sx={{ ml: 0, display: 'flex' }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={state.can_approve_project_hours_changes}
                onChange={(e: any) => onChange('can_approve_project_hours_changes', e.target.checked)}
              />
            }
            label={<span style={{ fontSize: 13 }}><strong>Can approve project-hours changes.</strong> <span style={{ opacity: 0.7 }}>Explicit grant; HR Director and GM also get this implicitly.</span></span>}
            sx={{ ml: 0, display: 'flex' }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={state.can_close_month}
                onChange={(e: any) => onChange('can_close_month', e.target.checked)}
              />
            }
            label={<span style={{ fontSize: 13 }}><strong>Can close month.</strong> <span style={{ opacity: 0.7 }}>Locks payroll-relevant changes for the month.</span></span>}
            sx={{ ml: 0, display: 'flex' }}
          />
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
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
        >
          {(() => {
            const willSendEmail = state.email_action !== 'none';
            if (state.submitting) return willSendEmail ? 'Saving + sending…' : 'Saving…';
            return willSendEmail ? 'Save + send email' : 'Save Changes';
          })()}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

// --------------- New Employee Dialog ---------------

const SUPERVISOR_DEFAULT_ROLES = [Role.Supervisor, Role.Manager, Role.HR, Role.HRDirector];
const MANAGER_DEFAULT_ROLES = [Role.Manager, Role.HRDirector];

function InviteEmployeeDialog({
  state,
  onClose,
  onCancel,
  onChange,
  onSubmit,
  employees,
  departments,
  designations,
}: {
  state: InviteDialogState;
  onClose: () => void;
  onCancel: () => void;
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
  employees: Profile[];
  departments: string[];
  designations: string[];
}) {
  const activeEmployees = employees.filter((e) => e.is_active);

  const supervisorOptions = state.show_all_supervisors
    ? activeEmployees
    : activeEmployees.filter((e) => SUPERVISOR_DEFAULT_ROLES.includes(e.role));

  const managerOptions = state.show_all_managers
    ? activeEmployees
    : activeEmployees.filter((e) => MANAGER_DEFAULT_ROLES.includes(e.role));

  const workdayHoursNum = parseFloat(state.workday_hours);
  const workdayHoursValid = !isNaN(workdayHoursNum) && workdayHoursNum > 0 && workdayHoursNum <= 24;

  // emp_code and phone are now optional at HR creation time:
  // - emp_code is auto-generated by the create-employee Edge Function via
  //   the emp_code_seq sequence if blank. HR can still override (e.g. for
  //   employees imported from a legacy payroll system).
  // - phone is filled in by the employee during the registration form.
  const isValid =
    state.email.trim().length > 0 &&
    state.full_name.trim().length > 0 &&
    state.nationality.trim().length > 0 &&
    state.department.trim().length > 0 &&
    state.job_title.trim().length > 0 &&
    state.start_date.trim().length > 0 &&
    workdayHoursValid &&
    !!state.supervisor_id &&
    !!state.manager_id;

  return (
    <Dialog
      open={state.open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ pb: 1, pt: 3, px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>New Employee</div>
        <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.6, marginTop: 2 }}>
          Create a profile now — send the invite email when you're ready (or check the box to send it immediately). Employee Code is auto-generated; phone is filled in by the employee.
        </div>
      </DialogTitle>
      <DialogContent sx={{ pt: '24px !important', pb: 1, px: 3, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'visible' }}>
        {state.error && (
          <MuiAlert severity="error" sx={{ mb: 1 }}>
            {state.error}
          </MuiAlert>
        )}

        {/* Identity row */}
        <div style={{ display: 'flex', gap: 12 }}>
          <MuiTextField
            label="Full Name"
            value={state.full_name}
            onChange={(e: any) => onChange('full_name', e.target.value)}
            fullWidth size="small" required
          />
          <MuiTextField
            label="Email"
            value={state.email}
            onChange={(e: any) => onChange('email', e.target.value)}
            fullWidth size="small" required type="email"
          />
        </div>

        {/* Code + phone — both optional. Code auto-generates server-side; phone is filled by employee during registration. */}
        <div style={{ display: 'flex', gap: 12 }}>
          <MuiTextField
            label="Employee Code (optional)"
            value={state.emp_code}
            onChange={(e: any) => onChange('emp_code', e.target.value)}
            fullWidth size="small"
            placeholder="Leave blank — auto-generated"
            helperText="Override only when importing an employee with an existing code"
          />
          <MuiTextField
            label="Phone (optional)"
            value={state.phone}
            onChange={(e: any) => onChange('phone', e.target.value)}
            fullWidth size="small"
            placeholder="Employee fills this in"
          />
        </div>

        {/* Nationality — required. Pre-fills the employee's registration
            form; they can confirm/correct it there. */}
        <div style={{ display: 'flex', gap: 12 }}>
          <MuiTextField
            label="Nationality"
            value={state.nationality}
            onChange={(e: any) => onChange('nationality', e.target.value)}
            fullWidth size="small" required
            placeholder="e.g. Saudi, Egyptian, Indian"
          />
        </div>

        {/* Job title + start date */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Autocomplete
            freeSolo forcePopupIcon
            options={designations}
            value={state.job_title || null}
            onChange={(_: any, val: string | null) => onChange('job_title', val || '')}
            onInputChange={(_: any, val: string) => onChange('job_title', val)}
            renderInput={(params: any) => (
              <MuiTextField {...params} label="Job Title" size="small" required placeholder="Search or type..." />
            )}
            fullWidth size="small"
          />
          <MuiTextField
            label="Start Date"
            value={state.start_date}
            onChange={(e: any) => onChange('start_date', e.target.value)}
            fullWidth size="small" required type="date"
            InputLabelProps={{ shrink: true }}
          />
        </div>

        {/* Role + Workday Hours */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Autocomplete
            options={ROLE_OPTIONS}
            value={ROLE_OPTIONS.find((o) => o.value === state.role) || null}
            onChange={(_: any, val: any) => val && onChange('role', val.value)}
            getOptionLabel={(opt: any) => opt.label}
            isOptionEqualToValue={(opt: any, val: any) => opt.value === val.value}
            renderInput={(params: any) => (
              <MuiTextField {...params} label="Role" size="small" required />
            )}
            fullWidth size="small" disableClearable
          />
          <MuiTextField
            label="Workday Hours"
            value={state.workday_hours}
            onChange={(e: any) => onChange('workday_hours', e.target.value)}
            fullWidth size="small" required type="number"
            inputProps={{ min: 1, max: 24, step: 0.5 }}
            helperText="Standard daily hours (default 8)"
          />
        </div>

        {/* Annual PTO entitlement — drives the monthly accrual */}
        <div style={{ display: 'flex', gap: 12 }}>
          <MuiTextField
            label="Annual PTO Entitlement (days/year)"
            value={state.annual_leave_entitlement_days}
            onChange={(e: any) => onChange('annual_leave_entitlement_days', e.target.value)}
            fullWidth size="small" required type="number"
            inputProps={{ min: 0, max: 60, step: 0.5 }}
            helperText="30 = Saudi 5+ yrs · 21 = under 5 yrs"
          />
          <MuiTextField
            label="Monthly Accrual (auto)"
            value={(() => {
              const days = parseFloat(state.annual_leave_entitlement_days) || 0;
              const hrs = parseFloat(state.workday_hours) || 8;
              const monthlyDays = days / 12;
              const monthlyHours = monthlyDays * hrs;
              if (!days) return '—';
              return `${monthlyDays.toFixed(2)} days/month  (${monthlyHours.toFixed(1)}h)`;
            })()}
            fullWidth size="small"
            InputProps={{ readOnly: true }}
            helperText="Auto-credited on day 1 of each month"
          />
        </div>

        {/* Department */}
        <Autocomplete
          freeSolo forcePopupIcon
          options={departments}
          value={state.department || null}
          onChange={(_: any, val: string | null) => onChange('department', val || '')}
          onInputChange={(_: any, val: string) => onChange('department', val)}
          renderInput={(params: any) => (
            <MuiTextField {...params} label="Department" size="small" required placeholder="Search or type..." />
          )}
          fullWidth size="small"
        />

        {/* Supervisor / Reports To — with toggle */}
        <div>
          <Autocomplete
            options={supervisorOptions}
            value={supervisorOptions.find((e) => e.id === state.supervisor_id) || null}
            onChange={(_: any, val: Profile | null) => onChange('supervisor_id', val?.id || null)}
            getOptionLabel={(opt: Profile) => `${opt.full_name} (${getRoleLabel(opt.role)})`}
            isOptionEqualToValue={(opt: Profile, val: Profile) => opt.id === val.id}
            renderInput={(params: any) => (
              <MuiTextField {...params} label="Supervisor / Reports To" size="small" required placeholder="Search by name, email, or department..." />
            )}
            fullWidth size="small"
          />
          <FormControlLabel
            control={
              <Switch
                checked={state.show_all_supervisors}
                onChange={(e: any) => onChange('show_all_supervisors', e.target.checked)}
                size="small"
              />
            }
            label={<span style={{ fontSize: 12, opacity: 0.75 }}>Show all employees (default: only supervisors / managers / HR)</span>}
            sx={{ ml: 0, mt: 0.5 }}
          />
        </div>

        {/* Manager — with toggle */}
        <div>
          <Autocomplete
            options={managerOptions}
            value={managerOptions.find((e) => e.id === state.manager_id) || null}
            onChange={(_: any, val: Profile | null) => onChange('manager_id', val?.id || null)}
            getOptionLabel={(opt: Profile) => `${opt.full_name} (${getRoleLabel(opt.role)})`}
            isOptionEqualToValue={(opt: Profile, val: Profile) => opt.id === val.id}
            renderInput={(params: any) => (
              <MuiTextField {...params} label="Manager" size="small" required placeholder="Search by name, email, or department..." />
            )}
            fullWidth size="small"
          />
          <FormControlLabel
            control={
              <Switch
                checked={state.show_all_managers}
                onChange={(e: any) => onChange('show_all_managers', e.target.checked)}
                size="small"
              />
            }
            label={<span style={{ fontSize: 12, opacity: 0.75 }}>Show all employees (default: only managers / HR Director)</span>}
            sx={{ ml: 0, mt: 0.5 }}
          />
        </div>

        {/* Send invite now */}
        <div style={{ marginTop: 8, padding: 12, borderRadius: 8, border: '1px dashed rgba(148,163,184,0.5)' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={state.send_invite_now}
                onChange={(e: any) => onChange('send_invite_now', e.target.checked)}
              />
            }
            label={
              <span style={{ fontSize: 13 }}>
                <strong>Send invite email immediately.</strong>{' '}
                <span style={{ opacity: 0.7 }}>
                  Otherwise the employee shows up as "Not Invited" and you send the email later from the table.
                </span>
              </span>
            }
            sx={{ ml: 0 }}
          />
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
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
        >
          {state.submitting
            ? (state.send_invite_now ? 'Creating + Sending...' : 'Creating...')
            : (state.send_invite_now ? 'Create + Send Invite' : 'Create Employee')}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

// --------------- Bulk Email Action Dialog ---------------

/**
 * Bulk action dialog. Used by the four buttons in the Employee
 * Directory header (Send Invite / Reset / Info Form Request / Warning).
 * One dialog, four behaviors — the `action` prop drives the title,
 * subtitle, CTA wording, and whether the comment box renders.
 *
 * Common features regardless of action:
 *   - Editable email per row (saves via update-employee-email
 *     edge function before the bulk send fires).
 *   - Remove × per row.
 *   - Inactive-row warning chip + top-of-dialog summary.
 */
const ACTION_META: Record<
  'reset' | 'invite' | 'info_form' | 'warning',
  { title: string; subtitle: string; cta: string; commentLabel?: string; commentPlaceholder?: string }
> = {
  reset: {
    title: 'Send password reset',
    subtitle: 'Each recipient gets a 6-digit OTP. No status change — they reset and sign in normally.',
    cta: 'Send password reset',
  },
  invite: {
    title: 'Send invite (reset + info-form)',
    subtitle: 'Two emails sent in order: password-reset first, then the info-form request on success. Active employees get demoted to Info Rejected for the form step.',
    cta: 'Send invite to',
    commentLabel: 'Comment for employee (optional)',
    commentPlaceholder: 'e.g. "Welcome back — please re-confirm your iqama details."',
  },
  info_form: {
    title: 'Send info-form request',
    subtitle: 'No password reset. Status moves to Info Rejected; recipient signs in with their current password and sees the task on their dashboard.',
    cta: 'Send info-form request',
    commentLabel: 'Comment for employee (optional)',
    commentPlaceholder: 'e.g. "Please update your iqama expiry and re-upload the scan."',
  },
  warning: {
    title: 'Send manual warning',
    subtitle: 'Logs to form_warnings_log with type=manual. Sends the manual_form_warning email. No status change.',
    cta: 'Send warning',
    commentLabel: 'Warning message (optional)',
    commentPlaceholder: 'e.g. "Final reminder before this blocks payroll."',
  },
};

function ResendEmailDialog({
  open,
  action,
  rows,
  comment,
  submitting,
  onChangeEmail,
  onChangeComment,
  onRemoveRow,
  onClose,
  onConfirm,
}: {
  open: boolean;
  action: 'reset' | 'invite' | 'info_form' | 'warning';
  rows: ResendRow[];
  comment: string;
  submitting: boolean;
  onChangeEmail: (id: string, email: string) => void;
  onChangeComment: (comment: string) => void;
  onRemoveRow: (id: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const meta = ACTION_META[action];
  const inactiveCount = rows.filter((r) => !r.is_active).length;
  const editedCount = rows.filter((r) => r.emailDirty).length;
  const validEmail = (e: string) => /^\S+@\S+\.\S+$/.test(e.trim());
  const allValid = rows.length > 0 && rows.every((r) => validEmail(r.email));

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ pb: 1, pt: 3, px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{meta.title}</div>
        <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.65, marginTop: 4 }}>
          {meta.subtitle} Edit the destination email per-row if needed.
        </div>
      </DialogTitle>

      <DialogContent
        sx={{
          pt: '20px !important',
          pb: 1,
          px: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          overflow: 'visible',
        }}
      >
        {inactiveCount > 0 && (
          <MuiAlert severity="warning" sx={{ mb: 1 }}>
            {inactiveCount} of {rows.length} selected employee(s) are <b>inactive</b>.
            They'll still receive the email but won't be able to sign in until HR
            reactivates them via Edit Employee → Status.
          </MuiAlert>
        )}

        <div
          style={{
            border: '1px solid',
            borderColor: 'rgba(148,163,184,0.3)',
            borderRadius: 8,
            maxHeight: 380,
            overflow: 'auto',
          }}
        >
          {rows.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 13, opacity: 0.6 }}>
              No employees selected.
            </div>
          ) : (
            rows.map((r, idx) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderBottom: idx < rows.length - 1 ? '1px solid rgba(148,163,184,0.15)' : undefined,
                  backgroundColor: !r.is_active ? 'rgba(245,158,11,0.06)' : undefined,
                }}
              >
                <div style={{ minWidth: 160, fontSize: 13, fontWeight: 600 }}>
                  {r.full_name}
                </div>
                <div style={{ flex: 1 }}>
                  <MuiTextField
                    value={r.email}
                    onChange={(e: any) => onChangeEmail(r.id, e.target.value)}
                    size="small"
                    fullWidth
                    error={!validEmail(r.email)}
                    helperText={!validEmail(r.email) ? 'Invalid email format' : r.emailDirty ? 'Will be updated before sending' : undefined}
                    InputProps={{ style: { fontSize: 13 } }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 110 }}>
                  <Chip
                    label={r.registration_status.replace(/_/g, ' ')}
                    size="small"
                    sx={{ fontSize: 11, height: 20, textTransform: 'capitalize' }}
                  />
                  {!r.is_active && (
                    <Chip
                      label="Inactive"
                      size="small"
                      sx={{
                        fontSize: 11,
                        height: 20,
                        backgroundColor: 'rgba(245,158,11,0.18)',
                        color: '#D97706',
                        fontWeight: 600,
                      }}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveRow(r.id)}
                  disabled={submitting}
                  title="Remove from this batch"
                  style={{
                    width: 28,
                    height: 28,
                    border: 'none',
                    background: 'transparent',
                    color: '#94A3B8',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {editedCount > 0 && (
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            {editedCount} email{editedCount === 1 ? '' : 's'} edited &mdash; the
            change will be saved to auth + profiles before the send fires.
          </div>
        )}

        {meta.commentLabel && (
          <MuiTextField
            label={meta.commentLabel}
            value={comment}
            onChange={(e: any) => onChangeComment(e.target.value)}
            fullWidth size="small" multiline rows={2}
            placeholder={meta.commentPlaceholder}
            sx={{ mt: 1 }}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
        <MuiButton onClick={onClose} disabled={submitting} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </MuiButton>
        <div style={{ flex: 1 }} />
        <MuiButton
          variant="contained"
          color="success"
          onClick={onConfirm}
          disabled={submitting || rows.length === 0 || !allValid}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
        >
          {submitting ? 'Sending…' : `${meta.cta} (${rows.length})`}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

// --------------- Bulk emp_code remap dialog ---------------

/**
 * One-off admin tool. Two-column xlsx: Old Emp Code → New Emp Code.
 * Parsed client-side; every row is validated against the live
 * v_emp_codes (does old exist? is new free? intra-batch dupes?)
 * before HR can click Apply. Per-row results displayed after apply
 * so partial successes are visible.
 */
interface RemapRow {
  old_code: string;
  new_code: string;
  status: 'ok' | 'old_missing' | 'new_taken' | 'duplicate' | 'identical' | 'blank' | 'applied' | 'failed';
  message?: string;
  employee_name?: string;
  result_error?: string;
}

function EmpCodeRemapDialog({
  open,
  onClose,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  onApplied: (summary: { succeeded: number; failed: number }) => void;
}) {
  const [rows, setRows] = useState<RemapRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string>('');
  const [appliedResults, setAppliedResults] = useState<RemapRow[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const reset = () => {
    setRows([]);
    setFileName('');
    setError('');
    setAppliedResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFilePicked = async (file: File) => {
    setParsing(true);
    setError('');
    setAppliedResults(null);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) throw new Error('Workbook has no sheets');
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, defval: '' });
      if (raw.length === 0) throw new Error('Sheet is empty');

      // Accept any header containing "old" / "new" + "code". Tolerant of
      // case + punctuation so HR doesn't have to match exactly.
      const headers = Object.keys(raw[0]);
      const oldHeader = headers.find((h) => /old/i.test(h) && /code/i.test(h));
      const newHeader = headers.find((h) => /new/i.test(h) && /code/i.test(h));
      if (!oldHeader || !newHeader) {
        throw new Error('Need two columns whose headers contain "Old" + "Code" and "New" + "Code".');
      }

      // Load current emp_codes for validation.
      const { data: codes, error: codesErr } = await supabase
        .from('v_emp_codes')
        .select('employee_id, emp_code');
      if (codesErr) throw new Error(codesErr.message);
      const idByCode = new Map<string, string>();
      for (const r of codes ?? []) idByCode.set(String((r as any).emp_code), (r as any).employee_id);

      const { data: profiles } = await supabase.from('profiles').select('id, full_name');
      const nameById = new Map<string, string>();
      for (const p of profiles ?? []) nameById.set((p as any).id, (p as any).full_name);

      // First pass — tally each new_code so we can flag duplicates.
      const newCodeCounts = new Map<string, number>();
      for (const r of raw) {
        const nc = String(r[newHeader] ?? '').trim();
        if (nc) newCodeCounts.set(nc, (newCodeCounts.get(nc) ?? 0) + 1);
      }

      const parsed: RemapRow[] = raw.map((r) => {
        const oc = String(r[oldHeader] ?? '').trim();
        const nc = String(r[newHeader] ?? '').trim();
        if (!oc || !nc) return { old_code: oc, new_code: nc, status: 'blank' as const, message: 'Both codes are required' };
        if (oc === nc) return { old_code: oc, new_code: nc, status: 'identical' as const, message: 'Old and new are identical' };
        const empId = idByCode.get(oc);
        if (!empId) return { old_code: oc, new_code: nc, status: 'old_missing' as const, message: `No employee with emp_code "${oc}"` };
        const collides = idByCode.get(nc);
        if (collides && collides !== empId) return { old_code: oc, new_code: nc, status: 'new_taken' as const, message: `"${nc}" is used by another employee`, employee_name: nameById.get(empId) };
        if ((newCodeCounts.get(nc) ?? 0) > 1) return { old_code: oc, new_code: nc, status: 'duplicate' as const, message: `"${nc}" appears more than once in this batch`, employee_name: nameById.get(empId) };
        return { old_code: oc, new_code: nc, status: 'ok' as const, employee_name: nameById.get(empId) };
      });

      setRows(parsed);
      setFileName(file.name);
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const allValid = rows.length > 0 && rows.every((r) => r.status === 'ok');
  const validCount = rows.filter((r) => r.status === 'ok').length;

  const handleApply = async () => {
    if (!allValid || applying) return;
    setApplying(true);
    setError('');
    try {
      const results = await userService.remapEmpCodes(
        rows.map((r) => ({ old_code: r.old_code, new_code: r.new_code })),
      );
      const merged: RemapRow[] = rows.map((r, i) => {
        const res = results[i];
        return res?.success
          ? { ...r, status: 'applied', employee_name: res.full_name ?? r.employee_name }
          : { ...r, status: 'failed', result_error: res?.error };
      });
      setAppliedResults(merged);
      onApplied({
        succeeded: results.filter((x) => x.success).length,
        failed: results.filter((x) => !x.success).length,
      });
    } catch (err: any) {
      setError(err.message || 'Apply failed');
    } finally {
      setApplying(false);
    }
  };

  const displayRows = appliedResults ?? rows;

  return (
    <Dialog
      open={open}
      onClose={applying ? undefined : () => { reset(); onClose(); }}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ pb: 1, pt: 3, px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Remap Emp Codes</div>
        <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>
          Upload a two-column Excel: <b>Old Emp Code</b> · <b>New Emp Code</b>. Every row is validated before you can Apply.
        </div>
      </DialogTitle>
      <DialogContent sx={{ pt: '20px !important', pb: 1, px: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {error && <MuiAlert severity="error">{error}</MuiAlert>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFilePicked(f);
            }}
          />
          <MuiButton
            size="small"
            variant="outlined"
            onClick={() => { if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); } }}
            disabled={parsing || applying}
            sx={{ textTransform: 'none' }}
          >
            {fileName ? 'Replace file…' : 'Pick Excel file…'}
          </MuiButton>
          <div style={{ fontSize: 12, opacity: 0.7, flex: 1 }}>
            {parsing ? 'Parsing…' : fileName ? fileName : 'No file selected yet.'}
          </div>
          {rows.length > 0 && !appliedResults && (
            <MuiButton size="small" color="inherit" onClick={reset} sx={{ textTransform: 'none' }}>
              Clear
            </MuiButton>
          )}
        </div>

        {displayRows.length > 0 && (
          <div style={{ border: '1px solid', borderColor: 'rgba(148,163,184,0.3)', borderRadius: 8, maxHeight: 320, overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1fr', gap: 0, fontSize: 12, fontWeight: 700, opacity: 0.7, padding: '8px 12px', borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
              <div>Old → New</div>
              <div>Employee</div>
              <div>Status</div>
              <div>Note</div>
            </div>
            {displayRows.map((r, idx) => {
              const isOk = r.status === 'ok' || r.status === 'applied';
              const isFail = r.status !== 'ok' && r.status !== 'applied';
              return (
                <div key={idx} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1.5fr 1fr',
                  gap: 0,
                  fontSize: 13,
                  padding: '8px 12px',
                  borderBottom: idx < displayRows.length - 1 ? '1px solid rgba(148,163,184,0.15)' : undefined,
                  backgroundColor: isFail ? 'rgba(239,68,68,0.06)' : undefined,
                }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{r.old_code || '—'}</span>
                    <span style={{ opacity: 0.5, margin: '0 6px' }}>→</span>
                    <span style={{ fontWeight: 600 }}>{r.new_code || '—'}</span>
                  </div>
                  <div style={{ opacity: 0.85 }}>{r.employee_name || '—'}</div>
                  <div style={{ color: isOk ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                    {r.status === 'ok' ? '✓ valid' :
                     r.status === 'applied' ? '✓ renamed' :
                     r.status === 'failed' ? '✗ failed' :
                     r.status === 'old_missing' ? '✗ old not found' :
                     r.status === 'new_taken' ? '✗ new already used' :
                     r.status === 'duplicate' ? '✗ duplicate in batch' :
                     r.status === 'identical' ? '✗ identical' :
                     '✗ blank'}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    {r.result_error || r.message || ''}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {appliedResults && (
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Run complete. Close this dialog to refresh the list.
          </div>
        )}

        {rows.length > 0 && !appliedResults && (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {validCount} of {rows.length} valid. Apply is disabled until every row is ✓.
          </div>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
        <MuiButton onClick={() => { reset(); onClose(); }} disabled={applying} sx={{ textTransform: 'none', fontWeight: 600 }}>
          {appliedResults ? 'Close' : 'Cancel'}
        </MuiButton>
        <div style={{ flex: 1 }} />
        {!appliedResults && (
          <MuiButton
            variant="contained"
            color="success"
            onClick={handleApply}
            disabled={!allValid || applying}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
          >
            {applying ? 'Renaming…' : `Apply ${validCount} rename${validCount === 1 ? '' : 's'}`}
          </MuiButton>
        )}
      </DialogActions>
    </Dialog>
  );
}

// --------------- Main Screen ---------------

export default function EmployeesScreen() {
  return (
    <AccessGate resourceKey="page:admin/employees">
      <EmployeesScreenInner />
    </AccessGate>
  );
}

function EmployeesScreenInner() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [search, setSearch] = useViewState('admin/employees.search', '');
  // Default ON so HR sees the full roster (incl. former employees) without
  // having to remember a hidden filter. Toggle off when they want to focus
  // on the live workforce only.
  const [includeInactive, setIncludeInactive] = useViewState('admin/employees.includeInactive', true);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<EditDialogState>(INITIAL_DIALOG);
  const [successMsg, setSuccessMsg] = useState('');
  const [invite, setInvite] = useState<InviteDialogState>(INITIAL_INVITE);

  // Drafts: form fields persist across navigation but clear on Cancel/Submit
  const [inviteDraft, setInviteDraft] = useViewState<Partial<InviteDialogState>>(
    'admin/employees.inviteDraft',
    {}
  );
  const [editDraft, setEditDraft] = useViewState<{ employeeId: string; fields: Partial<EditDialogState> } | null>(
    'admin/employees.editDraft',
    null
  );
  const { user } = useAuth();

  const loadEmployees = useCallback(() => {
    setLoading(true);
    userService
      .getEmployees({
        search: search || undefined,
        // Omit is_active when including inactive → returns the full set.
        is_active: includeInactive ? undefined : true,
      })
      .then((rows) =>
        // Preserve the previous reference when the data is unchanged so
        // a tab-refocus refetch doesn't reset the DataGrid page.
        setEmployees((prev) =>
          employeesSignature(prev) === employeesSignature(rows) ? prev : rows,
        ),
      )
      .finally(() => setLoading(false));
  }, [search, includeInactive]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);
  const { invalidate } = useAutoRefresh(() => { loadEmployees(); }, [loadEmployees]);

  // Lookup tables — canonical departments / designations seeded by
  // migration 023. Loaded once on mount and after any successful
  // save (handleSubmitInvite / handleSubmitEdit reload via invalidate).
  const [lookupDepartments, setLookupDepartments] = useState<string[]>([]);
  const [lookupDesignations, setLookupDesignations] = useState<string[]>([]);
  const loadLookups = useCallback(() => {
    lookupService.getDepartments().then((r) => setLookupDepartments(r.map((x) => x.name))).catch(() => {});
    lookupService.getDesignations().then((r) => setLookupDesignations(r.map((x) => x.name))).catch(() => {});
  }, []);
  useEffect(() => { loadLookups(); }, [loadLookups]);

  // --- Dialog handlers ---
  const handleOpenEdit = async (emp: Profile) => {
    // Open immediately with the profile fields we already have, then fetch
    // emp_code from employee_documents and merge it in. UX: user sees the
    // dialog instantly; the employee_code field populates within ~100ms.
    const draftFields = editDraft?.employeeId === emp.id ? editDraft.fields : {};
    setDialog({
      ...INITIAL_DIALOG,
      open: true,
      employee: emp,
      full_name: emp.full_name,
      email: emp.email,
      emp_code: '',
      phone: emp.phone || '',
      nationality: emp.nationality || '',
      job_title: emp.job_title || '',
      start_date: emp.start_date || '',
      role: emp.role,
      department: emp.department || '',
      supervisor_id: emp.supervisor_id,
      manager_id: emp.manager_id,
      workday_hours: String(emp.workday_hours),
      annual_leave_entitlement_days: emp.annual_leave_entitlement_days != null ? String(emp.annual_leave_entitlement_days) : '21',
      warn_on_uncompleted_form: emp.warn_on_uncompleted_form !== false,
      is_active: emp.is_active,
      ...draftFields,
    });

    try {
      const doc = await documentService.getDocumentByEmployee(emp.id);
      if (doc?.emp_code) {
        setDialog((s) =>
          s.employee?.id === emp.id && !draftFields.emp_code ? { ...s, emp_code: doc.emp_code } : s,
        );
      }
      // Surface the on-file ID document in the dialog. Fetch a short
      // signed URL (10 min) so the preview can render. Non-fatal if
      // the document doesn't exist yet — preview just hides.
      if (doc?.id_document_url) {
        setDialog((s) =>
          s.employee?.id === emp.id ? { ...s, id_document_url: doc.id_document_url } : s,
        );
        supabase.storage
          .from('employee-id-documents')
          .createSignedUrl(doc.id_document_url, 60 * 10)
          .then(({ data }) => {
            if (!data?.signedUrl) return;
            setDialog((s) =>
              s.employee?.id === emp.id ? { ...s, id_document_signed_url: data.signedUrl } : s,
            );
          })
          .catch(() => { /* preview just won't render */ });
      }
    } catch {
      // Non-fatal — emp_code stays empty and HR will see the required-field warning.
    }

    // Load current compensation row (latest effective). Falls back to
    // zeros if HR hasn't entered anything for this employee yet.
    try {
      const current = await compensationService.getCurrent(emp.id);
      setDialog((s) => {
        if (s.employee?.id !== emp.id) return s;
        const b = current?.basic_salary != null ? String(current.basic_salary) : '';
        const h = current?.hra != null ? String(current.hra) : '';
        const t = current?.transportation != null ? String(current.transportation) : '';
        const o = current?.other_allowances != null ? String(current.other_allowances) : '';
        return {
          ...s,
          comp_basic_salary: draftFields.comp_basic_salary ?? b,
          comp_hra: draftFields.comp_hra ?? h,
          comp_transportation: draftFields.comp_transportation ?? t,
          comp_other_allowances: draftFields.comp_other_allowances ?? o,
          comp_currency: current?.currency || 'SAR',
          comp_effective_from: draftFields.comp_effective_from ?? new Date().toISOString().slice(0, 10),
          comp_notes: draftFields.comp_notes ?? '',
          // Snapshot of the loaded values — used at submit time to
          // tell whether HR actually changed anything.
          comp_loaded_basic_salary: b,
          comp_loaded_hra: h,
          comp_loaded_transportation: t,
          comp_loaded_other_allowances: o,
        };
      });
    } catch {
      /* non-fatal — section just shows 0s */
    }

    // Load capability flags asynchronously. If the row doesn't exist yet,
    // every flag stays false (the INITIAL_DIALOG default).
    try {
      const caps = await profileCapabilitiesService.getForProfile(emp.id);
      if (caps) {
        setDialog((s) => {
          if (s.employee?.id !== emp.id) return s;
          // Don't clobber unsaved draft toggles.
          return {
            ...s,
            is_general_manager: draftFields.is_general_manager ?? caps.is_general_manager,
            is_operations_manager: draftFields.is_operations_manager ?? caps.is_operations_manager,
            can_approve_project_hours_changes:
              draftFields.can_approve_project_hours_changes ?? caps.can_approve_project_hours_changes,
            can_close_month: draftFields.can_close_month ?? caps.can_close_month,
          };
        });
      }
    } catch {
      // Non-fatal — flags stay at their INITIAL_DIALOG defaults (all false).
    }
  };

  // Backdrop / Esc / nav-away: close but keep draft so the user can come back
  const handleCloseDialog = () => {
    if (!dialog.submitting) setDialog(INITIAL_DIALOG);
  };

  // Cancel button: explicit discard
  const handleCancelDialog = () => {
    if (!dialog.submitting) {
      setEditDraft(null);
      setDialog(INITIAL_DIALOG);
    }
  };

  const handleChange = (field: string, value: any) => {
    // Synthetic action: the document preview dispatches __save_rotation__
    // through the same onChange path so the parent owns the
    // Storage write logic. Keeps the dialog component pure.
    if (field === '__save_rotation__') {
      void handleSaveEditRotation();
      return;
    }
    setDialog((s) => ({ ...s, [field]: value, error: '' }));
  };

  /**
   * Persist the in-dialog rotation back to Storage, then refresh the
   * signed URL so the preview shows the saved bytes. Same flow as the
   * Review Registration dialog's rotate-and-save.
   */
  const handleSaveEditRotation = async () => {
    const path = dialog.id_document_url;
    const url = dialog.id_document_signed_url;
    if (!path || !url || dialog.doc_rotation === 0) return;
    setDialog((s) => ({ ...s, doc_rotation_saving: true }));
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Could not fetch current file');
      const blob = await resp.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error('Rotation is only supported for image files');
      }
      const rotated = await rotateImageBlob(blob, dialog.doc_rotation);
      const { error: upErr } = await supabase.storage
        .from('employee-id-documents')
        .upload(path, rotated, { upsert: true, contentType: blob.type });
      if (upErr) throw new Error(upErr.message);
      const { data: signed } = await supabase.storage
        .from('employee-id-documents')
        .createSignedUrl(path, 60 * 10);
      setDialog((s) => ({
        ...s,
        id_document_signed_url: signed?.signedUrl || s.id_document_signed_url,
        doc_rotation: 0,
        doc_rotation_saving: false,
      }));
      setSuccessMsg('Document rotation saved.');
    } catch (err: any) {
      setDialog((s) => ({ ...s, doc_rotation_saving: false, error: err.message || 'Rotation save failed' }));
    }
  };

  // Persist edit-form fields to draft on every change, keyed by employee id
  useEffect(() => {
    if (!dialog.open || !dialog.employee || dialog.submitting) return;
    const fields: Partial<EditDialogState> = {};
    EDIT_DRAFT_KEYS.forEach((k) => {
      (fields as any)[k] = dialog[k];
    });
    setEditDraft({ employeeId: dialog.employee.id, fields });
  }, [dialog]);

  const handleSubmitEdit = async () => {
    if (!dialog.employee) return;
    setDialog((s) => ({ ...s, submitting: true, error: '' }));

    const employeeId = dialog.employee.id;
    const oldEmail = dialog.employee.email;
    const newEmail = dialog.email.trim().toLowerCase();
    const emailChanged = newEmail !== oldEmail.toLowerCase();

    // 0. Canonicalise department + job_title and make sure the lookup
    //    tables contain those values. The FK constraints from migration
    //    023 will reject the profile update otherwise.
    const canonicalDept = dialog.department.trim()
      ? canonicaliseDepartment(dialog.department)
      : '';
    const canonicalJobTitle = dialog.job_title.trim()
      ? canonicaliseDesignation(dialog.job_title)
      : '';

    try {
      if (canonicalDept) {
        await lookupService.addDepartment(canonicalDept, dialog.employee.id);
      }
      if (canonicalJobTitle) {
        await lookupService.addDesignation(canonicalJobTitle, dialog.employee.id);
      }

      // 1. If the email changed, route through the admin Edge Function so
      //    auth.users.email + profiles.email stay in sync (trigger 015 handles
      //    the profiles side after auth confirms).
      if (emailChanged) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/update-employee-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ profile_id: employeeId, new_email: newEmail }),
          }
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to change email');
      }

      // 2. Update the profile row (every other field). Department / job_title
      //    are written in their canonical form; the lookup rows were just
      //    upserted above so the FK constraints are satisfied.
      await userService.updateProfile(employeeId, {
        full_name: dialog.full_name.trim(),
        phone: dialog.phone.trim() || null,
        nationality: dialog.nationality.trim() || null,
        job_title: canonicalJobTitle || null,
        start_date: dialog.start_date || null,
        department: canonicalDept || null,
        role: dialog.role,
        supervisor_id: dialog.supervisor_id,
        manager_id: dialog.manager_id,
        workday_hours: parseFloat(dialog.workday_hours) || 8,
        annual_leave_entitlement_days: parseFloat(dialog.annual_leave_entitlement_days) || 21,
        warn_on_uncompleted_form: dialog.warn_on_uncompleted_form,
        is_active: dialog.is_active,
      } as any);

      // Compensation: insert a new effective-dated row only if any of
      // the four amounts changed vs what we loaded. The PK is
      // (employee_id, effective_from) so HR picking today's date for
      // two different raises in one day would conflict — surfaced as
      // an error toast.
      const compChanged =
        (dialog.comp_basic_salary || '') !== (dialog.comp_loaded_basic_salary || '') ||
        (dialog.comp_hra || '') !== (dialog.comp_loaded_hra || '') ||
        (dialog.comp_transportation || '') !== (dialog.comp_loaded_transportation || '') ||
        (dialog.comp_other_allowances || '') !== (dialog.comp_loaded_other_allowances || '');
      if (compChanged) {
        try {
          await compensationService.addNewRow({
            employee_id: employeeId,
            effective_from: dialog.comp_effective_from || new Date().toISOString().slice(0, 10),
            basic_salary: parseFloat(dialog.comp_basic_salary) || 0,
            hra: parseFloat(dialog.comp_hra) || 0,
            transportation: parseFloat(dialog.comp_transportation) || 0,
            other_allowances: parseFloat(dialog.comp_other_allowances) || 0,
            notes: dialog.comp_notes.trim() || undefined,
            created_by: user?.id,
          });
        } catch (err: any) {
          // Don't roll back the rest of the save — surface the comp
          // failure separately. Most common cause: PK violation when
          // effective_from collides with an existing row.
          throw new Error('Compensation save failed: ' + (err.message || 'unknown'));
        }
      }

      // 3. emp_code lives in employee_documents — upsert separately.
      const newEmpCode = dialog.emp_code.trim();
      if (newEmpCode) {
        await supabase
          .from('employee_documents')
          .upsert(
            { employee_id: employeeId, emp_code: newEmpCode, updated_at: new Date().toISOString() },
            { onConflict: 'employee_id' }
          );
      }

      // 3b. Capability flags live in profile_capabilities — upsert.
      await profileCapabilitiesService.setForProfile(employeeId, {
        is_general_manager: dialog.is_general_manager,
        is_operations_manager: dialog.is_operations_manager,
        can_approve_project_hours_changes: dialog.can_approve_project_hours_changes,
        can_close_month: dialog.can_close_month,
      });

      // 4. Email action dispatch. Mutually exclusive (radio).
      //
      //    'reset'     → just OTP, no status change
      //    'info_form' → demote to info_rejected + Resend email, no OTP
      //    'invite'    → reset FIRST, then info_form (sequenced per the
      //                  agreed flow)
      //    'warning'   → manual warning email + log row, no status change
      //    'none'      → save only
      //
      //    Skips email side-effects entirely if the employee is inactive
      //    (they can't sign in anyway, so emails would dead-end).
      const summaryParts: string[] = [];
      const action = dialog.is_active ? dialog.email_action : 'none';
      const targetEmail = newEmail || oldEmail;
      const comment = dialog.email_action_comment.trim() || undefined;

      const fireReset = async () => {
        await authService.resetPasswordForEmail(targetEmail);
        summaryParts.push('password reset sent');
      };
      const fireInfoForm = async () => {
        const r = await registrationService.requestInfoFormUpdate([employeeId], comment);
        const ok = r[0]?.success;
        summaryParts.push(ok ? 'info-form request sent' : `info-form request failed: ${r[0]?.error || 'unknown'}`);
      };
      const fireWarning = async () => {
        const r = await registrationService.sendFormWarning([employeeId], comment);
        const ok = r[0]?.success;
        summaryParts.push(ok ? 'warning sent' : `warning failed: ${r[0]?.error || 'unknown'}`);
      };

      try {
        if (action === 'reset') {
          await fireReset();
        } else if (action === 'invite') {
          // Per HR spec: reset email first, info-form request after it
          // succeeds. If reset fails, don't fire info_form.
          await fireReset();
          await fireInfoForm();
        } else if (action === 'info_form') {
          await fireInfoForm();
        } else if (action === 'warning') {
          await fireWarning();
        }
      } catch (err: any) {
        summaryParts.push(`email action failed: ${err.message || 'unknown'}`);
      }
      const inviteSummary = summaryParts.length ? ' (' + summaryParts.join('; ') + ')' : '';

      setEditDraft(null);
      setDialog(INITIAL_DIALOG);
      setSuccessMsg(`${dialog.full_name} updated successfully${inviteSummary}`);
      invalidate();
      loadLookups();
    } catch (err: any) {
      setDialog((s) => ({
        ...s,
        submitting: false,
        error: err.message || 'Failed to save changes',
      }));
    }
  };

  // --- Invite handlers ---
  const handleOpenInvite = () =>
    setInvite({ ...INITIAL_INVITE, ...inviteDraft, open: true });
  // Backdrop / Esc / nav-away: close but keep draft
  const handleCloseInvite = () => { if (!invite.submitting) setInvite(INITIAL_INVITE); };
  // Cancel button: explicit discard
  const handleCancelInvite = () => {
    if (!invite.submitting) {
      setInviteDraft({});
      setInvite(INITIAL_INVITE);
    }
  };
  const handleInviteChange = (field: string, value: any) => {
    setInvite((s) => ({ ...s, [field]: value, error: '' }));
  };

  // Persist invite-form fields to draft on every change
  useEffect(() => {
    if (!invite.open || invite.submitting) return;
    const fields: Partial<InviteDialogState> = {};
    INVITE_DRAFT_KEYS.forEach((k) => {
      (fields as any)[k] = invite[k];
    });
    setInviteDraft(fields);
  }, [invite]);
  const handleSubmitInvite = async () => {
    setInvite((s) => ({ ...s, submitting: true, error: '' }));

    // Canonicalise + populate lookup rows BEFORE invoking the
    // create-employee edge function. The function inserts into profiles
    // which has FK references to lookup_departments / lookup_designations
    // (migration 023), so the lookup rows must exist first.
    const canonicalDept = invite.department.trim() ? canonicaliseDepartment(invite.department) : '';
    const canonicalJobTitle = invite.job_title.trim() ? canonicaliseDesignation(invite.job_title) : '';

    try {
      if (canonicalDept) {
        await lookupService.addDepartment(canonicalDept, user?.id ?? null);
      }
      if (canonicalJobTitle) {
        await lookupService.addDesignation(canonicalJobTitle, user?.id ?? null);
      }

      const newProfile = await registrationService.createEmployee(
        {
          email: invite.email.trim(),
          full_name: invite.full_name.trim(),
          // Optional: blank emp_code → server auto-generates from sequence
          emp_code: invite.emp_code.trim() || undefined,
          // Optional: phone → employee fills it in during their registration form
          phone: invite.phone.trim() || undefined,
          nationality: invite.nationality.trim(),
          role: invite.role,
          department: canonicalDept,
          supervisor_id: invite.supervisor_id!,
          manager_id: invite.manager_id!,
          job_title: canonicalJobTitle,
          start_date: invite.start_date,
          workday_hours: parseFloat(invite.workday_hours) || 8,
          annual_leave_entitlement_days: parseFloat(invite.annual_leave_entitlement_days) || 21,
        },
        user!.id
      );

      // create-employee edge function may not yet write the entitlement
      // (older deployments). Mirror it locally so the field is persisted
      // regardless. Idempotent — sets the value HR picked in the dialog.
      try {
        await userService.updateProfile(newProfile.id, {
          annual_leave_entitlement_days: parseFloat(invite.annual_leave_entitlement_days) || 21,
        } as any);
      } catch { /* non-fatal; the edge function default still applies */ }

      let message = `${invite.full_name} created successfully (status: Not Invited)`;

      if (invite.send_invite_now) {
        const results = await registrationService.sendInvites([newProfile.id]);
        const result = results[0];
        if (result?.success) {
          message = `${invite.full_name} created and invite emailed to ${invite.email}`;
        } else {
          message = `Created ${invite.full_name}, but invite email failed: ${result?.error || 'unknown error'}`;
        }
      }

      setInviteDraft({});
      setInvite(INITIAL_INVITE);
      setSuccessMsg(message);
      invalidate();
      loadLookups();
    } catch (err: any) {
      setInvite((s) => ({ ...s, submitting: false, error: err.message || 'Failed to create employee' }));
    }
  };

  // --- Bulk send invite handler ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkSending, setBulkSending] = useState(false);

  const handleSendInvites = async (ids: string[]) => {
    if (ids.length === 0) return;
    // HR can send / resend an invite to any active employee at any time.
    // Inactive employees are blocked — reactivate first.
    const eligibleIds = ids.filter((id) => {
      const emp = employees.find((e) => e.id === id);
      return emp && emp.is_active;
    });
    if (eligibleIds.length === 0) {
      setSuccessMsg('No invite-eligible rows selected (employees must be active).');
      return;
    }

    setBulkSending(true);
    try {
      const results = await registrationService.sendInvites(eligibleIds);
      const ok = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success);
      let msg = `Sent ${ok} of ${results.length} invite(s).`;
      if (failed.length > 0) {
        msg += ` Failures: ${failed.map((f) => f.error).slice(0, 2).join('; ')}${failed.length > 2 ? '…' : ''}`;
      }
      setSuccessMsg(msg);
      setSelectedIds([]);
      invalidate();
      loadLookups();
    } catch (err: any) {
      setSuccessMsg(`Bulk send failed: ${err.message || 'unknown error'}`);
    } finally {
      setBulkSending(false);
    }
  };

  // --- Bulk resend: open a dialog where HR can review the recipients,
  //     edit the destination email per-row (covers the "their old email
  //     is unreachable" case), and explicitly confirm inactive rows
  //     before sending. The legacy "demote active → pending_info"
  //     semantic still applies for rows currently at status='active';
  //     all other statuses get a pure resend.
  // Bulk emp_code remap (one-off admin tool — separate from the
  // resend-email bulk flow because the data shape is different:
  // 2 cols old→new, no email needed).
  const [remapDialogOpen, setRemapDialogOpen] = useState(false);

  // The bulk dialog used to do one thing ("resend sign-in email").
  // It now supports four mutually-exclusive actions, picked by which
  // button HR clicks in the header. The dialog UX stays the same
  // (editable emails + remove × per row + inactive warnings); only
  // the title, CTA wording, and dispatch differ.
  type BulkAction = 'reset' | 'invite' | 'info_form' | 'warning';
  const [bulkVerifying, setBulkVerifying] = useState(false);
  const [resendDialog, setResendDialog] = useState<{
    open: boolean;
    action: BulkAction;
    rows: ResendRow[];
    comment: string;
  }>({ open: false, action: 'reset', rows: [], comment: '' });

  const openBulkDialog = (action: BulkAction, ids: string[]) => {
    if (ids.length === 0) return;
    const rows: ResendRow[] = ids
      .map((id) => employees.find((e) => e.id === id))
      .filter((e): e is Profile => !!e)
      .map((e) => ({
        id: e.id,
        full_name: e.full_name,
        original_email: e.email || '',
        email: e.email || '',
        is_active: !!e.is_active,
        registration_status: e.registration_status,
        emailDirty: false,
      }));
    setResendDialog({ open: true, action, rows, comment: '' });
  };

  const runBulk = async (action: BulkAction, rows: ResendRow[], comment: string) => {
    if (rows.length === 0) return;
    setBulkVerifying(true);
    try {
      // 1. Persist per-row email changes first (same as before).
      const emailFailures: string[] = [];
      for (const r of rows) {
        if (r.emailDirty && r.email.trim() && r.email.trim().toLowerCase() !== r.original_email.toLowerCase()) {
          try {
            await registrationService.updateRegistrationEmail(r.id, r.email.trim());
          } catch (err: any) {
            emailFailures.push(`${r.full_name}: ${err.message || 'email update failed'}`);
          }
        }
      }

      // 2. Dispatch the chosen action. All call paths return the same
      //    RequestProfileVerificationResult[] shape so the summary
      //    rendering below is identical.
      const ids = rows.map((r) => r.id);
      const trimmed = comment.trim() || undefined;
      let results: { profile_id: string; success: boolean; error?: string }[];

      if (action === 'reset') {
        // Password-reset only. authService.resetPasswordForEmail is
        // per-email; iterate to keep the return shape consistent.
        results = [];
        for (const r of rows) {
          try {
            await authService.resetPasswordForEmail(r.email.trim());
            results.push({ profile_id: r.id, success: true });
          } catch (err: any) {
            results.push({ profile_id: r.id, success: false, error: err.message || 'reset failed' });
          }
        }
      } else if (action === 'invite') {
        // Reset first, then info-form request per HR's agreed flow.
        results = [];
        for (const r of rows) {
          try {
            await authService.resetPasswordForEmail(r.email.trim());
            const ir = await registrationService.requestInfoFormUpdate([r.id], trimmed);
            const ok = ir[0]?.success ?? false;
            results.push({
              profile_id: r.id,
              success: ok,
              error: ok ? undefined : (ir[0]?.error || 'info-form step failed'),
            });
          } catch (err: any) {
            results.push({ profile_id: r.id, success: false, error: err.message || 'invite failed' });
          }
        }
      } else if (action === 'info_form') {
        results = await registrationService.requestInfoFormUpdate(ids, trimmed);
      } else {
        // warning
        results = await registrationService.sendFormWarning(ids, trimmed);
      }

      const okCount = results.filter((r) => r.success).length;
      const sendFailures = results.filter((r) => !r.success);

      const labels: Record<BulkAction, string> = {
        reset:     'password reset',
        invite:    'invite (reset + info-form)',
        info_form: 'info-form request',
        warning:   'manual warning',
      };
      let msg = `${labels[action]} sent to ${okCount} of ${results.length} employee(s).`;
      if (emailFailures.length > 0) {
        msg += ` Email-update issues: ${emailFailures.slice(0, 2).join('; ')}${emailFailures.length > 2 ? '…' : ''}`;
      }
      if (sendFailures.length > 0) {
        msg += ` Send failures: ${sendFailures.map((f) => f.error).slice(0, 2).join('; ')}${sendFailures.length > 2 ? '…' : ''}`;
      }
      setSuccessMsg(msg);
      setSelectedIds([]);
      setResendDialog({ open: false, action: 'reset', rows: [], comment: '' });
      invalidate();
      loadLookups();
    } catch (err: any) {
      setSuccessMsg(`Bulk action failed: ${err.message || 'unknown error'}`);
    } finally {
      setBulkVerifying(false);
    }
  };

  // --------------- Web render ---------------
  if (isWeb) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
        {/* Page header with back button */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
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
                router.replace('/(app)/(tabs)/profile' as any);
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#E2E8F0' : '#0F172A'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A' }}>
              Employee Directory
            </div>
            <div style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
              Click a row to edit. Tick rows to send invites in bulk.
              {(() => {
                const inactiveCount = employees.filter((e) => !e.is_active).length;
                if (!includeInactive) return null;
                return inactiveCount > 0 ? (
                  <span style={{ marginLeft: 8, opacity: 0.7 }}>
                    {employees.length} shown · {inactiveCount} inactive
                  </span>
                ) : null;
              })()}
            </div>
          </div>

          <FormControlLabel
            sx={{ flexShrink: 0, mr: 1, color: isDark ? '#E2E8F0' : '#0F172A' }}
            control={
              <Switch
                checked={includeInactive}
                onChange={(_e: any, v: boolean) => setIncludeInactive(v)}
                size="small"
              />
            }
            label={
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                Include inactive
              </span>
            }
          />

          {selectedIds.length > 0 && (
            <>
              <button
                onClick={() => handleSendInvites(selectedIds)}
                disabled={bulkSending || bulkVerifying}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  backgroundColor: (bulkSending || bulkVerifying) ? '#94A3B8' : '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: (bulkSending || bulkVerifying) ? 'wait' : 'pointer',
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                {bulkSending ? 'Sending...' : `Send Invite(s) (${selectedIds.length})`}
              </button>

              <button
                onClick={() => openBulkDialog('reset', selectedIds)}
                disabled={bulkSending || bulkVerifying}
                title="Send only the password-reset OTP. No status change. Use when employees have forgotten their password."
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  backgroundColor: (bulkSending || bulkVerifying) ? '#94A3B8' : '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: (bulkSending || bulkVerifying) ? 'wait' : 'pointer',
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {`Send Reset Password (${selectedIds.length})`}
              </button>

              <button
                onClick={() => openBulkDialog('info_form', selectedIds)}
                disabled={bulkSending || bulkVerifying}
                title="Demote to Info Rejected and email the employee asking them to update their profile info. No password reset. They sign in normally and see a task on their dashboard."
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  backgroundColor: (bulkSending || bulkVerifying) ? '#94A3B8' : '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: (bulkSending || bulkVerifying) ? 'wait' : 'pointer',
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="9" y1="13" x2="15" y2="13" />
                  <line x1="9" y1="17" x2="15" y2="17" />
                </svg>
                {`Send Info Form Request (${selectedIds.length})`}
              </button>

              <button
                onClick={() => openBulkDialog('warning', selectedIds)}
                disabled={bulkSending || bulkVerifying}
                title="Send a manual warning email about an uncompleted form. Logs to form_warnings_log. No status change."
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  backgroundColor: (bulkSending || bulkVerifying) ? '#94A3B8' : '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: (bulkSending || bulkVerifying) ? 'wait' : 'pointer',
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                {`Send Warning (${selectedIds.length})`}
              </button>
            </>
          )}

          {/* Bulk remap tool — outlined style so it doesn't compete
              with the primary action. One-off use, but kept in the
              header so HR doesn't have to dig for it. */}
          <button
            onClick={() => setRemapDialogOpen(true)}
            title="Bulk-rename emp_codes via Excel upload. Useful for legacy code migration; rarely used otherwise."
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              backgroundColor: 'transparent',
              color: isDark ? '#E2E8F0' : '#0F172A',
              border: `1px solid ${isDark ? '#475569' : '#CBD5E1'}`,
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            Remap Emp Codes
          </button>

          <button
            onClick={handleOpenInvite}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            New Employee
          </button>
        </div>

        {/* DataGrid */}
        <View style={{ flex: 1, padding: 16 }}>
          {employees.length > 0 || loading ? (
            <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
              <MuiThemeProvider isDark={isDark}>
                <WebEmployeesTable
                  data={employees}
                  isDark={isDark}
                  onEdit={handleOpenEdit}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  onSendInvite={(id) => handleSendInvites([id])}
                />
                <EditEmployeeDialog
                  state={dialog}
                  onClose={handleCloseDialog}
                  onCancel={handleCancelDialog}
                  onChange={handleChange}
                  onSubmit={handleSubmitEdit}
                  employees={employees}
                  departments={lookupDepartments}
                  designations={lookupDesignations}
                />
                <InviteEmployeeDialog
                  state={invite}
                  onClose={handleCloseInvite}
                  onCancel={handleCancelInvite}
                  onChange={handleInviteChange}
                  onSubmit={handleSubmitInvite}
                  employees={employees}
                  departments={lookupDepartments}
                  designations={lookupDesignations}
                />
                <ResendEmailDialog
                  open={resendDialog.open}
                  action={resendDialog.action}
                  rows={resendDialog.rows}
                  comment={resendDialog.comment}
                  submitting={bulkVerifying}
                  onChangeEmail={(id, email) =>
                    setResendDialog((prev) => ({
                      ...prev,
                      rows: prev.rows.map((r) =>
                        r.id === id
                          ? { ...r, email, emailDirty: email !== r.original_email }
                          : r,
                      ),
                    }))
                  }
                  onChangeComment={(comment) =>
                    setResendDialog((prev) => ({ ...prev, comment }))
                  }
                  onRemoveRow={(id) =>
                    setResendDialog((prev) => ({
                      ...prev,
                      rows: prev.rows.filter((r) => r.id !== id),
                    }))
                  }
                  onClose={() => setResendDialog({ open: false, action: 'reset', rows: [], comment: '' })}
                  onConfirm={() => runBulk(resendDialog.action, resendDialog.rows, resendDialog.comment)}
                />
                <EmpCodeRemapDialog
                  open={remapDialogOpen}
                  onClose={() => setRemapDialogOpen(false)}
                  onApplied={(summary) => {
                    setSuccessMsg(`Emp-code remap: ${summary.succeeded} renamed, ${summary.failed} failed`);
                    invalidate();
                  }}
                />
                <Snackbar
                  open={!!successMsg}
                  autoHideDuration={4000}
                  onClose={() => setSuccessMsg('')}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                  <MuiAlert severity="success" onClose={() => setSuccessMsg('')} sx={{ fontWeight: 600 }}>
                    {successMsg}
                  </MuiAlert>
                </Snackbar>
              </MuiThemeProvider>
            </View>
          ) : (
            <EmptyState title="No employees found" description="No employees in the system. Click 'New Employee' to add one." />
          )}
        </View>
      </View>
    );
  }

  // --------------- Mobile render ---------------
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-[#0F172A]" edges={['top']}>
      <ScreenHeader title="Employee Directory" />

      {/* Search */}
      <View className="px-4 py-3">
        <View className="flex-row items-center bg-surface dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl px-4 py-2.5">
          <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, email, department, role..."
            className="flex-1 text-base text-text-primary dark:text-white"
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      <FlatList
        data={employees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0, flexGrow: 1 }}
        renderItem={({ item }) => (
          <Card className="mb-3">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-primary-light dark:bg-blue-900/40 items-center justify-center mr-3">
                <Text className="text-sm font-bold text-primary dark:text-blue-400">{getInitials(item.full_name)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-text-primary dark:text-white">{item.full_name}</Text>
                <Text className="text-xs text-text-muted dark:text-slate-400">{item.email}</Text>
                <Text className="text-xs text-text-muted dark:text-slate-400">{item.department || 'No department'}</Text>
              </View>
              <Badge variant="info">{getRoleLabel(item.role)}</Badge>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          !loading ? <EmptyState title="No employees found" /> : null
        }
      />
    </SafeAreaView>
  );
}
