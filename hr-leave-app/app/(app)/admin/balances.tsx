import { AccessGate } from '@/components/access/access-gate';
import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, Alert, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useViewState } from '@/hooks/use-view-state';
import { useColorScheme } from 'nativewind';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { ScreenHeader } from '@/components/layout/screen-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { userService, balanceService } from '@/services';
import { supabase } from '@/services/supabase/client';
import { formatHours, formatHoursWithDays, formatDaysHours, getInitials, getRoleLabel } from '@/lib/utils';
import { DEFAULT_WORKDAY_HOURS } from '@/lib/constants';
import { exportEmployeesXlsx, importEmployeesXlsx, type BulkImportSummary } from '@/lib/employee-bulk-excel';
import type { Profile, LeaveBalance } from '@/types/models';

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
let ToggleButtonGroup: any;
let ToggleButton: any;
let MuiAlert: any;
let Snackbar: any;

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
  ToggleButtonGroup = require('@mui/material/ToggleButtonGroup').default;
  ToggleButton = require('@mui/material/ToggleButton').default;
  MuiAlert = require('@mui/material/Alert').default;
  Snackbar = require('@mui/material/Snackbar').default;
}

interface EmployeeWithBalance extends Profile {
  ptoBalance?: LeaveBalance;
}

interface AdjustDialogState {
  open: boolean;
  employee: EmployeeWithBalance | null;
  mode: 'add' | 'deduct';
  unit: 'hours' | 'days';
  amount: string;
  reason: string;
  submitting: boolean;
}

const INITIAL_DIALOG: AdjustDialogState = {
  open: false,
  employee: null,
  mode: 'add',
  unit: 'hours',
  amount: '',
  reason: '',
  submitting: false,
};

// --------------- Web Components ---------------

