import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  useWindowDimensions,
  TextInput,
  Alert,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useViewState } from '@/hooks/use-view-state';
import { useAuth } from '@/hooks/use-auth';
import { useTimeTracking } from '@/hooks/use-time-tracking';
import { formatDuration, formatElapsed, formatDate } from '@/lib/utils';
import { TimeEntryType } from '@/types/enums';
import type { TimeEntry } from '@/types/models';
import {
  Clock,
  LogIn,
  LogOut,
  Plus,
  ChevronLeft,
  ChevronRight,
  Timer,
  Calendar,
  FileText,
} from 'lucide-react-native';

const isWeb = Platform.OS === 'web';

// Lazy-load MUI on web
let DataGrid: any;
let MuiThemeProvider: any;
let Chip: any;
let MuiButton: any;
let Dialog: any;
let DialogTitle: any;
let DialogContent: any;
let DialogActions: any;
let TextField: any;
let MuiTabs: any;
let MuiTab: any;
if (isWeb) {
  const dg = require('@mui/x-data-grid');
  DataGrid = dg.DataGrid;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  Chip = require('@mui/material/Chip').default;
  MuiButton = require('@mui/material/Button').default;
  Dialog = require('@mui/material/Dialog').default;
  DialogTitle = require('@mui/material/DialogTitle').default;
  DialogContent = require('@mui/material/DialogContent').default;
  DialogActions = require('@mui/material/DialogActions').default;
  TextField = require('@mui/material/TextField').default;
  MuiTabs = require('@mui/material/Tabs').default;
  MuiTab = require('@mui/material/Tab').default;
}

// ─── Design Tokens ──────────────────────────────────────────────────
const DT = {
  bgMain: '#0b1220',
  cardBg: '#111a2e',
  cardBorder: 'rgba(255,255,255,0.06)',
  cardShadow: '0 10px 30px rgba(0,0,0,0.35)',
  infoBg: 'rgba(59,130,246,0.15)',
  infoBorder: '#3b82f6',
  infoText: '#93c5fd',
  dangerBg: 'rgba(239,68,68,0.15)',
  dangerBorder: '#ef4444',
  dangerText: '#fca5a5',
  successBg: 'rgba(34,197,94,0.15)',
  successBorder: '#22c55e',
  successText: '#86efac',
  warningBg: 'rgba(245,158,11,0.15)',
  warningBorder: '#f59e0b',
  warningText: '#fcd34d',
  subBg: 'rgba(255,255,255,0.03)',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accent: '#3b82f6',
};

const LT = {
  bgMain: '#F8FAFC',
  cardBg: '#FFFFFF',
  cardBorder: '#E2E8F0',
  cardShadow: '0 4px 12px rgba(0,0,0,0.06)',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  subBg: '#F8FAFC',
  accent: '#2563EB',
};

