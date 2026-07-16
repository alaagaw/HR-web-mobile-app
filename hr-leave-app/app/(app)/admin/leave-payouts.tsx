import { AccessGate } from '@/components/access/access-gate';
/**
 * HR Admin → Leave Payouts
 *
 * Two tabs, both keyed off the same month picker:
 *
 *   1. Forecast (from balance) — what-if planning tool. Uses each
 *      employee's CURRENT PTO balance as the default "days," lets HR
 *      override per-row, and supports an optional Start Date so HR
 *      can model a leave that spans into another month. All math is
 *      client-side so editing is live.
 *
 *   2. Actual (from approved leave) — payroll-processing tool. Uses
 *      approved leave_requests that fell inside the selected month.
 *      This is the number HR needs at end-of-month for the payroll
 *      ledger. Server-computed via compute_leave_payouts RPC.
 *
 * Both share the same payable formula:
 *     payable = component / 30 * days
 *
 * In Forecast, `days` is whatever HR types per row (with an optional
 * start_date that clips the leave to the selected month). In Actual,
 * `days` is the sum of approved leave-request days inside the month.
 *
 * Web-only (MUI DataGrid).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useViewState } from '@/hooks/use-view-state';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { compensationService } from '@/services';
import { EmptyState } from '@/components/ui/empty-state';
import { MobileCardList } from '@/components/ui/mobile-card-list';
import type { LeavePayoutRow, PredictedPayoutRow } from '@/types/models';

const isWeb = Platform.OS === 'web';

let MuiTextField: any, MuiButton: any, MuiAlert: any, Snackbar: any, MenuItem: any;
let Tabs: any, Tab: any;
let DataGrid: any, MuiThemeProvider: any;

if (isWeb) {
  MuiTextField = require('@mui/material/TextField').default;
  MuiButton = require('@mui/material/Button').default;
  MuiAlert = require('@mui/material/Alert').default;
  Snackbar = require('@mui/material/Snackbar').default;
  MenuItem = require('@mui/material/MenuItem').default;
  Tabs = require('@mui/material/Tabs').default;
  Tab = require('@mui/material/Tab').default;
  DataGrid = require('@mui/x-data-grid').DataGrid;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
}

/**
 * Days of the (possibly cross-month) forecast that fall inside the
 * selected month. Two modes — both driven by the GLOBAL inputs at
 * the top of the page (one Days + optional Start Date that applies
 * to every visible row):
 *
 *   - start_date empty: treat `days` as days-this-month, cap at the
 *     calendar days of the selected month so a typo of 999 doesn't
 *     produce a 33x monthly comp payout.
 *   - start_date set: overlap of [start_date, start_date + days - 1]
 *     with the selected month. Cross-month leaves split correctly
 *     when HR flips the month picker.
 *
 * `daysInCalendarMonth` is the # of days of the SELECTED month (28
 * for Feb 2026, 31 for May, etc.) — passed in so the function
 * doesn't have to recompute it per row.
 */
function computeDaysThisMonth(
  days: number,
  startDate: string,
  year: number,
  month: number,
  daysInCalendarMonth: number,
): number {
  const d = Number(days) || 0;
  if (d <= 0) return 0;
  if (!startDate) {
    return Math.min(d, daysInCalendarMonth || 30);
  }
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return 0;
  const end = new Date(start);
  end.setDate(end.getDate() + d - 1);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const overlapStart = start > monthStart ? start : monthStart;
  const overlapEnd = end < monthEnd ? end : monthEnd;
  if (overlapEnd < overlapStart) return 0;
  return Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1;
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
  return (
    <AccessGate resourceKey="page:admin/leave-payouts">
      <LeavePayoutsScreenInner />
    </AccessGate>
  );
}