function WebBalancesTable({
  data,
  isDark,
  onAdjust,
}: {
  data: EmployeeWithBalance[];
  isDark: boolean;
  onAdjust: (emp: EmployeeWithBalance) => void;
}) {
  const [filters, setFilters] = useViewState('admin/balances.columnFilters', {
    employee: '',
    role: '',
    balance: '',
    used: '',
  });

  const [paginationModel, setPaginationModel] = useViewState(
    'admin/balances.pagination',
    { page: 0, pageSize: 25 }
  );
  const [sortModel, setSortModel] = useViewState<any[]>('admin/balances.sort', []);

  // Memoized so the DataGrid `rows` reference stays stable across the
  // re-render a pagination/sort click triggers — otherwise MUI's
  // "rows changed → reset to page 0" fires and paging never sticks.
  const filteredData = useMemo(
    () =>
      data.filter((row) => {
        const wd = row.workday_hours || DEFAULT_WORKDAY_HOURS;
        const emp = `${row.full_name} ${row.department || ''}`.toLowerCase();
        const role = getRoleLabel(row.role).toLowerCase();
        const balHours = row.ptoBalance?.balance_hours ?? 0;
        const usedHours = row.ptoBalance?.used_hours ?? 0;
        const balText = `${formatHours(balHours)} ${formatDaysHours(balHours, wd)}`.toLowerCase();
        const usedText = `${formatHours(usedHours)} ${formatDaysHours(usedHours, wd)}`.toLowerCase();
        if (filters.employee && !emp.includes(filters.employee.toLowerCase())) return false;
        if (filters.role && !role.includes(filters.role.toLowerCase())) return false;
        if (filters.balance && !balText.includes(filters.balance.toLowerCase())) return false;
        if (filters.used && !usedText.includes(filters.used.toLowerCase())) return false;
        return true;
      }),
    [data, filters]
  );

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    fontSize: 12,
    border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
    borderRadius: 6,
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    color: isDark ? '#F8FAFC' : '#0F172A',
    outline: 'none',
  };

  const columns = [
    {
      field: 'full_name',
      headerName: 'Employee',
      flex: 1.5,
      minWidth: 200,
      renderHeader: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 0' }}>
          <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const }}>Employee</span>
          <input
            placeholder="Filter..."
            value={filters.employee}
            onChange={(e) => setFilters((f) => ({ ...f, employee: e.target.value }))}
            onClick={(e) => e.stopPropagation()}
            style={inputStyle}
          />
        </div>
      ),
      valueGetter: (_value: any, row: EmployeeWithBalance) =>
        `${row.full_name} ${row.department || ''}`.trim(),
      renderCell: (params: any) => {
        const row = params.row as EmployeeWithBalance;
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
              {row.full_name}
            </div>
            <div style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B' }}>
              {row.department || '—'}
            </div>
          </div>
        );
      },
    },
    {
      field: 'role',
      headerName: 'Role',
      flex: 0.8,
      minWidth: 120,
      renderHeader: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 0' }}>
          <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const }}>Role</span>
          <input
            placeholder="Filter..."
            value={filters.role}
            onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
            onClick={(e) => e.stopPropagation()}
            style={inputStyle}
          />
        </div>
      ),
      renderCell: (params: any) => (
        <Chip
          label={getRoleLabel(params.row.role)}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: 12 }}
        />
      ),
      valueGetter: (_value: any, row: EmployeeWithBalance) => getRoleLabel(row.role),
    },
    {
      field: 'balance_hours',
      headerName: 'PTO Balance',
      flex: 1.5,
      minWidth: 220,
      renderHeader: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 0' }}>
          <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const }}>PTO Balance</span>
          <input
            placeholder="Filter..."
            value={filters.balance}
            onChange={(e) => setFilters((f) => ({ ...f, balance: e.target.value }))}
            onClick={(e) => e.stopPropagation()}
            style={inputStyle}
          />
        </div>
      ),
      type: 'number' as const,
      valueGetter: (_value: any, row: EmployeeWithBalance) =>
        row.ptoBalance?.balance_hours ?? 0,
      renderCell: (params: any) => {
        const row = params.row as EmployeeWithBalance;
        const hours = row.ptoBalance?.balance_hours ?? 0;
        const wd = row.workday_hours || DEFAULT_WORKDAY_HOURS;
        const color = hours <= 0 ? '#DC2626' : '#2563EB';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color }}>
                {formatHours(hours)}
              </div>
              <div style={{ fontSize: 12, color: hours <= 0 ? '#DC2626' : (isDark ? '#94A3B8' : '#64748B') }}>
                {formatDaysHours(hours, wd)}
              </div>
            </div>
            <MuiButton
              variant="outlined"
              size="small"
              onClick={(e: any) => {
                e.stopPropagation();
                onAdjust(row);
              }}
              sx={{ fontWeight: 600, fontSize: 12, textTransform: 'none', minWidth: 56, flexShrink: 0 }}
            >
              Edit
            </MuiButton>
          </div>
        );
      },
    },
    {
      field: 'used_hours',
      headerName: 'Used',
      flex: 1,
      minWidth: 130,
      renderHeader: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 0' }}>
          <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const }}>Used</span>
          <input
            placeholder="Filter..."
            value={filters.used}
            onChange={(e) => setFilters((f) => ({ ...f, used: e.target.value }))}
            onClick={(e) => e.stopPropagation()}
            style={inputStyle}
          />
        </div>
      ),
      type: 'number' as const,
      valueGetter: (_value: any, row: EmployeeWithBalance) =>
        row.ptoBalance?.used_hours ?? 0,
      renderCell: (params: any) => {
        const row = params.row as EmployeeWithBalance;
        const hours = row.ptoBalance?.used_hours ?? 0;
        const wd = row.workday_hours || DEFAULT_WORKDAY_HOURS;
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
              {formatHours(hours)}
            </div>
            <div style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B' }}>
              {formatDaysHours(hours, wd)}
            </div>
          </div>
        );
      },
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
        pageSizeOptions={[10, 25, 50]}
        rowHeight={56}
        sx={{
          borderRadius: 3,
          '& .MuiDataGrid-cell': { whiteSpace: 'normal', lineHeight: 1.4, display: 'flex', alignItems: 'center' },
          '& .MuiDataGrid-columnHeader': { alignItems: 'flex-start' },
          '& .MuiDataGrid-columnHeaderTitleContainer': { overflow: 'visible' },
        }}
      />
    </div>
  );
}