function tk(isDark: boolean) {
  return isDark ? DT : LT;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekStart(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTimeShort(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function entryDurationMinutes(entry: TimeEntry): number {
  if (!entry.clock_out) return 0;
  return Math.round(
    (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 60000
  );
}

function todayTotalMinutes(entries: TimeEntry[]): number {
  return entries.reduce((sum, e) => sum + entryDurationMinutes(e), 0);
}

function formatDayName(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Live Timer Hook ────────────────────────────────────────────────

function useLiveElapsed(clockInTime: string | null) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!clockInTime) {
      setElapsed(0);
      return;
    }

    const update = () => {
      const diff = Math.floor((Date.now() - new Date(clockInTime).getTime()) / 1000);
      setElapsed(Math.max(0, diff));
    };

    update();
    intervalRef.current = setInterval(update, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [clockInTime]);

  return elapsed;
}

// ─── Live Clock Hook ────────────────────────────────────────────────

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// =====================================================================
// WEB LAYOUT
// =====================================================================

function WebTimeClock({ isDark }: { isDark: boolean }) {
  const t = tk(isDark);
  const { user } = useAuth();
  const {
    activeEntry,
    todayEntries,
    historyEntries,
    weeklySummary,
    loading,
    error,
    fetchActiveEntry,
    fetchTodayEntries,
    fetchHistory,
    fetchWeeklySummary,
    clockIn,
    clockOut,
    createManualEntry,
  } = useTimeTracking();

  const [notes, setNotes] = useState('');
  const [tabIndex, setTabIndex] = useViewState('tabs/timeclock.tabIndex', 0);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDate, setManualDate] = useState(getToday());
  const [manualClockIn, setManualClockIn] = useState('09:00');
  const [manualClockOut, setManualClockOut] = useState('17:00');
  const [manualNotes, setManualNotes] = useState('');
  const [histDateFrom, setHistDateFrom] = useViewState(
    'tabs/timeclock.histDateFrom',
    addDays(getToday(), -30)
  );
  const [histDateTo, setHistDateTo] = useViewState('tabs/timeclock.histDateTo', getToday());
  const [weekStart, setWeekStart] = useViewState('tabs/timeclock.weekStart', getWeekStart());

  const now = useLiveClock();
  const elapsed = useLiveElapsed(activeEntry?.clock_in ?? null);
  const isClockedIn = !!activeEntry;

  // Auto-refresh active entry + today
  useAutoRefresh(() => {
    if (user?.id) {
      fetchActiveEntry(user.id);
      fetchTodayEntries(user.id);
    }
  }, [user?.id]);

  // Fetch history / summary on tab change
  useEffect(() => {
    if (!user?.id) return;
    if (tabIndex === 1) fetchHistory(user.id, histDateFrom, histDateTo);
    if (tabIndex === 2) fetchWeeklySummary(user.id, weekStart);
  }, [tabIndex, user?.id, histDateFrom, histDateTo, weekStart]);

  const [actionError, setActionError] = useState<string | null>(null);

  const handleClockIn = async () => {
    if (!user?.id) return;
    setActionError(null);
    try {
      await clockIn(user.id, notes || undefined);
      setNotes('');
    } catch (e: any) {
      setActionError(e.message || 'Failed to clock in');
    }
  };

  const handleClockOut = async () => {
    if (!user?.id || !activeEntry) return;
    setActionError(null);
    try {
      await clockOut(activeEntry.id, user.id, notes || undefined);
      setNotes('');
    } catch (e: any) {
      setActionError(e.message || 'Failed to clock out');
    }
  };

  const handleManualSubmit = async () => {
    if (!user?.id) return;
    setActionError(null);
    const clockInISO = new Date(`${manualDate}T${manualClockIn}:00`).toISOString();
    const clockOutISO = new Date(`${manualDate}T${manualClockOut}:00`).toISOString();
    try {
      await createManualEntry(user.id, clockInISO, clockOutISO, manualNotes || undefined);
      setManualOpen(false);
      setManualNotes('');
      if (tabIndex === 2) fetchWeeklySummary(user.id, weekStart);
    } catch (e: any) {
      setActionError(e.message || 'Failed to create manual entry');
    }
  };

  const todayTotal = todayTotalMinutes(todayEntries);

  // ── DataGrid columns for Today tab ──
  const todayColumns = [
    {
      field: 'clock_in',
      headerName: 'CLOCK IN',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v: any, row: TimeEntry) => formatTime(row.clock_in),
    },
    {
      field: 'clock_out',
      headerName: 'CLOCK OUT',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v: any, row: TimeEntry) =>
        row.clock_out ? formatTime(row.clock_out) : '—',
    },
    {
      field: 'duration',
      headerName: 'DURATION',
      flex: 0.8,
      minWidth: 100,
      valueGetter: (_v: any, row: TimeEntry) =>
        row.clock_out ? formatDuration(entryDurationMinutes(row)) : 'In progress',
    },
    {
      field: 'entry_type',
      headerName: 'TYPE',
      flex: 0.6,
      minWidth: 90,
      renderCell: (params: any) => (
        <Chip
          label={params.row.entry_type === TimeEntryType.Manual ? 'Manual' : 'Regular'}
          size="small"
          color={params.row.entry_type === TimeEntryType.Manual ? 'warning' : 'info'}
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: 12 }}
        />
      ),
    },
    {
      field: 'notes',
      headerName: 'NOTES',
      flex: 1.5,
      minWidth: 180,
      valueGetter: (_v: any, row: TimeEntry) => row.notes || '—',
    },
  ];

  // ── DataGrid columns for History tab ──
  const historyColumns = [
    {
      field: 'date',
      headerName: 'DATE',
      flex: 1,
      minWidth: 120,
      valueGetter: (_v: any, row: TimeEntry) => formatDate(row.clock_in.split('T')[0]),
    },
    ...todayColumns,
  ];

  // ── DataGrid columns for Timesheet tab ──
  const timesheetColumns = [
    {
      field: 'date',
      headerName: 'DAY',
      flex: 1.5,
      minWidth: 160,
      valueGetter: (_v: any, row: any) => formatDayName(row.date),
    },
    {
      field: 'totalMinutes',
      headerName: 'TOTAL',
      flex: 1,
      minWidth: 100,
      valueGetter: (_v: any, row: any) => formatDuration(row.totalMinutes),
    },
    {
      field: 'entries',
      headerName: 'PUNCHES',
      flex: 0.6,
      minWidth: 80,
      valueGetter: (_v: any, row: any) => row.entries.length,
    },
  ];

  const weekTotal = weeklySummary.reduce((s, d) => s + d.totalMinutes, 0);

  return (
    <MuiThemeProvider isDark={isDark}>
      <div
        style={{
          minHeight: '100vh',
          background: isDark ? DT.bgMain : LT.bgMain,
          padding: '28px 32px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* ── Sticky Header ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: t.textPrimary }}>
              Clock In/Out
            </span>
            <Chip
              label={isClockedIn ? 'Clocked In' : 'Clocked Out'}
              size="small"
              color={isClockedIn ? 'success' : 'default'}
              variant="filled"
              sx={{ fontWeight: 700, fontSize: 12 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, color: t.textSecondary }}>
              Today: <strong style={{ color: t.textPrimary }}>{formatDuration(todayTotal + (isClockedIn ? Math.floor(elapsed / 60) : 0))}</strong>
            </span>
          </div>
        </div>

        {/* ── Top Row: Clock Widget + Info Panel ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
            marginBottom: 24,
          }}
        >
          {/* Clock Widget Card */}
          <div
            style={{
              backgroundColor: isDark ? DT.cardBg : LT.cardBg,
              border: `1px solid ${isDark ? DT.cardBorder : LT.cardBorder}`,
              borderRadius: 16,
              padding: 28,
              boxShadow: isDark ? DT.cardShadow : LT.cardShadow,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            {/* Digital Clock */}
            <span
              style={{
                fontSize: 52,
                fontWeight: 700,
                fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
                color: t.textPrimary,
                letterSpacing: '0.04em',
              }}
            >
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span style={{ fontSize: 15, color: t.textSecondary, marginTop: -8 }}>
              {now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>

            {/* Status */}
            {isClockedIn && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: isDark ? DT.successBg : 'rgba(34,197,94,0.08)',
                  borderRadius: 10,
                  padding: '8px 16px',
                }}
              >
                <Timer size={16} color={isDark ? DT.successText : '#16A34A'} />
                <span style={{ fontSize: 20, fontWeight: 700, color: isDark ? DT.successText : '#16A34A', fontFamily: 'monospace' }}>
                  {formatElapsed(elapsed)}
                </span>
              </div>
            )}

            {/* Clock In / Out Button */}
            <MuiButton
              variant="contained"
              color={isClockedIn ? 'error' : 'success'}
              onClick={isClockedIn ? handleClockOut : handleClockIn}
              startIcon={isClockedIn ? <LogOut size={20} /> : <LogIn size={20} />}
              sx={{
                width: '100%',
                maxWidth: 320,
                py: 1.5,
                fontSize: 16,
                fontWeight: 700,
                borderRadius: '12px',
                textTransform: 'none',
                mt: 1,
              }}
            >
              {isClockedIn ? 'Clock Out' : 'Clock In'}
            </MuiButton>
          </div>

          {/* Info Panel Card */}
          <div
            style={{
              backgroundColor: isDark ? DT.cardBg : LT.cardBg,
              border: `1px solid ${isDark ? DT.cardBorder : LT.cardBorder}`,
              borderRadius: 16,
              padding: 28,
              boxShadow: isDark ? DT.cardShadow : LT.cardShadow,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* Last Punch */}
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.textSecondary, textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 8, display: 'block' }}>
                Last Punch
              </span>
              {todayEntries.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 15, color: t.textPrimary, fontWeight: 600 }}>
                    {(() => {
                      const last = todayEntries[todayEntries.length - 1];
                      if (last.clock_out) return `Clock Out at ${formatTime(last.clock_out)}`;
                      return `Clock In at ${formatTime(last.clock_in)}`;
                    })()}
                  </span>
                  {todayEntries[todayEntries.length - 1].notes && (
                    <span style={{ fontSize: 13, color: t.textMuted }}>
                      {todayEntries[todayEntries.length - 1].notes}
                    </span>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: 14, color: t.textMuted }}>No entries today</span>
              )}
            </div>

            {/* Notes */}
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.textSecondary, textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 8, display: 'block' }}>
                Notes
              </span>
              <TextField
                size="small"
                fullWidth
                multiline
                rows={2}
                placeholder="Add notes for your punch..."
                value={notes}
                onChange={(e: any) => setNotes(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 14 } }}
              />
            </div>

            {/* Manual Entry */}
            <MuiButton
              variant="outlined"
              startIcon={<Plus size={18} />}
              onClick={() => setManualOpen(true)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '10px',
                fontSize: 14,
                alignSelf: 'flex-start',
              }}
            >
              Manual Entry
            </MuiButton>

            {(actionError || error) && (
              <div
                style={{
                  backgroundColor: isDark ? DT.dangerBg : '#FEF2F2',
                  border: `1px solid ${isDark ? DT.dangerBorder : '#FECACA'}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: isDark ? DT.dangerText : '#DC2626',
                  fontWeight: 500,
                }}
              >
                {actionError || error}
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs: Today | History | Timesheet ── */}
        <div
          style={{
            backgroundColor: isDark ? DT.cardBg : LT.cardBg,
            border: `1px solid ${isDark ? DT.cardBorder : LT.cardBorder}`,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: isDark ? DT.cardShadow : LT.cardShadow,
          }}
        >
          <MuiTabs
            value={tabIndex}
            onChange={(_: any, v: number) => setTabIndex(v)}
            sx={{ borderBottom: `1px solid ${isDark ? DT.cardBorder : LT.cardBorder}`, px: 2 }}
          >
            <MuiTab label="Today" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <MuiTab label="History" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <MuiTab label="Timesheet" sx={{ textTransform: 'none', fontWeight: 600 }} />
          </MuiTabs>

          <div style={{ padding: 20 }}>
            {/* Today Tab */}
            {tabIndex === 0 && (
              <div style={{ width: '100%' }}>
                <DataGrid
                  rows={todayEntries}
                  columns={todayColumns}
                  getRowId={(row: TimeEntry) => row.id}
                  pageSizeOptions={[10]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  disableRowSelectionOnClick
                  autoHeight
                  rowHeight={52}
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-row': { cursor: 'default' },
                  }}
                />
              </div>
            )}

            {/* History Tab */}
            {tabIndex === 1 && (
              <div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                  <TextField
                    type="date"
                    size="small"
                    label="From"
                    value={histDateFrom}
                    onChange={(e: any) => setHistDateFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13 } }}
                  />
                  <TextField
                    type="date"
                    size="small"
                    label="To"
                    value={histDateTo}
                    onChange={(e: any) => setHistDateTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 13 } }}
                  />
                </div>
                <div style={{ width: '100%' }}>
                  <DataGrid
                    rows={historyEntries}
                    columns={historyColumns}
                    getRowId={(row: TimeEntry) => row.id}
                    pageSizeOptions={[10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                    disableRowSelectionOnClick
                    autoHeight
                    rowHeight={52}
                    loading={loading}
                    sx={{
                      border: 'none',
                      '& .MuiDataGrid-row': { cursor: 'default' },
                    }}
                  />
                </div>
              </div>
            )}

            {/* Timesheet Tab */}
            {tabIndex === 2 && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <MuiButton
                      size="small"
                      variant="outlined"
                      onClick={() => setWeekStart(addDays(weekStart, -7))}
                      sx={{ minWidth: 36, borderRadius: '8px' }}
                    >
                      <ChevronLeft size={18} />
                    </MuiButton>
                    <span style={{ fontSize: 15, fontWeight: 600, color: t.textPrimary }}>
                      {formatDayName(weekStart)} – {formatDayName(addDays(weekStart, 6))}
                    </span>
                    <MuiButton
                      size="small"
                      variant="outlined"
                      onClick={() => setWeekStart(addDays(weekStart, 7))}
                      sx={{ minWidth: 36, borderRadius: '8px' }}
                    >
                      <ChevronRight size={18} />
                    </MuiButton>
                  </div>
                  <Chip
                    label={`Week Total: ${formatDuration(weekTotal)}`}
                    color="info"
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: 13 }}
                  />
                </div>
                <div style={{ width: '100%' }}>
                  <DataGrid
                    rows={weeklySummary}
                    columns={timesheetColumns}
                    getRowId={(row: any) => row.date}
                    pageSizeOptions={[7]}
                    initialState={{ pagination: { paginationModel: { pageSize: 7 } } }}
                    disableRowSelectionOnClick
                    autoHeight
                    rowHeight={52}
                    hideFooter
                    loading={loading}
                    sx={{
                      border: 'none',
                      '& .MuiDataGrid-row': { cursor: 'default' },
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Manual Entry Dialog ── */}
        <MuiThemeProvider isDark={isDark}>
          <Dialog open={manualOpen} onClose={() => setManualOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>Manual Time Entry</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
              <TextField
                type="date"
                label="Date"
                fullWidth
                size="small"
                value={manualDate}
                onChange={(e: any) => setManualDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <div style={{ display: 'flex', gap: 12 }}>
                <TextField
                  type="time"
                  label="Clock In"
                  fullWidth
                  size="small"
                  value={manualClockIn}
                  onChange={(e: any) => setManualClockIn(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  type="time"
                  label="Clock Out"
                  fullWidth
                  size="small"
                  value={manualClockOut}
                  onChange={(e: any) => setManualClockOut(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </div>
              <TextField
                label="Notes"
                fullWidth
                size="small"
                multiline
                rows={2}
                value={manualNotes}
                onChange={(e: any) => setManualNotes(e.target.value)}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <MuiButton onClick={() => setManualOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
                Cancel
              </MuiButton>
              <MuiButton variant="contained" onClick={handleManualSubmit} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Submit
              </MuiButton>
            </DialogActions>
          </Dialog>
        </MuiThemeProvider>
      </div>
    </MuiThemeProvider>
  );
}

// =====================================================================
// MOBILE LAYOUT
// =====================================================================

function MobileTimeClock({ isDark }: { isDark: boolean }) {
  const { user } = useAuth();
  const {
    activeEntry,
    todayEntries,
    loading,
    error,
    fetchActiveEntry,
    fetchTodayEntries,
    clockIn,
    clockOut,
    createManualEntry,
  } = useTimeTracking();

  const [notes, setNotes] = useState('');
  const [manualVisible, setManualVisible] = useState(false);
  const [manualDate, setManualDate] = useState(getToday());
  const [manualClockIn, setManualClockIn] = useState('09:00');
  const [manualClockOut, setManualClockOut] = useState('17:00');
  const [manualNotes, setManualNotes] = useState('');

  const now = useLiveClock();
  const elapsed = useLiveElapsed(activeEntry?.clock_in ?? null);
  const isClockedIn = !!activeEntry;

  useAutoRefresh(() => {
    if (user?.id) {
      fetchActiveEntry(user.id);
      fetchTodayEntries(user.id);
    }
  }, [user?.id]);

  const handleClockIn = async () => {
    if (!user?.id) return;
    try {
      await clockIn(user.id, notes || undefined);
      setNotes('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleClockOut = async () => {
    if (!user?.id || !activeEntry) return;
    try {
      await clockOut(activeEntry.id, user.id, notes || undefined);
      setNotes('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleManualSubmit = async () => {
    if (!user?.id) return;
    const clockInISO = new Date(`${manualDate}T${manualClockIn}:00`).toISOString();
    const clockOutISO = new Date(`${manualDate}T${manualClockOut}:00`).toISOString();
    try {
      await createManualEntry(user.id, clockInISO, clockOutISO, manualNotes || undefined);
      setManualVisible(false);
      setManualNotes('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const todayTotal = todayTotalMinutes(todayEntries);

  const bg = isDark ? '#0F172A' : '#F8FAFC';
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  const textP = isDark ? '#FFFFFF' : '#0F172A';
  const textS = isDark ? '#94A3B8' : '#64748B';
  const textM = isDark ? '#64748B' : '#94A3B8';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {/* Digital Clock Card */}
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          padding: 24,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: border,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 44,
            fontWeight: '700',
            color: textP,
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            letterSpacing: 2,
          }}
        >
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </Text>
        <Text style={{ fontSize: 14, color: textS, marginTop: 4 }}>
          {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
      </View>

      {/* Clock In / Out Button */}
      <Pressable
        onPress={isClockedIn ? handleClockOut : handleClockIn}
        style={{
          backgroundColor: isClockedIn ? '#DC2626' : '#16A34A',
          borderRadius: 14,
          paddingVertical: 16,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 10,
          marginBottom: 16,
        }}
      >
        {isClockedIn ? (
          <LogOut size={22} color="#FFFFFF" />
        ) : (
          <LogIn size={22} color="#FFFFFF" />
        )}
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
          {isClockedIn ? 'Clock Out' : 'Clock In'}
        </Text>
      </Pressable>

      {/* Status Card */}
      {isClockedIn && (
        <View
          style={{
            backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : '#F0FDF4',
            borderRadius: 12,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(34,197,94,0.3)' : '#BBF7D0',
          }}
        >
          <Timer size={20} color={isDark ? '#86EFAC' : '#16A34A'} />
          <View>
            <Text style={{ fontSize: 13, color: isDark ? '#86EFAC' : '#16A34A', fontWeight: '600' }}>
              Clocked in since {formatTime(activeEntry.clock_in)}
            </Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: isDark ? '#86EFAC' : '#16A34A',
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                marginTop: 2,
              }}
            >
              {formatElapsed(elapsed)}
            </Text>
          </View>
        </View>
      )}

      {!isClockedIn && todayEntries.length > 0 && (
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: textS, marginBottom: 4 }}>
            Today's Total
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: textP }}>
            {formatDuration(todayTotal)}
          </Text>
        </View>
      )}

      {/* Notes Input */}
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: border,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: textS, marginBottom: 8 }}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes for your punch..."
          placeholderTextColor={textM}
          multiline
          numberOfLines={2}
          style={{
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderRadius: 10,
            padding: 12,
            fontSize: 14,
            color: textP,
            borderWidth: 1,
            borderColor: border,
            textAlignVertical: 'top',
          }}
        />
      </View>

      {/* Manual Entry Button */}
      <Pressable
        onPress={() => setManualVisible(true)}
        style={{
          borderWidth: 1.5,
          borderColor: '#2563EB',
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          marginBottom: 20,
        }}
      >
        <Plus size={18} color="#2563EB" />
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#2563EB' }}>Manual Entry</Text>
      </Pressable>

      {error && (
        <View style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <Text style={{ fontSize: 13, color: isDark ? '#FCA5A5' : '#DC2626' }}>{error}</Text>
        </View>
      )}

      {/* Today's Entries */}
      <Text style={{ fontSize: 16, fontWeight: '700', color: textP, marginBottom: 12 }}>
        Today's Entries
      </Text>
      {todayEntries.length === 0 ? (
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 12,
            padding: 24,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <Clock size={32} color={textM} />
          <Text style={{ fontSize: 14, color: textM, marginTop: 8 }}>No entries yet today</Text>
        </View>
      ) : (
        todayEntries.map((entry) => (
          <View
            key={entry.id}
            style={{
              backgroundColor: cardBg,
              borderRadius: 12,
              padding: 16,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: textP }}>
                  {formatTime(entry.clock_in)}
                  {entry.clock_out ? ` – ${formatTime(entry.clock_out)}` : ' – In progress'}
                </Text>
                {entry.notes && (
                  <Text style={{ fontSize: 13, color: textS, marginTop: 4 }}>{entry.notes}</Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: textP }}>
                  {entry.clock_out ? formatDuration(entryDurationMinutes(entry)) : '—'}
                </Text>
                {entry.entry_type === TimeEntryType.Manual && (
                  <View
                    style={{
                      backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB',
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      marginTop: 4,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#FCD34D' : '#D97706' }}>
                      Manual
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ))
      )}

      {/* Manual Entry Modal (mobile — simple inline card) */}
      {manualVisible && (
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 16,
            padding: 20,
            marginTop: 12,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: textP, marginBottom: 16 }}>
            Manual Time Entry
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: textS, marginBottom: 6 }}>Date</Text>
          <TextInput
            value={manualDate}
            onChangeText={setManualDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={textM}
            style={{
              backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
              borderRadius: 10,
              padding: 12,
              fontSize: 14,
              color: textP,
              borderWidth: 1,
              borderColor: border,
              marginBottom: 12,
            }}
          />
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: textS, marginBottom: 6 }}>Clock In</Text>
              <TextInput
                value={manualClockIn}
                onChangeText={setManualClockIn}
                placeholder="HH:MM"
                placeholderTextColor={textM}
                style={{
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 14,
                  color: textP,
                  borderWidth: 1,
                  borderColor: border,
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: textS, marginBottom: 6 }}>Clock Out</Text>
              <TextInput
                value={manualClockOut}
                onChangeText={setManualClockOut}
                placeholder="HH:MM"
                placeholderTextColor={textM}
                style={{
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 14,
                  color: textP,
                  borderWidth: 1,
                  borderColor: border,
                }}
              />
            </View>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '600', color: textS, marginBottom: 6 }}>Notes</Text>
          <TextInput
            value={manualNotes}
            onChangeText={setManualNotes}
            placeholder="Optional notes"
            placeholderTextColor={textM}
            multiline
            numberOfLines={2}
            style={{
              backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
              borderRadius: 10,
              padding: 12,
              fontSize: 14,
              color: textP,
              borderWidth: 1,
              borderColor: border,
              textAlignVertical: 'top',
              marginBottom: 16,
            }}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={() => setManualVisible(false)}
              style={{
                flex: 1,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: border,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: textS }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleManualSubmit}
              style={{
                flex: 1,
                backgroundColor: '#2563EB',
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Submit</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// =====================================================================
// MAIN EXPORT
// =====================================================================

export default function TimeClockScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();

  // On web with large screen → web layout; otherwise mobile
  const useWebLayout = isWeb && width >= 1366;

  if (useWebLayout) {
    return <WebTimeClock isDark={isDark} />;
  }

  return <MobileTimeClock isDark={isDark} />;
}
