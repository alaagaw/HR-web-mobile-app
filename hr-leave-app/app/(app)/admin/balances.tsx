import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useColorScheme } from 'nativewind';
import { ScreenHeader } from '@/components/layout/screen-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { userService, balanceService } from '@/services';
import { formatHours, formatHoursWithDays, formatDaysHours, getInitials, getRoleLabel } from '@/lib/utils';
import { DEFAULT_WORKDAY_HOURS } from '@/lib/constants';
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
  const [filters, setFilters] = useState({ employee: '', role: '', balance: '', used: '' });

  const filteredData = data.filter((row) => {
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
  });

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
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
        }}
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
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [employees, setEmployees] = useState<EmployeeWithBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<AdjustDialogState>(INITIAL_DIALOG);
  const [successMsg, setSuccessMsg] = useState('');

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

  useFocusEffect(useCallback(() => { loadData(); }, []));

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(loadData, 60_000);
    return () => clearInterval(interval);
  }, []);

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
      loadData();
    } catch {
      setDialog((s) => ({ ...s, submitting: false }));
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
            loadData();
          },
        },
      ],
      'plain-text'
    );
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
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A' }}>
              Balance Management
            </div>
            <div style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
              View and adjust PTO balances for all employees
            </div>
          </div>
        </div>

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
