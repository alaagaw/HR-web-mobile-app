import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useColorScheme } from 'nativewind';
import { Search } from 'lucide-react-native';
import { ScreenHeader } from '@/components/layout/screen-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { userService, registrationService } from '@/services';
import { useAuth } from '@/hooks/use-auth';
import { getRoleLabel, getInitials } from '@/lib/utils';
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
  phone: string;
  department: string;
  role: Role;
  workday_hours: string;
  is_active: boolean;
  submitting: boolean;
}

const INITIAL_DIALOG: EditDialogState = {
  open: false,
  employee: null,
  full_name: '',
  email: '',
  phone: '',
  department: '',
  role: Role.Employee,
  workday_hours: '8',
  is_active: true,
  submitting: false,
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
  role: Role;
  department: string;
  supervisor_id: string | null;
  manager_id: string | null;
  job_title: string;
  start_date: string;
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
  role: Role.Employee,
  department: '',
  supervisor_id: null,
  manager_id: null,
  job_title: '',
  start_date: '',
  send_invite_now: false,
  show_all_supervisors: false,
  show_all_managers: false,
  submitting: false,
  error: '',
};

// --------------- Web Components ---------------

const STATUS_LABEL: Record<string, string> = {
  not_invited: 'Not Invited',
  email_unverified: 'Unverified',
  pending_info: 'Pending Info',
  pending_approval: 'Pending Approval',
  active: 'Active',
  rejected: 'Rejected',
};

