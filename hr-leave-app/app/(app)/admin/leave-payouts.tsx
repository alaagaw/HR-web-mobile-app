/**
 * HR Admin → Leave Payouts
 *
 * Calculator + report. HR picks a (year, month) → grid shows every
 * active employee with the leave-payout breakdown computed by the
 * compute_leave_payouts RPC:
 *
 *     payable = component / 30 * days_off_in_month
 *
 * Compensation snapshot is taken at the FIRST day of the chosen
 * month, so historical months still use the salary that was in
 * effect then (per migration 033's design).
 *
 * Days off = sum of approved PTO + emergency leave days inside the
 * chosen month, clamped at month boundaries for cross-month requests.
 *
 * Web-only.
 */
import { useCallback, useMemo, useState } from 'react';
import { View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useViewState } from '@/hooks/use-view-state';
import { compensationService } from '@/services';
import { EmptyState } from '@/components/ui/empty-state';
import type { LeavePayoutRow } from '@/types/models';

const isWeb = Platform.OS === 'web';

let MuiTextField: any, MuiButton: any, MuiAlert: any, Snackbar: any, MenuItem: any;
let DataGrid: any, MuiThemeProvider: any;

if (isWeb) {
  MuiTextField = require('@mui/material/TextField').default;
  MuiButton = require('@mui/material/Button').default;
  MuiAlert = require('@mui/material/Alert').default;
  Snackbar = require('@mui/material/Snackbar').default;
  MenuItem = require('@mui/material/MenuItem').default;
  DataGrid = require('@mui/x-data-grid').DataGrid;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export default function LeavePayoutsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const now = new Date();
  const [year, setYear] = useViewState<number>('admin/leave-payouts.year', now.getFullYear());
  const [month, setMonth] = useViewState<number>('admin/leave-payouts.month', now.getMonth() + 1);
  const [search, setSearch] = useViewState<string>('admin/leave-payouts.search', '');
  const [departmentFilter, setDepartmentFilter] = useViewState<string>('admin/leave-payouts.dept', '');

  const [rows, setRows] = useState<LeavePayoutRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await compensationService.computeLeavePayouts(year, month, departmentFilter || undefined);
      setRows(data);
    } catch (err: any) {
      setSuccessMsg(`Load failed: ${err.message || 'unknown'}`);
    } finally {
      setLoading(false);
    }
  }, [year, month, departmentFilter]);

  useAutoRefresh(() => { void loadData(); }, [year, month, departmentFilter]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.department) set.add(r.department);
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.full_name.toLowerCase().includes(q) ||
      (r.emp_code || '').toLowerCase().includes(q) ||
      (r.department || '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => {
        acc.days += Number(r.days_in_month) || 0;
        acc.basic += Number(r.basic_payable) || 0;
        acc.hra += Number(r.hra_payable) || 0;
        acc.transport += Number(r.transport_payable) || 0;
        acc.other += Number(r.other_payable) || 0;
        acc.total += Number(r.total_payable) || 0;
        return acc;
      },
      { days: 0, basic: 0, hra: 0, transport: 0, other: 0, total: 0 },
    );
  }, [filteredRows]);

  const stepMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    while (m < 1) { m += 12; y -= 1; }
    while (m > 12) { m -= 12; y += 1; }
    setMonth(m);
    setYear(y);
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const out = filteredRows.map((r) => ({
        'Emp Code': r.emp_code || '',
        'Name': r.full_name,
        'Department': r.department || '',
        'Basic / mo': Number(r.basic_salary) || 0,
        'HRA / mo': Number(r.hra) || 0,
        'Transport / mo': Number(r.transportation) || 0,
        'Other / mo': Number(r.other_allowances) || 0,
        'Days Off': Number(r.days_in_month) || 0,
        'Basic Payable': Number(r.basic_payable) || 0,
        'HRA Payable': Number(r.hra_payable) || 0,
        'Transport Payable': Number(r.transport_payable) || 0,
        'Other Payable': Number(r.other_payable) || 0,
        'TOTAL Payable': Number(r.total_payable) || 0,
        'Effective From': r.effective_from || '',
      }));
      // Append a totals row at the bottom for spreadsheet readability.
      out.push({
        'Emp Code': '',
        'Name': 'TOTAL',
        'Department': '',
        'Basic / mo': 0,
        'HRA / mo': 0,
        'Transport / mo': 0,
        'Other / mo': 0,
        'Days Off': totals.days,
        'Basic Payable': totals.basic,
        'HRA Payable': totals.hra,
        'Transport Payable': totals.transport,
        'Other Payable': totals.other,
        'TOTAL Payable': totals.total,
        'Effective From': '',
      });
      const ws = XLSX.utils.json_to_sheet(out);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Payouts ${monthLabel(year, month)}`);
      const fname = `leave_payouts_${year}_${String(month).padStart(2, '0')}.xlsx`;
      XLSX.writeFile(wb, fname);
      setSuccessMsg(`Exported ${out.length - 1} row(s) to ${fname}`);
    } catch (err: any) {
      setSuccessMsg(`Export failed: ${err.message || 'unknown'}`);
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo(() => ([
    { field: 'emp_code', headerName: 'Emp #', width: 90,
      valueGetter: (_value: any, row: LeavePayoutRow) => row.emp_code || '—' },
    { field: 'full_name', headerName: 'Employee', flex: 1.5, minWidth: 180 },
    { field: 'department', headerName: 'Dept', flex: 1, minWidth: 130,
      valueGetter: (_value: any, row: LeavePayoutRow) => row.department || '—' },
    { field: 'basic_salary', headerName: 'Basic/mo', flex: 0.9, minWidth: 110, type: 'number',
      valueFormatter: (value: any) => formatMoney(Number(value) || 0) },
    { field: 'hra', headerName: 'HRA/mo', flex: 0.9, minWidth: 110, type: 'number',
      valueFormatter: (value: any) => formatMoney(Number(value) || 0) },
    { field: 'transportation', headerName: 'Transport/mo', flex: 0.9, minWidth: 110, type: 'number',
      valueFormatter: (value: any) => formatMoney(Number(value) || 0) },
    { field: 'days_in_month', headerName: 'Days off', flex: 0.7, minWidth: 90, type: 'number',
      valueFormatter: (value: any) => Number(value || 0).toFixed(value && value % 1 !== 0 ? 2 : 0) },
    { field: 'basic_payable', headerName: 'Basic Pay', flex: 1, minWidth: 110, type: 'number',
      valueFormatter: (value: any) => formatMoney(Number(value) || 0),
      cellClassName: 'payable-cell' },
    { field: 'hra_payable', headerName: 'HRA Pay', flex: 1, minWidth: 110, type: 'number',
      valueFormatter: (value: any) => formatMoney(Number(value) || 0),
      cellClassName: 'payable-cell' },
    { field: 'transport_payable', headerName: 'Transport Pay', flex: 1, minWidth: 110, type: 'number',
      valueFormatter: (value: any) => formatMoney(Number(value) || 0),
      cellClassName: 'payable-cell' },
    { field: 'total_payable', headerName: 'TOTAL', flex: 1, minWidth: 120, type: 'number',
      valueFormatter: (value: any) => formatMoney(Number(value) || 0),
      cellClassName: 'total-payable-cell' },
  ]), []);

  if (!isWeb) {
    return (
      <EmptyState
        title="Web-only feature"
        description="Open Leave Payouts on a desktop browser to use the calculator."
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
      {/* Page header */}
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
            if (window.history.length > 1) window.history.back();
            else router.replace('/(app)/(tabs)/admin' as any);
          }}
          style={{ width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#E2E8F0' : '#0F172A'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A' }}>
            Leave Payouts
          </div>
          <div style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
            Pick any month — past, present, or future. Compensation is taken at the 1st of that month.
          </div>
        </div>

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => stepMonth(-1)} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid rgba(148,163,184,0.4)', background: 'transparent', color: isDark ? '#E2E8F0' : '#0F172A', cursor: 'pointer', fontSize: 16 }}>‹</button>
          <div style={{ minWidth: 110, textAlign: 'center', fontWeight: 700, fontSize: 14, color: isDark ? '#FFFFFF' : '#0F172A' }}>
            {monthLabel(year, month)}
          </div>
          <button onClick={() => stepMonth(1)} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid rgba(148,163,184,0.4)', background: 'transparent', color: isDark ? '#E2E8F0' : '#0F172A', cursor: 'pointer', fontSize: 16 }}>›</button>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting || loading || filteredRows.length === 0}
          style={{
            padding: '10px 16px',
            backgroundColor: (exporting || loading) ? '#94A3B8' : '#2563EB',
            color: '#FFFFFF', border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          }}
        >
          {exporting ? 'Exporting…' : 'Export Excel'}
        </button>
      </div>

      {/* MuiThemeProvider wraps the filter row AND the DataGrid so
          every MUI component (TextField, Select popover, MenuItem,
          DataGrid, Snackbar) picks up the same dark/light/system
          theme as the rest of the app. Previously only the DataGrid
          was wrapped, which left the filter dropdown rendered with
          MUI's default white theme. */}
      <MuiThemeProvider isDark={isDark}>
        {/* Filters row */}
        <div style={{ padding: '12px 24px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: `1px solid ${isDark ? '#334155' : '#E2E8F0'}` }}>
          <MuiTextField
            label="Search"
            size="small"
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            placeholder="Name, emp code, department…"
            sx={{ minWidth: 280 }}
          />
          <MuiTextField
            label="Department"
            size="small"
            select
            value={departmentFilter}
            onChange={(e: any) => setDepartmentFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value=""><em>(All departments)</em></MenuItem>
            {departments.map((d: string) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </MuiTextField>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#E2E8F0' : '#0F172A' }}>
            {filteredRows.length} employees · {totals.days.toFixed(totals.days % 1 !== 0 ? 2 : 0)} days · <span style={{ color: '#2563EB' }}>TOTAL {formatMoney(totals.total)} SAR</span>
          </div>
        </div>

        <View style={{ flex: 1, padding: 16 }}>
          {filteredRows.length === 0 && !loading ? (
            <EmptyState title="No payouts for this month" description="Either nobody took leave or no compensation rows are in effect yet." />
          ) : (
            <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
              <DataGrid
                rows={filteredRows}
                columns={columns}
                loading={loading}
                getRowId={(r: any) => r.employee_id}
                disableRowSelectionOnClick
                density="compact"
                pageSizeOptions={[25, 50, 100]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 50, page: 0 } },
                }}
                sx={{
                  border: 'none',
                  '& .payable-cell': { fontWeight: 600 },
                  '& .total-payable-cell': { fontWeight: 700, color: '#2563EB' },
                }}
              />
            </View>
          )}
        </View>

        <Snackbar
          open={!!successMsg}
          autoHideDuration={3500}
          onClose={() => setSuccessMsg('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <MuiAlert severity="success" onClose={() => setSuccessMsg('')} sx={{ fontWeight: 600 }}>
            {successMsg}
          </MuiAlert>
        </Snackbar>
      </MuiThemeProvider>
    </View>
  );
}