function LeavePayoutsScreenInner() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isMobile } = useBreakpoint();

  const now = new Date();
  const [year, setYear] = useViewState<number>('admin/leave-payouts.year', now.getFullYear());
  const [month, setMonth] = useViewState<number>('admin/leave-payouts.month', now.getMonth() + 1);
  const [search, setSearch] = useViewState<string>('admin/leave-payouts.search', '');
  const [departmentFilter, setDepartmentFilter] = useViewState<string>('admin/leave-payouts.dept', '');

  // Tab state. Default to Forecast since that's the planning view HR
  // uses most often; Actual is for end-of-month payroll.
  const [activeTab, setActiveTab] = useViewState<'forecast' | 'actual'>(
    'admin/leave-payouts.tab',
    'forecast',
  );

  // Forecast tab inputs — GLOBAL across every visible row. Sticky via
  // useViewState so HR's typed values survive nav-away/come-back, and
  // both inputs are pre-filled with sensible defaults so the page
  // shows something meaningful on first open without HR doing anything.
  const [forecastDays, setForecastDays] = useViewState<number>(
    'admin/leave-payouts.forecast_days',
    0,
  );
  const [forecastStartDate, setForecastStartDate] = useViewState<string>(
    'admin/leave-payouts.forecast_start_date',
    '',
  );

  const [rows, setRows] = useState<LeavePayoutRow[]>([]);
  const [forecastRows, setForecastRows] = useState<PredictedPayoutRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
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

  const loadForecast = useCallback(async () => {
    setForecastLoading(true);
    try {
      const data = await compensationService.computePredictedPayouts(
        year,
        month,
        departmentFilter || undefined,
      );
      setForecastRows(data);
    } catch (err: any) {
      setSuccessMsg(`Forecast load failed: ${err.message || 'unknown'}`);
    } finally {
      setForecastLoading(false);
    }
  }, [year, month, departmentFilter]);

  // useAutoRefresh has a 30s staleness gate — it skips refetching if
  // the previous fetch was under 30s old, even when its deps change.
  // That's fine for the periodic polling it's designed for, but it
  // breaks "user changed a filter, refetch now". A plain useEffect
  // alongside it handles the immediate refresh on filter changes;
  // useAutoRefresh continues to do the 30s polling on top. This is
  // the pattern Manage Employees uses too.
  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => { void loadForecast(); }, [loadForecast]);
  useAutoRefresh(() => {
    void loadData();
    void loadForecast();
  }, [year, month, departmentFilter]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    // Take departments from whichever data set is loaded — both
    // tabs pull the same active-employees roster so they agree.
    for (const r of rows) if (r.department) set.add(r.department);
    for (const r of forecastRows) if (r.department) set.add(r.department);
    return Array.from(set).sort();
  }, [rows, forecastRows]);

  const filterByQuery = useCallback(<T extends { full_name: string; emp_code: string | null; department: string | null }>(
    list: T[],
  ): T[] => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      r.full_name.toLowerCase().includes(q) ||
      (r.emp_code || '').toLowerCase().includes(q) ||
      (r.department || '').toLowerCase().includes(q),
    );
  }, [search]);

  const filteredRows = useMemo(() => filterByQuery(rows), [rows, filterByQuery]);
  const filteredForecastRows = useMemo(() => filterByQuery(forecastRows), [forecastRows, filterByQuery]);

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

  // Days-in-month-overlap is the same number for every row (driven
  // by the GLOBAL inputs) once we know the calendar length of the
  // selected month. Compute it once per render.
  const daysInMonth = useMemo(() => {
    const last = new Date(year, month, 0);
    return last.getDate();
  }, [year, month]);

  const forecastDaysThisMonth = useMemo(() => {
    return computeDaysThisMonth(forecastDays, forecastStartDate, year, month, daysInMonth);
  }, [forecastDays, forecastStartDate, year, month, daysInMonth]);

  // Live totals for the Forecast tab. Recomputed when the global
  // inputs (or filter) change.
  const forecastTotals = useMemo(() => {
    const d = forecastDaysThisMonth;
    return filteredForecastRows.reduce(
      (acc, r) => {
        acc.days += d;
        acc.basic += Number(r.basic_salary) / 30 * d;
        acc.hra += Number(r.hra) / 30 * d;
        acc.transport += Number(r.transportation) / 30 * d;
        acc.other += Number(r.other_allowances) / 30 * d;
        acc.total += Number(r.total_monthly) / 30 * d;
        return acc;
      },
      { days: 0, basic: 0, hra: 0, transport: 0, other: 0, total: 0 },
    );
  }, [filteredForecastRows, forecastDaysThisMonth]);

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
      XLSX.utils.book_append_sheet(wb, ws, `Actual ${monthLabel(year, month)}`);
      const fname = `leave_payouts_actual_${year}_${String(month).padStart(2, '0')}.xlsx`;
      XLSX.writeFile(wb, fname);
      setSuccessMsg(`Exported ${out.length - 1} row(s) to ${fname}`);
    } catch (err: any) {
      setSuccessMsg(`Export failed: ${err.message || 'unknown'}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportForecast = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const d = forecastDaysThisMonth;
      const out = filteredForecastRows.map((r) => ({
        'Emp Code': r.emp_code || '',
        'Name': r.full_name,
        'Department': r.department || '',
        'Basic / mo': Number(r.basic_salary) || 0,
        'HRA / mo': Number(r.hra) || 0,
        'Transport / mo': Number(r.transportation) || 0,
        'Other / mo': Number(r.other_allowances) || 0,
        'Available Days': Number(r.pto_balance_days) || 0,
        // Same globals applied to every row. We keep them in the
        // export so HR has a paper trail of WHAT scenario produced
        // these numbers.
        'Forecast Start Date': forecastStartDate || '',
        'Forecast Days (input)': Number(forecastDays) || 0,
        'Days in Month': d,
        'Basic Payable': +(Number(r.basic_salary) / 30 * d).toFixed(2),
        'HRA Payable': +(Number(r.hra) / 30 * d).toFixed(2),
        'Transport Payable': +(Number(r.transportation) / 30 * d).toFixed(2),
        'Other Payable': +(Number(r.other_allowances) / 30 * d).toFixed(2),
        'TOTAL Payable': +(Number(r.total_monthly) / 30 * d).toFixed(2),
        'Effective From': r.effective_from || '',
      }));
      out.push({
        'Emp Code': '',
        'Name': 'TOTAL',
        'Department': '',
        'Basic / mo': 0,
        'HRA / mo': 0,
        'Transport / mo': 0,
        'Other / mo': 0,
        'Available Days': 0,
        'Forecast Start Date': '',
        'Forecast Days (input)': 0,
        'Days in Month': forecastTotals.days,
        'Basic Payable': +forecastTotals.basic.toFixed(2),
        'HRA Payable': +forecastTotals.hra.toFixed(2),
        'Transport Payable': +forecastTotals.transport.toFixed(2),
        'Other Payable': +forecastTotals.other.toFixed(2),
        'TOTAL Payable': +forecastTotals.total.toFixed(2),
        'Effective From': '',
      });
      const ws = XLSX.utils.json_to_sheet(out);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Forecast ${monthLabel(year, month)}`);
      const fname = `leave_payouts_forecast_${year}_${String(month).padStart(2, '0')}.xlsx`;
      XLSX.writeFile(wb, fname);
      setSuccessMsg(`Exported ${out.length - 1} forecast row(s) to ${fname}`);
    } catch (err: any) {
      setSuccessMsg(`Forecast export failed: ${err.message || 'unknown'}`);
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

  // Forecast columns — read-only display. Days + Start Date are
  // GLOBAL inputs at the top of the page; every row inherits the
  // same "days in month" number, so the pay columns are simple
  // multiplications of the row's comp by the shared days.
  const forecastColumns = useMemo(() => {
    const d = forecastDaysThisMonth;
    return [
      { field: 'emp_code', headerName: 'Emp #', width: 80,
        valueGetter: (_value: any, row: PredictedPayoutRow) => row.emp_code || '—' },
      { field: 'full_name', headerName: 'Employee', flex: 1.2, minWidth: 160 },
      { field: 'department', headerName: 'Dept', flex: 0.9, minWidth: 110,
        valueGetter: (_value: any, row: PredictedPayoutRow) => row.department || '—' },
      { field: 'basic_salary', headerName: 'Basic/mo', flex: 0.8, minWidth: 100, type: 'number',
        valueFormatter: (value: any) => formatMoney(Number(value) || 0) },
      { field: 'hra', headerName: 'HRA/mo', flex: 0.8, minWidth: 100, type: 'number',
        valueFormatter: (value: any) => formatMoney(Number(value) || 0) },
      { field: 'transportation', headerName: 'Transport/mo', flex: 0.8, minWidth: 100, type: 'number',
        valueFormatter: (value: any) => formatMoney(Number(value) || 0) },
      { field: 'pto_balance_days', headerName: 'Available Days', flex: 0.7, minWidth: 110, type: 'number',
        valueFormatter: (value: any) => Number(value || 0).toFixed(Number(value) % 1 !== 0 ? 2 : 0) },
      {
        field: 'basic_pay_forecast',
        headerName: 'Basic Pay',
        flex: 0.9, minWidth: 100, type: 'number',
        sortable: false,
        valueGetter: (_v: any, row: PredictedPayoutRow) => Number(row.basic_salary) / 30 * d,
        valueFormatter: (value: any) => formatMoney(Number(value) || 0),
        cellClassName: 'payable-cell',
      },
      {
        field: 'hra_pay_forecast',
        headerName: 'HRA Pay',
        flex: 0.9, minWidth: 100, type: 'number',
        sortable: false,
        valueGetter: (_v: any, row: PredictedPayoutRow) => Number(row.hra) / 30 * d,
        valueFormatter: (value: any) => formatMoney(Number(value) || 0),
        cellClassName: 'payable-cell',
      },
      {
        field: 'transport_pay_forecast',
        headerName: 'Transport Pay',
        flex: 0.9, minWidth: 110, type: 'number',
        sortable: false,
        valueGetter: (_v: any, row: PredictedPayoutRow) => Number(row.transportation) / 30 * d,
        valueFormatter: (value: any) => formatMoney(Number(value) || 0),
        cellClassName: 'payable-cell',
      },
      {
        field: 'total_pay_forecast',
        headerName: 'TOTAL',
        flex: 1, minWidth: 110, type: 'number',
        sortable: false,
        valueGetter: (_v: any, row: PredictedPayoutRow) => Number(row.total_monthly) / 30 * d,
        valueFormatter: (value: any) => formatMoney(Number(value) || 0),
        cellClassName: 'total-payable-cell',
      },
    ];
  }, [forecastDaysThisMonth]);

  if (!isWeb) {
    return (
      <EmptyState
        title="Web-only feature"
        description="Open Leave Payouts on a desktop browser to use the calculator."
      />
    );
  }

  // ─── Mobile web (< 1200px): stacked controls + card list ──────────
  if (isMobile) {
    const isForecast = activeTab === 'forecast';
    const data: any[] = isForecast ? filteredForecastRows : filteredRows;
    const d = forecastDaysThisMonth;
    const border = isDark ? '#334155' : '#E2E8F0';
    const cardBg = isDark ? '#111a2e' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
    const textMuted = isDark ? '#94A3B8' : '#64748B';
    const navBtn = { width: 34, height: 34, borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: textPrimary, cursor: 'pointer', fontSize: 16, fontWeight: 700 } as const;
    const inputStyle = { padding: '10px 12px', borderRadius: 10, border: `1px solid ${border}`, background: cardBg, color: textPrimary, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' as const, fontFamily: 'inherit' };
    const goBack = () => {
      if (typeof window !== 'undefined' && window.history.length > 1) window.history.back();
      else router.replace('/(app)/(tabs)/admin' as any);
    };

    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div style={{ padding: '10px 10px 8px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={goBack} aria-label="Back" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, display: 'flex' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={textPrimary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            </button>
            <div style={{ flex: 1, fontSize: 18, fontWeight: 700, color: textPrimary }}>Leave Payouts</div>
          </div>

          {/* Month nav + tabs */}
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <button onClick={() => stepMonth(-1)} style={navBtn}>‹</button>
              <div style={{ minWidth: 120, textAlign: 'center', fontWeight: 700, color: textPrimary }}>{monthLabel(year, month)}</div>
              <button onClick={() => stepMonth(1)} style={navBtn}>›</button>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['forecast', 'actual'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${activeTab === t ? '#2563EB' : border}`, background: activeTab === t ? (isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF') : 'transparent', color: activeTab === t ? '#2563EB' : textMuted, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  {t === 'forecast' ? 'Forecast' : 'Actual'}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, emp code, department…" style={inputStyle} />
            {isForecast && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" value={forecastDays || ''} onChange={(e) => setForecastDays(parseFloat(e.target.value) || 0)} placeholder="Days" style={{ ...inputStyle, flex: 1 }} />
                <input type="date" value={forecastStartDate} onChange={(e) => setForecastStartDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              </div>
            )}
          </div>

          {/* Totals */}
          <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${border}` }}>
            <div style={{ fontSize: 12, color: textMuted }}>
              {data.length} employees{isForecast ? ` · ${d.toFixed(d % 1 !== 0 ? 2 : 0)} days/each` : ` · ${totals.days.toFixed(totals.days % 1 !== 0 ? 2 : 0)} days`}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#2563EB' }}>
              {formatMoney(isForecast ? forecastTotals.total : totals.total)} SAR
            </div>
          </div>

          {/* Card list */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <MobileCardList
              data={data}
              keyExtractor={(r: any) => String(r.employee_id)}
              loading={isForecast ? forecastLoading : loading}
              emptyTitle="No employees"
              emptyDescription="Nobody matches the filters, or no compensation/leave data for this month."
              title={(r: any) => r.full_name}
              subtitle={(r: any) => `${r.emp_code || '—'} · ${r.department || '—'}`}
              right={(r: any) => (
                <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 13 }}>
                  {formatMoney(isForecast ? Number(r.total_monthly) / 30 * d : Number(r.total_payable) || 0)}
                </Text>
              )}
              rows={(r: any) =>
                isForecast
                  ? [
                      { label: 'Available days', value: `${Number(r.pto_balance_days || 0).toFixed(Number(r.pto_balance_days) % 1 !== 0 ? 2 : 0)}` },
                      { label: 'Basic pay', value: formatMoney(Number(r.basic_salary) / 30 * d) },
                      { label: 'HRA pay', value: formatMoney(Number(r.hra) / 30 * d) },
                      { label: 'Transport pay', value: formatMoney(Number(r.transportation) / 30 * d) },
                    ]
                  : [
                      { label: 'Days off', value: `${Number(r.days_in_month || 0).toFixed(Number(r.days_in_month) % 1 !== 0 ? 2 : 0)}` },
                      { label: 'Basic pay', value: formatMoney(Number(r.basic_payable) || 0) },
                      { label: 'HRA pay', value: formatMoney(Number(r.hra_payable) || 0) },
                      { label: 'Transport pay', value: formatMoney(Number(r.transport_payable) || 0) },
                    ]
              }
            />
          </div>

          {/* Export */}
          <div style={{ padding: 12, borderTop: `1px solid ${border}` }}>
            <button
              onClick={() => (isForecast ? handleExportForecast() : handleExport())}
              disabled={exporting || data.length === 0}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: exporting || data.length === 0 ? '#94A3B8' : '#2563EB', color: '#fff', fontWeight: 700, fontSize: 14, cursor: exporting || data.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              {exporting ? 'Exporting…' : isForecast ? 'Export Forecast' : 'Export Actual'}
            </button>
          </div>
        </div>

        {successMsg ? (
          <div
            onClick={() => setSuccessMsg('')}
            style={{ position: 'fixed', bottom: 16, left: 16, right: 16, background: '#16A34A', color: '#fff', padding: '10px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, textAlign: 'center', zIndex: 1000, cursor: 'pointer' }}
          >
            {successMsg}
          </div>
        ) : null}
      </View>
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
            {activeTab === 'forecast'
              ? 'What-if planning. Defaults to using each employee’s full PTO balance — edit Days and Start Date per row to model different scenarios.'
              : 'Payroll-ready. Uses approved leave-request days that fell inside the selected month.'}
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
          onClick={() => (activeTab === 'forecast' ? handleExportForecast() : handleExport())}
          disabled={
            exporting ||
            (activeTab === 'forecast' ? forecastLoading || filteredForecastRows.length === 0
                                       : loading || filteredRows.length === 0)
          }
          style={{
            padding: '10px 16px',
            backgroundColor: exporting ? '#94A3B8' : '#2563EB',
            color: '#FFFFFF', border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          }}
        >
          {exporting ? 'Exporting…' : activeTab === 'forecast' ? 'Export Forecast' : 'Export Actual'}
        </button>
      </div>

      {/* MuiThemeProvider wraps the filter row AND the DataGrid so
          every MUI component (TextField, Select popover, MenuItem,
          DataGrid, Snackbar) picks up the same dark/light/system
          theme as the rest of the app. Previously only the DataGrid
          was wrapped, which left the filter dropdown rendered with
          MUI's default white theme. */}
      <MuiThemeProvider isDark={isDark}>
        {/* Tabs — chooses which "view" of payouts to render. Both
            views share the same month picker, search and department
            filter so flipping between them is one click. */}
        <div style={{ paddingLeft: 16, paddingRight: 16, borderBottom: `1px solid ${isDark ? '#334155' : '#E2E8F0'}` }}>
          <Tabs
            value={activeTab}
            onChange={(_e: any, v: 'forecast' | 'actual') => setActiveTab(v)}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab value="forecast" label="Forecast (from balance)" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab value="actual" label="Actual (from approved leave)" sx={{ textTransform: 'none', fontWeight: 600 }} />
          </Tabs>
        </div>

        {/* Filters row — shared across tabs. */}
        <div style={{ padding: '12px 24px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${isDark ? '#334155' : '#E2E8F0'}` }}>
          <MuiTextField
            label="Search"
            size="small"
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            placeholder="Name, emp code, department…"
            sx={{ minWidth: 240 }}
          />
          <MuiTextField
            label="Department"
            size="small"
            select
            value={departmentFilter}
            onChange={(e: any) => setDepartmentFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value=""><em>(All departments)</em></MenuItem>
            {departments.map((d: string) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </MuiTextField>

          {/* Forecast-only global inputs. One Days and one Start Date
              applied to every visible row. Hidden on the Actual tab
              because that one doesn't take inputs. */}
          {activeTab === 'forecast' && (
            <>
              <div style={{ borderLeft: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`, height: 32, alignSelf: 'center' }} />
              <MuiTextField
                label="Forecast Days"
                size="small"
                type="number"
                value={forecastDays || ''}
                onChange={(e: any) => setForecastDays(parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0, max: 365, step: 0.5 }}
                placeholder="0"
                helperText="Days to apply to every row"
                sx={{ width: 140 }}
              />
              <MuiTextField
                label="Start Date (optional)"
                size="small"
                type="date"
                value={forecastStartDate}
                onChange={(e: any) => setForecastStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText={forecastStartDate ? 'Range mode: days span from here' : 'Empty = days within this month'}
                sx={{ width: 200 }}
              />
              {(forecastDays !== 0 || forecastStartDate) && (
                <MuiButton
                  size="small"
                  onClick={() => { setForecastDays(0); setForecastStartDate(''); }}
                  sx={{ textTransform: 'none' }}
                >
                  Clear
                </MuiButton>
              )}
            </>
          )}

          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#E2E8F0' : '#0F172A' }}>
            {activeTab === 'forecast' ? (
              <>
                {filteredForecastRows.length} employees · {forecastDaysThisMonth.toFixed(forecastDaysThisMonth % 1 !== 0 ? 2 : 0)} days/each · <span style={{ color: '#2563EB' }}>FORECAST TOTAL {formatMoney(forecastTotals.total)} SAR</span>
              </>
            ) : (
              <>
                {filteredRows.length} employees · {totals.days.toFixed(totals.days % 1 !== 0 ? 2 : 0)} days · <span style={{ color: '#2563EB' }}>ACTUAL TOTAL {formatMoney(totals.total)} SAR</span>
              </>
            )}
          </div>
        </div>

        <View style={{ flex: 1, padding: 16 }}>
          {activeTab === 'forecast' ? (
            filteredForecastRows.length === 0 && !forecastLoading ? (
              <EmptyState title="No employees" description="Either no employees match the filters, or compensation hasn't been entered yet." />
            ) : (
              <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
                <DataGrid
                  rows={filteredForecastRows}
                  columns={forecastColumns}
                  loading={forecastLoading}
                  getRowId={(r: any) => r.employee_id}
                  disableRowSelectionOnClick
                  density="compact"
                  pageSizeOptions={[25, 50, 100]}
                  initialState={{
                    pagination: { paginationModel: { pageSize: 50, page: 0 } },
                  }}
                  sx={{
                    border: 'none',
                    // Slightly taller rows so the inline inputs aren't
                    // squished. Compact density still applies elsewhere.
                    '& .MuiDataGrid-row': { minHeight: '42px !important' },
                    '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
                    '& .payable-cell': { fontWeight: 600 },
                    '& .total-payable-cell': { fontWeight: 700, color: '#2563EB' },
                  }}
                />
              </View>
            )
          ) : (
            filteredRows.length === 0 && !loading ? (
              <EmptyState title="No payouts for this month" description="Either nobody took approved leave or no compensation rows are in effect yet." />
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
            )
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