function getStatusDisplay(row: Profile): { label: string; bg: string; fg: string } {
  if (!row.is_active) return { label: 'Inactive', bg: 'rgba(148,163,184,0.18)', fg: '#64748B' };
  switch (row.registration_status) {
    case 'not_invited':       return { label: 'Not Invited',      bg: 'rgba(245,158,11,0.18)', fg: '#D97706' };
    case 'email_unverified':  return { label: 'Unverified',       bg: 'rgba(148,163,184,0.18)', fg: '#64748B' };
    case 'pending_info':      return { label: 'Pending Info',     bg: 'rgba(59,130,246,0.18)',  fg: '#2563EB' };
    case 'pending_approval':  return { label: 'Pending Approval', bg: 'rgba(59,130,246,0.18)',  fg: '#2563EB' };
    case 'rejected':          return { label: 'Rejected',         bg: 'rgba(239,68,68,0.18)',   fg: '#DC2626' };
    case 'active':
    default:                  return { label: 'Active',           bg: 'rgba(34,197,94,0.18)',   fg: '#16A34A' };
  }
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
  const [filters, setFilters] = useState({ name: '', email: '', department: '', role: '', phone: '', status: '' });
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; row: Profile } | null>(null);

  const filteredData = data.filter((row) => {
    const name = row.full_name.toLowerCase();
    const email = row.email.toLowerCase();
    const dept = (row.department || '').toLowerCase();
    const role = getRoleLabel(row.role).toLowerCase();
    const phone = (row.phone || '').toLowerCase();
    const status = getStatusDisplay(row).label.toLowerCase();
    if (filters.name && !name.includes(filters.name.toLowerCase())) return false;
    if (filters.email && !email.includes(filters.email.toLowerCase())) return false;
    if (filters.department && !dept.includes(filters.department.toLowerCase())) return false;
    if (filters.role && !role.includes(filters.role.toLowerCase())) return false;
    if (filters.phone && !phone.includes(filters.phone.toLowerCase())) return false;
    if (filters.status && !status.includes(filters.status.toLowerCase())) return false;
    return true;
  });

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
        rowSelectionModel={selectedIds}
        onRowSelectionModelChange={(model: any) => onSelectionChange(model as string[])}
        disableRowSelectionOnClick
        disableColumnFilter
        disableColumnMenu
        columnHeaderHeight={70}
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
        }}
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
        {menuStatus === 'not_invited' && (
          <MenuItem
            onClick={() => {
              if (menuRow) onSendInvite(menuRow.id);
              closeMenu();
            }}
          >
            Send Invite
          </MenuItem>
        )}
        {menuStatus === 'active' && (
          <MenuItem
            onClick={() => {
              if (menuRow) onSendInvite(menuRow.id);
              closeMenu();
            }}
          >
            Resend Invite (regenerate password)
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
  onChange,
  onSubmit,
  departments,
}: {
  state: EditDialogState;
  onClose: () => void;
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
  departments: string[];
}) {
  const emp = state.employee;
  if (!emp) return null;

  const isValid = state.full_name.trim().length > 0 && state.email.trim().length > 0;

  return (
    <Dialog
      open={state.open}
      onClose={onClose}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Edit Employee</div>
            <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.6, marginTop: 2 }}>
              {emp.full_name} · {emp.department || 'No department'}
            </div>
          </div>
        </div>
      </DialogTitle>
      <DialogContent sx={{ pt: '24px !important', pb: 1, px: 3, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'visible' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <MuiTextField
            label="Full Name"
            value={state.full_name}
            onChange={(e: any) => onChange('full_name', e.target.value)}
            fullWidth
            size="small"
            required
          />
          <MuiTextField
            label="Email"
            value={state.email}
            onChange={(e: any) => onChange('email', e.target.value)}
            fullWidth
            size="small"
            required
            type="email"
          />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <MuiTextField
            label="Phone"
            value={state.phone}
            onChange={(e: any) => onChange('phone', e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g. +971 50 123 4567"
          />
          <Autocomplete
            freeSolo
            forcePopupIcon
            options={departments}
            value={state.department}
            onChange={(_: any, val: string | null) => onChange('department', val || '')}
            onInputChange={(_: any, val: string) => onChange('department', val)}
            renderInput={(params: any) => (
              <MuiTextField {...params} label="Department" size="small" placeholder="Search or type..." />
            )}
            fullWidth
            size="small"
          />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Autocomplete
            options={ROLE_OPTIONS}
            value={ROLE_OPTIONS.find((o) => o.value === state.role) || null}
            onChange={(_: any, val: any) => val && onChange('role', val.value)}
            getOptionLabel={(opt: any) => opt.label}
            isOptionEqualToValue={(opt: any, val: any) => opt.value === val.value}
            renderInput={(params: any) => (
              <MuiTextField {...params} label="Role" size="small" placeholder="Search role..." />
            )}
            fullWidth
            size="small"
            disableClearable
          />
          <MuiTextField
            label="Workday Hours"
            value={state.workday_hours}
            onChange={(e: any) => onChange('workday_hours', e.target.value)}
            fullWidth
            size="small"
            type="number"
            inputProps={{ min: 1, max: 24, step: 0.5 }}
          />
        </div>
        <MuiTextField
          label="Status"
          value={state.is_active ? 'active' : 'inactive'}
          onChange={(e: any) => onChange('is_active', e.target.value === 'active')}
          fullWidth
          size="small"
          select
        >
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </MuiTextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <MuiButton
          onClick={onClose}
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
          {state.submitting ? 'Saving...' : 'Save Changes'}
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
  onChange,
  onSubmit,
  employees,
  departments,
}: {
  state: InviteDialogState;
  onClose: () => void;
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
  employees: Profile[];
  departments: string[];
}) {
  const activeEmployees = employees.filter((e) => e.is_active);

  const supervisorOptions = state.show_all_supervisors
    ? activeEmployees
    : activeEmployees.filter((e) => SUPERVISOR_DEFAULT_ROLES.includes(e.role));

  const managerOptions = state.show_all_managers
    ? activeEmployees
    : activeEmployees.filter((e) => MANAGER_DEFAULT_ROLES.includes(e.role));

  const isValid =
    state.email.trim().length > 0 &&
    state.full_name.trim().length > 0 &&
    state.emp_code.trim().length > 0 &&
    state.phone.trim().length > 0 &&
    state.department.trim().length > 0 &&
    state.job_title.trim().length > 0 &&
    state.start_date.trim().length > 0 &&
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
          Create a profile now — send the invite email when you're ready (or check the box to send it immediately).
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

        {/* Code + phone */}
        <div style={{ display: 'flex', gap: 12 }}>
          <MuiTextField
            label="Employee Code"
            value={state.emp_code}
            onChange={(e: any) => onChange('emp_code', e.target.value)}
            fullWidth size="small" required placeholder="e.g. 70150"
          />
          <MuiTextField
            label="Phone"
            value={state.phone}
            onChange={(e: any) => onChange('phone', e.target.value)}
            fullWidth size="small" required placeholder="e.g. +966 50 123 4567"
          />
        </div>

        {/* Job title + start date */}
        <div style={{ display: 'flex', gap: 12 }}>
          <MuiTextField
            label="Job Title"
            value={state.job_title}
            onChange={(e: any) => onChange('job_title', e.target.value)}
            fullWidth size="small" required placeholder="e.g. Site Engineer"
          />
          <MuiTextField
            label="Start Date"
            value={state.start_date}
            onChange={(e: any) => onChange('start_date', e.target.value)}
            fullWidth size="small" required type="date"
            InputLabelProps={{ shrink: true }}
          />
        </div>

        {/* Role + department */}
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
        </div>

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
          onClick={onClose}
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

// --------------- Main Screen ---------------

export default function EmployeesScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<EditDialogState>(INITIAL_DIALOG);
  const [successMsg, setSuccessMsg] = useState('');
  const [invite, setInvite] = useState<InviteDialogState>(INITIAL_INVITE);
  const { user } = useAuth();

  const loadEmployees = useCallback(() => {
    setLoading(true);
    userService
      .getEmployees({ search: search || undefined, is_active: true })
      .then(setEmployees)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);
  const { invalidate } = useAutoRefresh(() => { loadEmployees(); }, []);

  // --- Dialog handlers ---
  const handleOpenEdit = (emp: Profile) => {
    setDialog({
      open: true,
      employee: emp,
      full_name: emp.full_name,
      email: emp.email,
      phone: emp.phone || '',
      department: emp.department || '',
      role: emp.role,
      workday_hours: String(emp.workday_hours),
      is_active: emp.is_active,
      submitting: false,
    });
  };

  const handleCloseDialog = () => {
    if (!dialog.submitting) setDialog(INITIAL_DIALOG);
  };

  const handleChange = (field: string, value: any) => {
    setDialog((s) => ({ ...s, [field]: value }));
  };

  const handleSubmitEdit = async () => {
    if (!dialog.employee) return;
    setDialog((s) => ({ ...s, submitting: true }));
    try {
      await userService.updateProfile(dialog.employee.id, {
        full_name: dialog.full_name.trim(),
        email: dialog.email.trim(),
        phone: dialog.phone.trim() || null,
        department: dialog.department.trim() || null,
        role: dialog.role,
        workday_hours: parseFloat(dialog.workday_hours) || 8,
        is_active: dialog.is_active,
      });
      setDialog(INITIAL_DIALOG);
      setSuccessMsg(`${dialog.full_name} updated successfully`);
      invalidate();
    } catch {
      setDialog((s) => ({ ...s, submitting: false }));
    }
  };

  // --- Invite handlers ---
  const handleOpenInvite = () => setInvite({ ...INITIAL_INVITE, open: true });
  const handleCloseInvite = () => { if (!invite.submitting) setInvite(INITIAL_INVITE); };
  const handleInviteChange = (field: string, value: any) => {
    setInvite((s) => ({ ...s, [field]: value, error: '' }));
  };
  const handleSubmitInvite = async () => {
    setInvite((s) => ({ ...s, submitting: true, error: '' }));
    try {
      const newProfile = await registrationService.createEmployee(
        {
          email: invite.email.trim(),
          full_name: invite.full_name.trim(),
          emp_code: invite.emp_code.trim(),
          phone: invite.phone.trim(),
          role: invite.role,
          department: invite.department.trim(),
          supervisor_id: invite.supervisor_id!,
          manager_id: invite.manager_id!,
          job_title: invite.job_title.trim(),
          start_date: invite.start_date,
        },
        user!.id
      );

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

      setInvite(INITIAL_INVITE);
      setSuccessMsg(message);
      invalidate();
    } catch (err: any) {
      setInvite((s) => ({ ...s, submitting: false, error: err.message || 'Failed to create employee' }));
    }
  };

  // --- Bulk send invite handler ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkSending, setBulkSending] = useState(false);

  const handleSendInvites = async (ids: string[]) => {
    if (ids.length === 0) return;
    const eligibleIds = ids.filter((id) => {
      const emp = employees.find((e) => e.id === id);
      return emp && (emp.registration_status === 'not_invited' || emp.registration_status === 'active');
    });
    if (eligibleIds.length === 0) {
      setSuccessMsg('No invite-eligible rows selected.');
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
    } catch (err: any) {
      setSuccessMsg(`Bulk send failed: ${err.message || 'unknown error'}`);
    } finally {
      setBulkSending(false);
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
            </div>
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={() => handleSendInvites(selectedIds)}
              disabled={bulkSending}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                backgroundColor: bulkSending ? '#94A3B8' : '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: bulkSending ? 'wait' : 'pointer',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              {bulkSending ? 'Sending...' : `Send Invite(s) (${selectedIds.length})`}
            </button>
          )}

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
                  onChange={handleChange}
                  onSubmit={handleSubmitEdit}
                  departments={[...new Set(employees.map((e) => e.department).filter(Boolean) as string[])]}
                />
                <InviteEmployeeDialog
                  state={invite}
                  onClose={handleCloseInvite}
                  onChange={handleInviteChange}
                  onSubmit={handleSubmitInvite}
                  employees={employees}
                  departments={[...new Set(employees.map((e) => e.department).filter(Boolean) as string[])]}
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