function AdjustBalanceDialog({
  state,
  onClose,
  onModeChange,
  onUnitChange,
  onAmountChange,
  onReasonChange,
  onSubmit,
}: {
  state: AdjustDialogState;
  onClose: () => void;
  onModeChange: (mode: 'add' | 'deduct') => void;
  onUnitChange: (unit: 'hours' | 'days') => void;
  onAmountChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const emp = state.employee;
  if (!emp) return null;

  const parsedAmount = parseFloat(state.amount) || 0;
  const adjustHours =
    state.unit === 'days'
      ? parsedAmount * (emp.workday_hours || DEFAULT_WORKDAY_HOURS)
      : parsedAmount;
  const signedHours = state.mode === 'deduct' ? -adjustHours : adjustHours;
  const wd = emp.workday_hours || DEFAULT_WORKDAY_HOURS;
  const currentBalance = emp.ptoBalance?.balance_hours ?? 0;
  const newBalance = currentBalance + signedHours;
  const isValid = parsedAmount > 0 && state.reason.trim().length > 0;

  return (
    <Dialog open={state.open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        Adjust PTO Balance
        <div style={{ fontSize: 14, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>
          {emp.full_name} · {emp.department || 'No department'}
        </div>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Add / Deduct toggle */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Operation</div>
          <ToggleButtonGroup
            value={state.mode}
            exclusive
            onChange={(_: any, v: string) => v && onModeChange(v as 'add' | 'deduct')}
            fullWidth
            size="small"
          >
            <ToggleButton
              value="add"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                '&.Mui-selected': { backgroundColor: 'rgba(34,197,94,0.20)', color: '#22C55E' },
                '&.Mui-selected:hover': { backgroundColor: 'rgba(34,197,94,0.28)' },
              }}
            >
              + Add
            </ToggleButton>
            <ToggleButton
              value="deduct"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                '&.Mui-selected': { backgroundColor: 'rgba(248,113,113,0.20)', color: '#F87171' },
                '&.Mui-selected:hover': { backgroundColor: 'rgba(248,113,113,0.28)' },
              }}
            >
              − Deduct
            </ToggleButton>
          </ToggleButtonGroup>
        </div>

        {/* Amount + unit */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <MuiTextField
            label="Amount"
            type="number"
            value={state.amount}
            onChange={(e: any) => onAmountChange(e.target.value)}
            inputProps={{ min: 0, step: 0.5 }}
            fullWidth
            size="small"
          />
          <ToggleButtonGroup
            value={state.unit}
            exclusive
            onChange={(_: any, v: string) => v && onUnitChange(v as 'hours' | 'days')}
            size="small"
            sx={{ flexShrink: 0 }}
          >
            <ToggleButton value="hours" sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}>
              Hours
            </ToggleButton>
            <ToggleButton value="days" sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}>
              Days
            </ToggleButton>
          </ToggleButtonGroup>
        </div>

        {/* Preview */}
        {parsedAmount > 0 && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              backgroundColor: state.mode === 'add' ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.12)',
              border: `1px solid ${state.mode === 'add' ? 'rgba(34,197,94,0.30)' : 'rgba(248,113,113,0.30)'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, opacity: 0.5 }}>Adjustment</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: state.mode === 'add' ? '#22C55E' : '#F87171',
                }}
              >
                {state.mode === 'add' ? '+' : '−'}
                {formatHoursWithDays(adjustHours, wd)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, opacity: 0.5 }}>New balance</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {formatHoursWithDays(newBalance, wd)}
              </span>
            </div>
            {newBalance < 0 && (
              <div style={{ fontSize: 12, color: '#F87171', marginTop: 8, fontWeight: 600 }}>
                Warning: This will result in a negative balance.
              </div>
            )}
          </div>
        )}

        {/* Reason */}
        <MuiTextField
          label="Reason"
          value={state.reason}
          onChange={(e: any) => onReasonChange(e.target.value)}
          multiline
          rows={2}
          fullWidth
          size="small"
          placeholder="e.g. Annual accrual, correction, carry-over..."
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton onClick={onClose} disabled={state.submitting}>
          Cancel
        </MuiButton>
        <MuiButton
          variant="contained"
          onClick={onSubmit}
          disabled={!isValid || state.submitting}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {state.submitting ? 'Saving...' : 'Confirm Adjustment'}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

// --------------- Main Screen ---------------

export default function BalancesScreen() {
  return (
    <AccessGate resourceKey="page:admin/balances">
      <BalancesScreenInner />
    </AccessGate>
  );
}

function BalancesScreenInner() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isMobile } = useBreakpoint();
  const [employees, setEmployees] = useState<EmployeeWithBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<AdjustDialogState>(INITIAL_DIALOG);
  const [successMsg, setSuccessMsg] = useState('');
  const [busy, setBusy] = useState<null | 'export' | 'import' | 'accrue'>(null);
  const [importSummary, setImportSummary] = useState<BulkImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const emps = await userService.getEmployees({ is_active: true });
      const withBalances = await Promise.all(
        emps.map(async (emp) => {
          const balances = await balanceService.getEmployeeBalance(emp.id);
          return {
            ...emp,
            ptoBalance: balances.find((b) => b.leave_type === 'pto'),
          };
        })
      );
      setEmployees(withBalances);
    } finally {
      setLoading(false);
    }
  };

  const { invalidate } = useAutoRefresh(() => { loadData(); }, []);

  // --- Web dialog handlers ---
  const handleOpenAdjust = (emp: EmployeeWithBalance) => {
    setDialog({ ...INITIAL_DIALOG, open: true, employee: emp });
  };

  const handleCloseDialog = () => {
    if (!dialog.submitting) setDialog(INITIAL_DIALOG);
  };

  const handleSubmitAdjust = async () => {
    if (!dialog.employee || !user) return;
    const emp = dialog.employee;
    const parsedAmount = parseFloat(dialog.amount) || 0;
    if (parsedAmount <= 0) return;

    const wd = emp.workday_hours || DEFAULT_WORKDAY_HOURS;
    const adjustHours = dialog.unit === 'days' ? parsedAmount * wd : parsedAmount;
    const finalHours = dialog.mode === 'deduct' ? -adjustHours : adjustHours;
    const reason = dialog.reason.trim();

    setDialog((s) => ({ ...s, submitting: true }));
    try {
      await balanceService.adjustBalance(emp.id, 'pto', finalHours, reason, user.id);
      setDialog(INITIAL_DIALOG);
      setSuccessMsg(`Balance adjusted for ${emp.full_name}`);
      invalidate();
    } catch {
      setDialog((s) => ({ ...s, submitting: false }));
    }
  };

  // --- Bulk Excel + monthly accrual handlers (web only) ---

  const handleExport = async () => {
    if (busy) return;
    setBusy('export');
    try {
      const r = await exportEmployeesXlsx({ is_active: true });
      setSuccessMsg(`Exported ${r.count} employee(s) to ${r.filename}`);
    } catch (err: any) {
      setSuccessMsg(`Export failed: ${err.message || 'unknown error'}`);
    } finally {
      setBusy(null);
    }
  };

  const handleImportPick = () => {
    if (busy || !fileInputRef.current) return;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  const handleImportFile = async (file: File) => {
    if (!user) return;
    setBusy('import');
    try {
      const summary = await importEmployeesXlsx(file, user.id);
      setImportSummary(summary);
      setSuccessMsg(`Import complete: ${summary.succeeded} succeeded, ${summary.failed} failed`);
      invalidate();
    } catch (err: any) {
      setSuccessMsg(`Import failed: ${err.message || 'unknown error'}`);
    } finally {
      setBusy(null);
    }
  };

  const handleRunAccruals = async () => {
    if (busy) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const ok = window.confirm(
      `Run PTO accruals for ${year}-${String(month).padStart(2, '0')} for all active employees?\n\n` +
      `Already-credited employees will be skipped automatically — safe to re-run.`,
    );
    if (!ok) return;
    setBusy('accrue');
    try {
      const { data, error } = await supabase.rpc('apply_monthly_accruals', {
        p_year: year,
        p_month: month,
        p_employee_id: null,
        p_source: 'manual',
      });
      if (error) throw new Error(error.message);
      const result: any = data ?? {};
      setSuccessMsg(
        `Accrual ${year}-${String(month).padStart(2, '0')}: ${result.accrued ?? 0} credited, ${result.skipped ?? 0} already-credited, ${result.errors ?? 0} error(s).`,
      );
      invalidate();
    } catch (err: any) {
      setSuccessMsg(`Accrual run failed: ${err.message || 'unknown error'}`);
    } finally {
      setBusy(null);
    }
  };

  // --- Mobile adjust handler ---
  const handleMobileAdjust = (emp: EmployeeWithBalance) => {
    Alert.prompt(
      `Adjust PTO for ${emp.full_name}`,
      'Enter hours to add (positive) or deduct (negative):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Adjust',
          onPress: async (hoursStr?: string) => {
            const hours = parseFloat(hoursStr || '0');
            if (isNaN(hours) || hours === 0) return;
            const reason = hours > 0 ? 'Manual accrual adjustment' : 'Manual deduction';
            await balanceService.adjustBalance(emp.id, 'pto', hours, reason, user!.id);
            invalidate();
          },
        },
      ],
      'plain-text'
    );
  };

  // --------------- Web render ---------------
  if (isWeb && !isMobile) {
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
              Balance Management
            </div>
            <div style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
              View and adjust PTO balances for all employees
            </div>
          </div>

          {/* Bulk + accrual action buttons (HR only). The list view stays
              read-only; these route through the bulk Excel helpers and
              the apply_monthly_accruals RPC. */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportFile(f);
            }}
          />
          <button
            onClick={handleRunAccruals}
            disabled={!!busy}
            title="Manually trigger this month's PTO accrual for every active employee. Idempotent — safe to re-run; already-credited rows are skipped."
            style={{
              padding: '10px 16px',
              backgroundColor: busy === 'accrue' ? '#94A3B8' : '#16A34A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
              flexShrink: 0,
            }}
          >
            {busy === 'accrue' ? 'Running…' : 'Run Monthly Accruals'}
          </button>
          <button
            onClick={handleExport}
            disabled={!!busy}
            title="Download an Excel file of every active employee + their entitlement + current PTO balance. Edit and re-upload via Import."
            style={{
              padding: '10px 16px',
              backgroundColor: busy === 'export' ? '#94A3B8' : '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
              flexShrink: 0,
            }}
          >
            {busy === 'export' ? 'Exporting…' : 'Export Excel'}
          </button>
          <button
            onClick={handleImportPick}
            disabled={!!busy}
            title="Upload a previously-downloaded Excel after edits. The file is matched by Emp Code; rows with unknown codes are reported as errors and skipped."
            style={{
              padding: '10px 16px',
              backgroundColor: busy === 'import' ? '#94A3B8' : '#D97706',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
              flexShrink: 0,
            }}
          >
            {busy === 'import' ? 'Importing…' : 'Import Excel'}
          </button>
        </div>

        {/* Import results banner — shows after a finished bulk upload. */}
        {importSummary && (
          <div
            style={{
              margin: '12px 24px 0',
              padding: '10px 14px',
              borderRadius: 10,
              border: `1px solid ${importSummary.failed > 0 ? '#D97706' : '#16A34A'}`,
              backgroundColor: importSummary.failed > 0 ? 'rgba(217,119,6,0.08)' : 'rgba(22,163,74,0.08)',
              fontSize: 13,
              color: isDark ? '#E2E8F0' : '#0F172A',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                Bulk import: {importSummary.succeeded} succeeded / {importSummary.failed} failed
              </div>
              {importSummary.failed > 0 && (
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {importSummary.results.filter((r) => !r.success).slice(0, 5).map((r) => (
                    <div key={r.emp_code}>{r.emp_code} — {r.error}</div>
                  ))}
                  {importSummary.failed > 5 && <div>…and {importSummary.failed - 5} more</div>}
                </div>
              )}
            </div>
            <button
              onClick={() => setImportSummary(null)}
              style={{ background: 'transparent', border: 'none', color: 'inherit', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}
            >
              ×
            </button>
          </div>
        )}

        {/* DataGrid */}
        <View style={{ flex: 1, padding: 16 }}>
          {employees.length > 0 || loading ? (
            <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
              <MuiThemeProvider isDark={isDark}>
                <WebBalancesTable
                  data={employees}
                  isDark={isDark}
                  onAdjust={handleOpenAdjust}
                />
                <AdjustBalanceDialog
                  state={dialog}
                  onClose={handleCloseDialog}
                  onModeChange={(mode) => setDialog((s) => ({ ...s, mode }))}
                  onUnitChange={(unit) => setDialog((s) => ({ ...s, unit }))}
                  onAmountChange={(amount) => setDialog((s) => ({ ...s, amount }))}
                  onReasonChange={(reason) => setDialog((s) => ({ ...s, reason }))}
                  onSubmit={handleSubmitAdjust}
                />
                <Snackbar
                  open={!!successMsg}
                  autoHideDuration={3000}
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
            <EmptyState title="No employees found" description="No active employees in the system." />
          )}
        </View>
      </View>
    );
  }

  // --------------- Mobile render ---------------
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-[#0F172A]" edges={['top']}>
      <ScreenHeader title="Balance Management" />

      {/* HR bulk actions (mobile web) */}
      {isWeb && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImportFile(f); }}
          />
          <View className="px-4 pt-3 flex-row gap-2">
            <Pressable onPress={handleRunAccruals} disabled={!!busy} className="flex-1 items-center justify-center bg-green-600 rounded-xl py-2.5 active:opacity-80">
              <Text className="text-white text-xs font-semibold">{busy === 'accrue' ? 'Running…' : 'Run Accruals'}</Text>
            </Pressable>
            <Pressable onPress={handleExport} disabled={!!busy} className="flex-1 items-center justify-center bg-primary rounded-xl py-2.5 active:opacity-80">
              <Text className="text-white text-xs font-semibold">{busy === 'export' ? 'Exporting…' : 'Export'}</Text>
            </Pressable>
            <Pressable onPress={handleImportPick} disabled={!!busy} className="flex-1 items-center justify-center bg-amber-600 rounded-xl py-2.5 active:opacity-80">
              <Text className="text-white text-xs font-semibold">{busy === 'import' ? 'Importing…' : 'Import'}</Text>
            </Pressable>
          </View>
        </>
      )}

      <FlatList
        data={employees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        renderItem={({ item }) => {
          const hours = item.ptoBalance?.balance_hours ?? 0;
          const used = item.ptoBalance?.used_hours ?? 0;
          const wd = item.workday_hours || DEFAULT_WORKDAY_HOURS;
          return (
            <Card className="mb-3">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-primary-light dark:bg-blue-900/40 items-center justify-center mr-3">
                  <Text className="text-sm font-bold text-primary dark:text-blue-400">
                    {getInitials(item.full_name)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text-primary dark:text-white">
                    {item.full_name}
                  </Text>
                  <Text className="text-xs text-text-muted dark:text-slate-400">
                    {item.department}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className={`text-base font-bold ${hours <= 0 ? 'text-error' : 'text-primary dark:text-blue-400'}`}>
                    {formatHours(hours)}
                  </Text>
                  <Text className={`text-xs ${hours <= 0 ? 'text-error' : 'text-text-muted dark:text-slate-400'}`}>
                    {formatDaysHours(hours, wd)}
                  </Text>
                  <Text className="text-xs text-text-muted dark:text-slate-400 mt-0.5">
                    Used: {formatHours(used)}
                  </Text>
                </View>
              </View>
              <View className="mt-3">
                <Button variant="secondary" size="sm" onPress={() => handleMobileAdjust(item)}>
                  Adjust Balance
                </Button>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="No employees found"
              description="No active employees in the system."
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
