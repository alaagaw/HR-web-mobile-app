import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { ScreenHeader } from '@/components/layout/screen-header';
import { useAuth } from '@/hooks/use-auth';
import { useTimesheets } from '@/hooks/use-timesheets';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useViewState } from '@/hooks/use-view-state';
import { format } from 'date-fns';
import {
  getDaysInMonth,
  isWeekend,
  splitRegularOvertime,
  buildConsolidatedGridRows,
} from '@/lib/timesheet-utils';
import type { ConsolidatedGridRow } from '@/lib/timesheet-utils';
import { Role } from '@/types/enums';

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

// ── Lazy-load MUI components only on web ──────────────────────
let MuiThemeProvider: any;
let Snackbar: any;
let Alert: any;

if (isWeb) {
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
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
// MAIN SCREEN — Monthly Consolidated View Only
// ============================================================

export default function TimesheetsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const windowWidth = useWindowWidth();
  const isWideScreen = isWeb && windowWidth >= WIDE_SCREEN_BREAKPOINT;

  // ── Hooks ─────────────────────────────────────────────────
  const {
    consolidatedEntries,
    consolidatedLoading,
    consolidatedError,
    monthlyHourSetting,
    fetchConsolidatedMonth,
    updateMonthlyHourSetting,
  } = useTimesheets();

  const { suppliers, fetchAll: fetchAllSuppliers } = useSuppliers();

  // ── Local state (Monthly) ────────────────────────────────
  const [monthlyMonth, setMonthlyMonth] = useViewState(
    'admin/timesheets.monthlyMonth',
    new Date().getMonth() + 1
  );
  const [monthlyYear, setMonthlyYear] = useViewState(
    'admin/timesheets.monthlyYear',
    new Date().getFullYear()
  );
  const [monthlySearch, setMonthlySearch] = useViewState('admin/timesheets.monthlySearch', '');
  const [monthlySupplierFilter, setMonthlySupplierFilter] = useViewState<string>(
    'admin/timesheets.monthlySupplierFilter',
    ''
  );
  const [regularHoursInput, setRegularHoursInput] = useState('8');
  const [showRegular, setShowRegular] = useViewState('admin/timesheets.showRegular', false);
  const [showOvertime, setShowOvertime] = useViewState('admin/timesheets.showOvertime', true);
  const [showAllMonthlyColumns, setShowAllMonthlyColumns] = useViewState(
    'admin/timesheets.showAllMonthlyColumns',
    false
  );

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // ── Month picker state ──────────────────────────────────
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(monthlyYear);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  // Close picker on click outside
  useEffect(() => {
    if (!isWeb || !showMonthPicker) return;
    const handler = (e: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setShowMonthPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMonthPicker]);

  // ── Monthly computed values ────────────────────────────────
  const regularLimit = monthlyHourSetting?.regular_hours_limit ?? 8;

  const monthlyGridRows = useMemo(
    () => buildConsolidatedGridRows(consolidatedEntries),
    [consolidatedEntries],
  );

  const monthDays = useMemo(() => {
    const total = getDaysInMonth(monthlyMonth, monthlyYear);
    return Array.from({ length: total }, (_, i) => {
      const day = i + 1;
      const dateStr = `${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(monthlyYear, monthlyMonth - 1, day);
      return {
        day,
        dateStr,
        dayShort: format(d, 'EEE'),
        isWeekend: isWeekend(day, monthlyMonth, monthlyYear),
      };
    });
  }, [monthlyMonth, monthlyYear]);

  const monthLabel = useMemo(
    () => format(new Date(monthlyYear, monthlyMonth - 1), 'MMMM yyyy'),
    [monthlyMonth, monthlyYear],
  );

  // Filtered rows (search + supplier)
  const filteredMonthlyRows = useMemo(() => {
    let rows = monthlyGridRows;
    if (monthlySearch.trim()) {
      const q = monthlySearch.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.employee_name.toLowerCase().includes(q) ||
          (r.employee_number && r.employee_number.toLowerCase().includes(q)) ||
          (r.designation && r.designation.toLowerCase().includes(q)),
      );
    }
    if (monthlySupplierFilter) {
      rows = rows.filter((r) => r.supplier_id === monthlySupplierFilter);
    }
    return rows;
  }, [monthlyGridRows, monthlySearch, monthlySupplierFilter]);

  // ── Data fetching ─────────────────────────────────────────

  useEffect(() => {
    fetchAllSuppliers();
  }, []);

  // Fetch consolidated data when month changes
  useEffect(() => {
    fetchConsolidatedMonth(monthlyMonth, monthlyYear);
  }, [monthlyMonth, monthlyYear]);

  // Sync regularHoursInput when setting loads
  useEffect(() => {
    setRegularHoursInput(String(monthlyHourSetting?.regular_hours_limit ?? 8));
  }, [monthlyHourSetting]);

  // ── Monthly navigation ──────────────────────────────────────

  const goToPrevMonth = useCallback(() => {
    setMonthlyMonth((prev) => {
      if (prev === 1) {
        setMonthlyYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonthlyMonth((prev) => {
      if (prev === 12) {
        setMonthlyYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  }, []);

  const jumpToMonth = useCallback((month: number, year: number) => {
    setMonthlyMonth(month);
    setMonthlyYear(year);
    setShowMonthPicker(false);
  }, []);

  const handleSetRegularHours = useCallback(async () => {
    if (!user) return;
    const val = parseFloat(regularHoursInput);
    if (isNaN(val) || val < 0 || val > 24) return;
    try {
      await updateMonthlyHourSetting(monthlyMonth, monthlyYear, val, user.id);
      setSnackbar({ open: true, message: `Regular hours set to ${val}h`, severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to update setting', severity: 'error' });
    }
  }, [user, regularHoursInput, monthlyMonth, monthlyYear, updateMonthlyHourSetting]);

  // Excel export for monthly consolidated view (styled, matching the HTML table)
  const handleExportMonthlyExcel = useCallback(async () => {
    if (filteredMonthlyRows.length === 0) return;
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Consolidated Hours', {
      views: [{ state: 'frozen', xSplit: 5, ySplit: 2 }],
    });

    // ── Style constants (typed as 'any' since ExcelJS is dynamically imported) ──
    const fill = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });
    const headerFill = fill('1A2744');
    const weekendFill = fill('2D1B3D');
    const totalRowFill = fill('0F1729');
    const summaryFill = fill('162036');
    const sheetBg = fill('0F172A');
    const headerFont = { bold: true, size: 10, color: { argb: 'F8FAFC' } };
    const subHeaderFont = { bold: false, size: 9, color: { argb: 'CBD5E1' } };
    const otFont = { bold: false, size: 9, color: { argb: 'F59E0B' } };
    const dataFont = { size: 10, color: { argb: 'F8FAFC' } };
    const otDataFont = { size: 10, color: { argb: 'F59E0B' } };
    const boldDataFont = { bold: true, size: 10, color: { argb: 'F8FAFC' } };
    const primaryFont = { bold: true, size: 10, color: { argb: '3B82F6' } };
    const thinBorder = { style: 'thin' as const, color: { argb: '334155' } };
    const cellBorder = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
    const centerAlign = { horizontal: 'center' as const, vertical: 'middle' as const };
    const leftAlign = { horizontal: 'left' as const, vertical: 'middle' as const };

    // ── Column layout ──
    const LEFT_COLS = 5; // #, Employee, Emp #, Designation, Supplier
    const dayCols = monthDays.length * 2; // R + OT per day

    // Set column widths
    ws.getColumn(1).width = 5;   // #
    ws.getColumn(2).width = 22;  // Employee
    ws.getColumn(3).width = 10;  // Emp #
    ws.getColumn(4).width = 16;  // Designation
    ws.getColumn(5).width = 16;  // Supplier
    for (let i = 0; i < monthDays.length; i++) {
      ws.getColumn(LEFT_COLS + 1 + i * 2).width = 5;      // R
      ws.getColumn(LEFT_COLS + 1 + i * 2 + 1).width = 5;  // OT
    }
    ws.getColumn(LEFT_COLS + dayCols + 1).width = 8;  // Total R
    ws.getColumn(LEFT_COLS + dayCols + 2).width = 8;  // Total OT
    ws.getColumn(LEFT_COLS + dayCols + 3).width = 9;  // Grand Total

    // ── ROW 1: Main headers ──
    const row1 = ws.getRow(1);
    row1.height = 24;
    // Left headers (merge rows 1-2)
    const leftHeaders = ['#', 'Employee', 'Emp #', 'Designation', 'Supplier'];
    leftHeaders.forEach((label, i) => {
      const cell = row1.getCell(i + 1);
      cell.value = label;
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.border = cellBorder;
      cell.alignment = i === 0 ? centerAlign : leftAlign;
      ws.mergeCells(1, i + 1, 2, i + 1); // merge row 1-2
    });

    // Day headers (merge R+OT columns)
    monthDays.forEach((md, i) => {
      const col = LEFT_COLS + 1 + i * 2;
      const cell = row1.getCell(col);
      cell.value = `${md.dayShort.toUpperCase()} ${md.day}`;
      cell.font = headerFont;
      cell.fill = md.isWeekend ? weekendFill : headerFill;
      cell.border = cellBorder;
      cell.alignment = centerAlign;
      ws.mergeCells(1, col, 1, col + 1); // merge across R + OT
      // Also style the merged partner cell
      const cell2 = row1.getCell(col + 1);
      cell2.fill = md.isWeekend ? weekendFill : headerFill;
      cell2.border = cellBorder;
    });

    // Summary headers (merge rows 1-2)
    const summaryHeaders = ['Total R', 'Total OT', 'Grand Total'];
    summaryHeaders.forEach((label, i) => {
      const col = LEFT_COLS + dayCols + 1 + i;
      const cell = row1.getCell(col);
      cell.value = label;
      cell.font = i === 2 ? primaryFont : (i === 1 ? { ...headerFont, color: { argb: 'F59E0B' } } : headerFont);
      cell.fill = summaryFill;
      cell.border = cellBorder;
      cell.alignment = centerAlign;
      ws.mergeCells(1, col, 2, col); // merge rows 1-2
    });

    // ── ROW 2: Sub-headers (R | OT under each day) ──
    const row2 = ws.getRow(2);
    row2.height = 18;
    monthDays.forEach((md, i) => {
      const rCol = LEFT_COLS + 1 + i * 2;
      const otCol = rCol + 1;
      const rCell = row2.getCell(rCol);
      rCell.value = 'R';
      rCell.font = subHeaderFont;
      rCell.fill = md.isWeekend ? weekendFill : headerFill;
      rCell.border = cellBorder;
      rCell.alignment = centerAlign;
      const otCell = row2.getCell(otCol);
      otCell.value = 'OT';
      otCell.font = otFont;
      otCell.fill = md.isWeekend ? weekendFill : headerFill;
      otCell.border = cellBorder;
      otCell.alignment = centerAlign;
    });

    // ── DATA ROWS ──
    filteredMonthlyRows.forEach((row, idx) => {
      const excelRow = ws.getRow(3 + idx);
      excelRow.height = 22;
      let rowTotalR = 0;
      let rowTotalOT = 0;

      // Left columns
      const leftVals = [idx + 1, row.employee_name, row.employee_number || '', row.designation || '', row.supplier_name || ''];
      leftVals.forEach((val, i) => {
        const cell = excelRow.getCell(i + 1);
        cell.value = val;
        cell.font = i === 1 ? boldDataFont : dataFont;
        cell.fill = sheetBg;
        cell.border = cellBorder;
        cell.alignment = i === 0 ? centerAlign : leftAlign;
      });

      // Day columns
      monthDays.forEach((md, i) => {
        const total = row.dailyHours[md.dateStr] || 0;
        const { regular, overtime } = splitRegularOvertime(total, regularLimit);
        rowTotalR += regular;
        rowTotalOT += overtime;

        const rCol = LEFT_COLS + 1 + i * 2;
        const rCell = excelRow.getCell(rCol);
        rCell.value = regular || null;
        rCell.font = dataFont;
        rCell.fill = md.isWeekend ? weekendFill : sheetBg;
        rCell.border = cellBorder;
        rCell.alignment = centerAlign;

        const otCell = excelRow.getCell(rCol + 1);
        otCell.value = overtime || null;
        otCell.font = otDataFont;
        otCell.fill = md.isWeekend ? weekendFill : sheetBg;
        otCell.border = cellBorder;
        otCell.alignment = centerAlign;
      });

      // Summary columns
      const summaryVals = [rowTotalR, rowTotalOT, rowTotalR + rowTotalOT];
      summaryVals.forEach((val, i) => {
        const cell = excelRow.getCell(LEFT_COLS + dayCols + 1 + i);
        cell.value = val || null;
        cell.font = i === 2 ? primaryFont : (i === 1 ? { ...boldDataFont, color: { argb: 'F59E0B' } } : boldDataFont);
        cell.fill = summaryFill;
        cell.border = cellBorder;
        cell.alignment = centerAlign;
      });
    });

    // ── TOTALS ROW ──
    const totalsRowNum = 3 + filteredMonthlyRows.length;
    const totalsRow = ws.getRow(totalsRowNum);
    totalsRow.height = 24;

    // Left: "Totals" label
    const tCell = totalsRow.getCell(1);
    tCell.value = '';
    tCell.fill = totalRowFill;
    tCell.border = cellBorder;
    const tLabelCell = totalsRow.getCell(2);
    tLabelCell.value = 'Totals';
    tLabelCell.font = { ...boldDataFont, size: 11 };
    tLabelCell.fill = totalRowFill;
    tLabelCell.border = cellBorder;
    tLabelCell.alignment = leftAlign;
    for (let i = 3; i <= LEFT_COLS; i++) {
      const c = totalsRow.getCell(i);
      c.fill = totalRowFill;
      c.border = cellBorder;
    }

    // Day column totals
    let grandR = 0;
    let grandOT = 0;
    monthDays.forEach((md, i) => {
      let colR = 0;
      let colOT = 0;
      for (const r of filteredMonthlyRows) {
        const { regular, overtime } = splitRegularOvertime(r.dailyHours[md.dateStr] || 0, regularLimit);
        colR += regular;
        colOT += overtime;
      }
      grandR += colR;
      grandOT += colOT;

      const rCol = LEFT_COLS + 1 + i * 2;
      const rCell = totalsRow.getCell(rCol);
      rCell.value = colR || null;
      rCell.font = boldDataFont;
      rCell.fill = totalRowFill;
      rCell.border = cellBorder;
      rCell.alignment = centerAlign;

      const otCell = totalsRow.getCell(rCol + 1);
      otCell.value = colOT || null;
      otCell.font = { ...boldDataFont, color: { argb: 'F59E0B' } };
      otCell.fill = totalRowFill;
      otCell.border = cellBorder;
      otCell.alignment = centerAlign;
    });

    // Summary totals
    const summaryTotals = [grandR, grandOT, grandR + grandOT];
    summaryTotals.forEach((val, i) => {
      const cell = totalsRow.getCell(LEFT_COLS + dayCols + 1 + i);
      cell.value = val || null;
      cell.font = i === 2 ? { ...primaryFont, size: 11 } : (i === 1 ? { ...boldDataFont, color: { argb: 'F59E0B' } } : boldDataFont);
      cell.fill = totalRowFill;
      cell.border = cellBorder;
      cell.alignment = centerAlign;
    });

    // ── Generate and download ──
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consolidated-${monthLabel.replace(/\s+/g, '_')}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredMonthlyRows, monthDays, regularLimit, monthLabel]);

  // ============================================================
  // WEB RENDER (wide screens)
  // ============================================================

  if (isWideScreen) {
    // Table styles
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

    const weekendBg = '#0d1525';
    const totalRowBg = '#0d1525';

    return (
      <View style={{ flex: 1, backgroundColor: isDark ? DT.bgMain : '#F8FAFC' }}>
        {/* ── Page Header ────────────────────────────────── */}
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
              Monthly Consolidated
            </div>
            <div style={{ fontSize: 13, color: isDark ? DT.textSecondary : DT.textMuted, marginTop: 2 }}>
              Cross-project consolidated employee hours with regular/overtime breakdown
            </div>
          </div>
        </div>

        {/* ── Content Area ───────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>

          {/* ── Toolbar row 1: Month nav + Regular hours + Supplier ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              paddingBottom: 12,
            }}
          >
            {/* Month navigation */}
            <button
              onClick={goToPrevMonth}
              style={{
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${DT.border}`, borderRadius: 8, backgroundColor: DT.cardBg, color: DT.textPrimary, cursor: 'pointer', fontSize: 16,
              }}
            >
              {'<'}
            </button>

            {/* Clickable month label with dropdown picker */}
            <div style={{ position: 'relative' }} ref={monthPickerRef as any}>
              <button
                onClick={() => { setPickerYear(monthlyYear); setShowMonthPicker((v) => !v); }}
                style={{
                  fontSize: 15, fontWeight: 700, color: DT.textPrimary, minWidth: 160, textAlign: 'center',
                  padding: '8px 16px', backgroundColor: DT.cardBg, border: `1px solid ${showMonthPicker ? DT.primary : DT.border}`, borderRadius: 8,
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
              >
                {monthLabel}
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ marginLeft: 8, verticalAlign: 'middle' }}>
                  <path d="M1 1L5 5L9 1" stroke={DT.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {showMonthPicker && (
                <div
                  style={{
                    position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                    marginTop: 6, zIndex: 50,
                    width: 280, padding: 12,
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                    borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                  }}
                >
                  {/* Year selector */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <button
                      onClick={() => setPickerYear((y) => y - 1)}
                      style={{
                        width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`, borderRadius: 6,
                        backgroundColor: 'transparent', color: DT.textPrimary, cursor: 'pointer', fontSize: 14,
                      }}
                    >
                      {'<'}
                    </button>
                    <span style={{ fontSize: 15, fontWeight: 700, color: isDark ? DT.textPrimary : '#0F172A' }}>
                      {pickerYear}
                    </span>
                    <button
                      onClick={() => setPickerYear((y) => y + 1)}
                      style={{
                        width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`, borderRadius: 6,
                        backgroundColor: 'transparent', color: DT.textPrimary, cursor: 'pointer', fontSize: 14,
                      }}
                    >
                      {'>'}
                    </button>
                  </div>

                  {/* Month grid (4 rows x 3 cols) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                    {(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const).map((label, idx) => {
                      const m = idx + 1;
                      const isSelected = m === monthlyMonth && pickerYear === monthlyYear;
                      const isCurrent = m === new Date().getMonth() + 1 && pickerYear === new Date().getFullYear();
                      return (
                        <button
                          key={label}
                          onClick={() => jumpToMonth(m, pickerYear)}
                          style={{
                            padding: '8px 4px', fontSize: 13, fontWeight: isSelected ? 700 : 500,
                            borderRadius: 8, border: 'none', cursor: 'pointer',
                            backgroundColor: isSelected
                              ? DT.primary
                              : 'transparent',
                            color: isSelected
                              ? '#FFFFFF'
                              : isCurrent
                                ? DT.primary
                                : isDark ? '#CBD5E1' : '#334155',
                            outline: isCurrent && !isSelected ? `1px dashed ${DT.primary}` : 'none',
                            transition: 'all 0.12s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) (e.target as HTMLButtonElement).style.backgroundColor = isDark ? '#334155' : '#F1F5F9';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick actions */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${isDark ? '#334155' : '#E2E8F0'}` }}>
                    <button
                      onClick={() => jumpToMonth(new Date().getMonth() + 1, new Date().getFullYear())}
                      style={{
                        flex: 1, padding: '6px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                        border: `1px solid ${DT.primary}40`, backgroundColor: `${DT.primary}15`,
                        color: DT.primary, cursor: 'pointer',
                      }}
                    >
                      This Month
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={goToNextMonth}
              style={{
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${DT.border}`, borderRadius: 8, backgroundColor: DT.cardBg, color: DT.textPrimary, cursor: 'pointer', fontSize: 16,
              }}
            >
              {'>'}
            </button>

            <div style={{ width: 1, height: 28, backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />

            {/* Regular hours setting */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: DT.textSecondary }}>Regular hrs/day:</span>
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={regularHoursInput}
                onChange={(e) => setRegularHoursInput(e.target.value)}
                style={{
                  width: 56, height: 32, textAlign: 'center', fontSize: 13, fontWeight: 600,
                  border: `1px solid ${DT.border}`, borderRadius: 6, backgroundColor: DT.cardBg, color: DT.textPrimary, outline: 'none',
                }}
              />
              <button
                onClick={handleSetRegularHours}
                style={{
                  padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                  border: `1px solid ${DT.primary}40`, backgroundColor: `${DT.primary}20`, color: DT.primary, cursor: 'pointer',
                }}
              >
                Set
              </button>
            </div>

            <div style={{ width: 1, height: 28, backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />

            {/* Supplier filter */}
            <select
              value={monthlySupplierFilter}
              onChange={(e) => setMonthlySupplierFilter(e.target.value)}
              style={{
                padding: '7px 12px', fontSize: 12, fontWeight: 600, border: `1px solid ${DT.border}`, borderRadius: 8,
                backgroundColor: DT.cardBg, color: DT.textPrimary, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <div style={{ width: 1, height: 28, backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />

            {/* Export Excel */}
            <button
              onClick={handleExportMonthlyExcel}
              disabled={filteredMonthlyRows.length === 0}
              style={{
                padding: '7px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                color: isDark ? '#CBD5E1' : '#334155',
                cursor: filteredMonthlyRows.length === 0 ? 'not-allowed' : 'pointer',
                opacity: filteredMonthlyRows.length === 0 ? 0.5 : 1,
                transition: 'all 0.12s ease',
              }}
            >
              Export Excel
            </button>
          </div>

          {/* ── Toolbar row 2: Search + R/OT toggles + Show All Columns ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              paddingBottom: 16,
            }}
          >
            {/* Search with magnifying glass */}
            <div style={{ position: 'relative', width: 260 }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={DT.textMuted}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search employee, number, designation..."
                value={monthlySearch}
                onChange={(e) => setMonthlySearch(e.target.value)}
                style={{
                  width: '100%', padding: '7px 12px 7px 34px', fontSize: 13, border: `1px solid ${DT.border}`, borderRadius: 8,
                  backgroundColor: DT.cardBg, color: DT.textPrimary, outline: 'none',
                }}
              />
            </div>

            <div style={{ width: 1, height: 28, backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />

            {/* R/OT toggle buttons */}
            <button
              onClick={() => setShowRegular(!showRegular)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8,
                border: `1px solid ${showRegular ? DT.primary : DT.border}`,
                backgroundColor: showRegular ? (isDark ? '#1E3A5F' : '#DBEAFE') : (isDark ? '#1E293B' : '#FFFFFF'),
                color: showRegular ? '#2563EB' : (isDark ? '#CBD5E1' : '#334155'),
                cursor: 'pointer', transition: 'all 0.12s ease',
              }}
            >
              {showRegular ? 'Hide R' : 'Show R'}
            </button>
            <button
              onClick={() => setShowOvertime(!showOvertime)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8,
                border: `1px solid ${showOvertime ? '#D97706' : DT.border}`,
                backgroundColor: showOvertime ? (isDark ? '#78350F' : '#FEF3C7') : (isDark ? '#1E293B' : '#FFFFFF'),
                color: showOvertime ? '#F59E0B' : (isDark ? '#CBD5E1' : '#334155'),
                cursor: 'pointer', transition: 'all 0.12s ease',
              }}
            >
              {showOvertime ? 'Hide OT' : 'Show OT'}
            </button>

            <div style={{ width: 1, height: 28, backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />

            {/* Show All Columns */}
            <button
              onClick={() => setShowAllMonthlyColumns(!showAllMonthlyColumns)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8,
                border: `1px solid ${showAllMonthlyColumns ? DT.primary : DT.border}`,
                backgroundColor: showAllMonthlyColumns ? (isDark ? '#1E3A5F' : '#DBEAFE') : (isDark ? '#1E293B' : '#FFFFFF'),
                color: showAllMonthlyColumns ? '#2563EB' : (isDark ? '#CBD5E1' : '#334155'),
                cursor: 'pointer', transition: 'all 0.12s ease',
              }}
            >
              {showAllMonthlyColumns ? 'Hide Extra Columns' : 'Show All Columns'}
            </button>

            <div style={{ flex: 1 }} />

            <span style={{ fontSize: 13, color: isDark ? '#64748B' : '#94A3B8' }}>
              {filteredMonthlyRows.length} {filteredMonthlyRows.length === 1 ? 'employee' : 'employees'}
            </span>
          </div>

          {/* ── Consolidated Grid ── */}
          {consolidatedLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: DT.textSecondary }}>
              Loading consolidated data...
            </div>
          ) : consolidatedError ? (
            <div style={{ textAlign: 'center', padding: 40, color: DT.danger }}>
              {consolidatedError}
            </div>
          ) : filteredMonthlyRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: isDark ? '#64748B' : '#94A3B8', fontSize: 15 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>--</div>
              <div style={{ fontWeight: 600, fontSize: 17, color: isDark ? '#F8FAFC' : '#0F172A', marginBottom: 8 }}>
                No timesheet data
              </div>
              <div>No entries found for {monthLabel}</div>
            </div>
          ) : (
            <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${DT.border}`, marginBottom: 16 }}>
              <div style={{ display: 'flex', overflow: 'hidden' }}>
                {/* LEFT: Employee Info (frozen)
                    Right thead is 28 (day name row) + 22 (R/OT sub-row) = 50px.
                    Same pattern as timesheet-entry: rowSpan={2} + explicit
                    height holds against table-layout's height-as-hint
                    behavior, with a bare follow-up tr as the rowSpan slot. */}
                <div style={{ flexShrink: 0 }}>
                  <table style={{ ...tableStyle, borderRadius: 0 }}>
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{ ...thCenterStyle, width: 36, height: 50, verticalAlign: 'middle' }}>#</th>
                        <th rowSpan={2} style={{ ...thStyle, minWidth: 150, height: 50, verticalAlign: 'middle' }}>Employee</th>
                        <th rowSpan={2} style={{ ...thStyle, minWidth: 80, height: 50, verticalAlign: 'middle' }}>Emp #</th>
                        {showAllMonthlyColumns && (
                          <>
                            <th rowSpan={2} style={{ ...thStyle, minWidth: 120, height: 50, verticalAlign: 'middle' }}>Designation</th>
                            <th rowSpan={2} style={{ ...thStyle, minWidth: 120, height: 50, verticalAlign: 'middle' }}>Supplier</th>
                          </>
                        )}
                      </tr>
                      <tr />
                    </thead>
                    <tbody>
                      {filteredMonthlyRows.map((row, idx) => (
                        <tr key={row.employee_key}>
                          <td style={{ ...tdStyle, textAlign: 'center', color: DT.textMuted, fontSize: 12, height: 40 }}>
                            {idx + 1}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 600, paddingLeft: 10, height: 40, whiteSpace: 'nowrap' }}>
                            {row.employee_name}
                          </td>
                          <td style={{ ...tdStyle, color: DT.textSecondary, paddingLeft: 10, height: 40, fontSize: 12 }}>
                            {row.employee_number || '\u2014'}
                          </td>
                          {showAllMonthlyColumns && (
                            <>
                              <td style={{ ...tdStyle, color: DT.textSecondary, paddingLeft: 10, height: 40, fontSize: 12 }}>
                                {row.designation || '\u2014'}
                              </td>
                              <td style={{ ...tdStyle, color: DT.textSecondary, paddingLeft: 10, height: 40, fontSize: 12 }}>
                                {row.supplier_name || '\u2014'}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                      {/* Total row */}
                      <tr style={{ backgroundColor: totalRowBg }}>
                        <td style={{ ...tdStyle, height: 40 }} />
                        <td
                          colSpan={showAllMonthlyColumns ? 4 : 2}
                          style={{ ...tdStyle, fontWeight: 700, paddingLeft: 10, fontSize: 13, height: 40 }}
                        >
                          Totals
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* DIVIDER */}
                <div style={{ width: 2, flexShrink: 0, backgroundColor: `${DT.primary}50` }} />

                {/* RIGHT: Day columns (scrollable) */}
                <div style={{ flex: 1, overflowX: 'auto' }}>
                  <table style={{ ...tableStyle, borderRadius: 0 }}>
                    <thead>
                      {/* Row 1: Day name + number */}
                      <tr>
                        {monthDays.map((md) => {
                          const subCols = (showRegular && showOvertime) ? 2 : 1;
                          return (
                            <th
                              key={md.dateStr}
                              colSpan={subCols}
                              style={{
                                ...thCenterStyle,
                                minWidth: subCols === 2 ? 64 : 36,
                                height: 28,
                                verticalAlign: 'middle',
                                backgroundColor: md.isWeekend ? weekendBg : '#1a2744',
                                borderLeft: `1px solid ${DT.border}`,
                              }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 600 }}>{md.dayShort.toUpperCase()}</div>
                              <div style={{ fontSize: 10, fontWeight: 400, marginTop: 1 }}>{md.day}</div>
                            </th>
                          );
                        })}
                        {/* Summary headers */}
                        {showRegular && (
                          <th style={{ ...thCenterStyle, minWidth: 48, height: 28, verticalAlign: 'middle', borderLeft: `2px solid ${DT.primary}40` }}>
                            <div style={{ fontSize: 10 }}>TOT</div>
                            <div style={{ fontSize: 9, fontWeight: 400 }}>REG</div>
                          </th>
                        )}
                        {showOvertime && (
                          <th style={{ ...thCenterStyle, minWidth: 48, height: 28, verticalAlign: 'middle', borderLeft: showRegular ? undefined : `2px solid ${DT.primary}40` }}>
                            <div style={{ fontSize: 10 }}>TOT</div>
                            <div style={{ fontSize: 9, fontWeight: 400, color: '#F59E0B' }}>OT</div>
                          </th>
                        )}
                        <th style={{ ...thCenterStyle, minWidth: 52, height: 28, verticalAlign: 'middle', borderLeft: `2px solid ${DT.primary}40` }}>
                          <div style={{ fontSize: 10 }}>GRAND</div>
                        </th>
                      </tr>
                      {/* Row 2: R | OT sub-headers */}
                      <tr>
                        {monthDays.map((md) => {
                          if (showRegular && showOvertime) {
                            return (
                              <React.Fragment key={`sub-${md.dateStr}`}>
                                <th style={{ ...thCenterStyle, width: 32, height: 22, fontSize: 9, padding: '2px 0', backgroundColor: md.isWeekend ? weekendBg : '#1a2744', borderLeft: `1px solid ${DT.border}` }}>
                                  R
                                </th>
                                <th style={{ ...thCenterStyle, width: 32, height: 22, fontSize: 9, padding: '2px 0', color: '#F59E0B', backgroundColor: md.isWeekend ? weekendBg : '#1a2744' }}>
                                  OT
                                </th>
                              </React.Fragment>
                            );
                          }
                          // Single column — no sub-label needed
                          return (
                            <th
                              key={`sub-${md.dateStr}`}
                              style={{
                                ...thCenterStyle, width: 36, height: 22, fontSize: 9, padding: '2px 0',
                                backgroundColor: md.isWeekend ? weekendBg : '#1a2744',
                                borderLeft: `1px solid ${DT.border}`,
                                color: showOvertime ? '#F59E0B' : undefined,
                              }}
                            >
                              {showOvertime ? 'OT' : 'R'}
                            </th>
                          );
                        })}
                        {showRegular && <th style={{ height: 22, borderLeft: `2px solid ${DT.primary}40` }} />}
                        {showOvertime && <th style={{ height: 22, borderLeft: showRegular ? undefined : `2px solid ${DT.primary}40` }} />}
                        <th style={{ height: 22, borderLeft: `2px solid ${DT.primary}40` }} />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMonthlyRows.map((row) => {
                        let rowTotalR = 0;
                        let rowTotalOT = 0;
                        return (
                          <tr key={row.employee_key}>
                            {monthDays.map((md) => {
                              const total = row.dailyHours[md.dateStr] || 0;
                              const { regular, overtime } = splitRegularOvertime(total, regularLimit);
                              rowTotalR += regular;
                              rowTotalOT += overtime;

                              if (showRegular && showOvertime) {
                                return (
                                  <React.Fragment key={md.dateStr}>
                                    <td style={{ ...tdStyle, textAlign: 'center', height: 40, fontSize: 12, backgroundColor: md.isWeekend ? weekendBg : undefined, borderLeft: `1px solid ${DT.border}`, color: regular > 0 ? DT.textPrimary : '#334155' }}>
                                      {regular || ''}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center', height: 40, fontSize: 12, backgroundColor: md.isWeekend ? weekendBg : undefined, color: overtime > 0 ? DT.warning : '#334155' }}>
                                      {overtime || ''}
                                    </td>
                                  </React.Fragment>
                                );
                              }
                              const val = showOvertime ? overtime : regular;
                              return (
                                <td
                                  key={md.dateStr}
                                  style={{
                                    ...tdStyle, textAlign: 'center', height: 40, fontSize: 12,
                                    backgroundColor: md.isWeekend ? weekendBg : undefined,
                                    borderLeft: `1px solid ${DT.border}`,
                                    color: val > 0 ? (showOvertime ? DT.warning : DT.textPrimary) : '#334155',
                                  }}
                                >
                                  {val || ''}
                                </td>
                              );
                            })}
                            {showRegular && (
                              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 12, height: 40, borderLeft: `2px solid ${DT.primary}40`, color: DT.textPrimary }}>
                                {rowTotalR}
                              </td>
                            )}
                            {showOvertime && (
                              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 12, height: 40, borderLeft: showRegular ? undefined : `2px solid ${DT.primary}40`, color: DT.warning }}>
                                {rowTotalOT}
                              </td>
                            )}
                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 13, height: 40, borderLeft: `2px solid ${DT.primary}40`, color: DT.primary }}>
                              {rowTotalR + rowTotalOT}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Column totals row */}
                      <tr style={{ backgroundColor: totalRowBg }}>
                        {monthDays.map((md) => {
                          let colR = 0;
                          let colOT = 0;
                          for (const r of filteredMonthlyRows) {
                            const { regular, overtime } = splitRegularOvertime(r.dailyHours[md.dateStr] || 0, regularLimit);
                            colR += regular;
                            colOT += overtime;
                          }
                          if (showRegular && showOvertime) {
                            return (
                              <React.Fragment key={`tot-${md.dateStr}`}>
                                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 11, height: 40, borderLeft: `1px solid ${DT.border}` }}>{colR || ''}</td>
                                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 11, height: 40, color: DT.warning }}>{colOT || ''}</td>
                              </React.Fragment>
                            );
                          }
                          const val = showOvertime ? colOT : colR;
                          return (
                            <td
                              key={`tot-${md.dateStr}`}
                              style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 11, height: 40, borderLeft: `1px solid ${DT.border}`, color: showOvertime ? DT.warning : undefined }}
                            >
                              {val || ''}
                            </td>
                          );
                        })}
                        {(() => {
                          let grandR = 0;
                          let grandOT = 0;
                          for (const r of filteredMonthlyRows) {
                            for (const md of monthDays) {
                              const { regular, overtime } = splitRegularOvertime(r.dailyHours[md.dateStr] || 0, regularLimit);
                              grandR += regular;
                              grandOT += overtime;
                            }
                          }
                          return (
                            <>
                              {showRegular && (
                                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 12, height: 40, borderLeft: `2px solid ${DT.primary}40` }}>{grandR}</td>
                              )}
                              {showOvertime && (
                                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 12, height: 40, color: DT.warning, borderLeft: showRegular ? undefined : `2px solid ${DT.primary}40` }}>{grandOT}</td>
                              )}
                              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, fontSize: 13, height: 40, borderLeft: `2px solid ${DT.primary}40`, color: DT.primary }}>{grandR + grandOT}</td>
                            </>
                          );
                        })()}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Snackbar ─────────────────────────── */}
        {isWeb && (
          <MuiThemeProvider isDark={isDark}>
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
  // MOBILE RENDER
  // ============================================================

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-[#0F172A]" edges={['top']}>
      <ScreenHeader title="Monthly Consolidated" />

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8, flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center py-12">
          <Text className="text-base font-semibold text-text-primary dark:text-white mb-2">
            Monthly Consolidated View
          </Text>
          <Text className="text-sm text-text-muted dark:text-slate-400 text-center px-8">
            This view is best experienced on a desktop. Open on a wide screen to see the full consolidated hours breakdown.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
