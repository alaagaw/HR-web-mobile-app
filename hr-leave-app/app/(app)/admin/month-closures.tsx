import { AccessGate } from '@/components/access/access-gate';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { ScreenHeader } from '@/components/layout/screen-header';
import { useAuth } from '@/hooks/use-auth';
import { monthClosureService, profileCapabilitiesService } from '@/services';
import { format, subMonths, startOfMonth } from 'date-fns';
import type { MonthClosure } from '@/types/models';
import { Role } from '@/types/enums';

const isWeb = Platform.OS === 'web';

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

if (isWeb) {
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
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface MonthCell {
  year: number;
  month: number; // 1-12
  monthLabel: string;
  closure: MonthClosure | null;
  isClosed: boolean;
  // Heuristic: suggest closing once the calendar day passes the 22nd of the
  // SAME month. Before the 22nd the row is just "open"; after, it shows an
  // amber "ready to close" hint.
  suggested: boolean;
}

export default function MonthClosuresScreen() {
  return (
    <AccessGate resourceKey="nav:timesheet-management">
      <MonthClosuresScreenInner />
    </AccessGate>
  );
}

function MonthClosuresScreenInner() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [closures, setClosures] = useState<MonthClosure[]>([]);
  const [loading, setLoading] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [target, setTarget] = useState<MonthCell | null>(null);
  const [mode, setMode] = useState<'close' | 'reopen' | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });

  // Permission gate. HR Director (role) or anyone with can_close_month flag.
  useEffect(() => {
    if (!user) return;
    if (user.role === Role.HRDirector || user.role === Role.HR) { setCanClose(true); return; }
    profileCapabilitiesService.getForProfile(user.id)
      .then((caps) => setCanClose(!!caps?.can_close_month))
      .catch(() => setCanClose(false));
  }, [user?.id]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await monthClosureService.listRecent(18);
      setClosures(rows);
    } catch (err: any) {
      setSnack({ open: true, msg: err.message || 'Failed to load closures', sev: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Build a 12-month rolling window so HR can see the last year at a glance,
  // even months that have no closure row yet (open by default).
  const cells: MonthCell[] = useMemo(() => {
    const now = new Date();
    const today = now.getDate();
    const out: MonthCell[] = [];
    for (let i = 0; i < 12; i++) {
      const d = startOfMonth(subMonths(now, i));
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const closure = closures.find((c) => c.year === y && c.month === m) ?? null;
      const isClosed = !!closure && closure.reopened_at == null;
      // Suggest close: only for the CURRENT month past the 22nd. Prior months
      // either are already closed (no suggestion) or are pre-22nd of "right
      // now" (impossible — they're already past).
      const isCurrentMonth = i === 0;
      const suggested = isCurrentMonth && today >= 22 && !isClosed;
      out.push({
        year: y,
        month: m,
        monthLabel: `${MONTH_NAMES[m - 1]} ${y}`,
        closure,
        isClosed,
        suggested,
      });
    }
    return out;
  }, [closures]);

  const handleAction = (cell: MonthCell, action: 'close' | 'reopen') => {
    setTarget(cell);
    setMode(action);
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!target || !mode || !user) return;
    setSubmitting(true);
    try {
      if (mode === 'close') {
        await monthClosureService.close(target.year, target.month, user.id, notes.trim() || undefined);
        setSnack({ open: true, msg: `${target.monthLabel} closed`, sev: 'success' });
      } else {
        await monthClosureService.reopen(target.year, target.month, user.id, notes.trim() || undefined);
        setSnack({ open: true, msg: `${target.monthLabel} reopened`, sev: 'success' });
      }
      setTarget(null);
      setMode(null);
      await load();
    } catch (err: any) {
      setSnack({ open: true, msg: err.message || 'Failed', sev: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isWeb) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0b1220' }} edges={['top']}>
        <ScreenHeader title="Month Closures" onBack={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b1220' }} edges={['top']}>
      <ScreenHeader title="Month Closures" onBack={() => router.back()} />
      <MuiThemeProvider isDark={isDark}>
        <View style={{ padding: 16, flex: 1 }}>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>
            Closing a month blocks new <strong>retroactive</strong> project-hours change requests against it.
            Forward edits and current-week entries are unaffected. Close once payroll for the month is
            about to be processed (usually around the 22nd of the same month).
            Reopening is an explicit action and is recorded with who and when.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {cells.map((cell) => (
              <div
                key={`${cell.year}-${cell.month}`}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: '#111a2e',
                  border: `1px solid ${cell.isClosed ? '#22c55e40' : cell.suggested ? '#F59E0B40' : '#1e293b'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>{cell.monthLabel}</div>
                    {cell.isClosed ? (
                      Chip && <Chip label="Closed" size="small" color="success" sx={{ mt: 0.5, fontWeight: 700, fontSize: 11 }} />
                    ) : cell.suggested ? (
                      Chip && <Chip label="Suggested to close" size="small" color="warning" sx={{ mt: 0.5, fontWeight: 700, fontSize: 11 }} />
                    ) : (
                      Chip && <Chip label="Open" size="small" sx={{ mt: 0.5, fontWeight: 700, fontSize: 11, backgroundColor: '#1e293b', color: '#94A3B8' }} />
                    )}
                  </div>
                  {canClose && (
                    <MuiButton
                      size="small"
                      variant={cell.isClosed ? 'outlined' : 'contained'}
                      color={cell.isClosed ? 'warning' : 'primary'}
                      onClick={() => handleAction(cell, cell.isClosed ? 'reopen' : 'close')}
                      sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                    >
                      {cell.isClosed ? 'Reopen' : 'Close'}
                    </MuiButton>
                  )}
                </div>
                {cell.closure && (
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 10, lineHeight: 1.5 }}>
                    {cell.closure.reopened_at ? (
                      <>
                        <div>Was closed at {format(new Date(cell.closure.closed_at), 'yyyy-MM-dd HH:mm')}</div>
                        <div>Reopened at {format(new Date(cell.closure.reopened_at), 'yyyy-MM-dd HH:mm')}</div>
                      </>
                    ) : (
                      <div>Closed {format(new Date(cell.closure.closed_at), 'yyyy-MM-dd HH:mm')}</div>
                    )}
                    {cell.closure.notes && <div style={{ marginTop: 4, fontStyle: 'italic' }}>“{cell.closure.notes}”</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </View>

        {target && mode && Dialog && (
          <Dialog open onClose={() => !submitting && setTarget(null)} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
              {mode === 'close' ? `Close ${target.monthLabel}?` : `Reopen ${target.monthLabel}?`}
            </DialogTitle>
            <DialogContent>
              <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 12 }}>
                {mode === 'close'
                  ? 'New retroactive change requests against this month will be rejected. Forward entries are unaffected.'
                  : 'Retroactive change requests against this month will be permitted again until you close it.'}
              </div>
              <TextField
                label="Notes (optional)"
                multiline
                rows={3}
                fullWidth
                value={notes}
                onChange={(e: any) => setNotes(e.target.value)}
                placeholder={mode === 'close' ? 'e.g. Payroll cycle 05/2026 started' : 'e.g. Reopening for correction on emp_code 70150'}
                size="small"
              />
            </DialogContent>
            <DialogActions>
              <MuiButton onClick={() => setTarget(null)} disabled={submitting}>Cancel</MuiButton>
              <MuiButton
                variant="contained"
                color={mode === 'close' ? 'primary' : 'warning'}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Working…' : mode === 'close' ? 'Close month' : 'Reopen month'}
              </MuiButton>
            </DialogActions>
          </Dialog>
        )}

        {Snackbar && (
          <Snackbar
            open={snack.open}
            autoHideDuration={4000}
            onClose={() => setSnack((s) => ({ ...s, open: false }))}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert
              onClose={() => setSnack((s) => ({ ...s, open: false }))}
              severity={snack.sev}
              variant="filled"
            >
              {snack.msg}
            </Alert>
          </Snackbar>
        )}
      </MuiThemeProvider>
    </SafeAreaView>
  );
}
