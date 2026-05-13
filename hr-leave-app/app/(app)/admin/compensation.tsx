/**
 * HR Admin → Compensation
 *
 * Lists every active employee with their current pay (latest row in
 * v_current_compensation). Clicking a row opens a history modal that
 * shows every past row with its effective_from + a "+ Add new pay
 * row" button at the top. That's where HR records raises without
 * needing to edit the live values inline — preserves the audit trail
 * by design.
 *
 * Web-only for now (MUI components, like the other admin pages).
 */
import { useCallback, useMemo, useState } from 'react';
import { View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useAuth } from '@/hooks/use-auth';
import { userService, compensationService } from '@/services';
import { EmptyState } from '@/components/ui/empty-state';
import type { Profile, EmployeeCompensation } from '@/types/models';

const isWeb = Platform.OS === 'web';

let Dialog: any, DialogTitle: any, DialogContent: any, DialogActions: any;
let MuiTextField: any, MuiButton: any, MuiAlert: any, Snackbar: any;
let DataGrid: any, MuiThemeProvider: any;

if (isWeb) {
  Dialog = require('@mui/material/Dialog').default;
  DialogTitle = require('@mui/material/DialogTitle').default;
  DialogContent = require('@mui/material/DialogContent').default;
  DialogActions = require('@mui/material/DialogActions').default;
  MuiTextField = require('@mui/material/TextField').default;
  MuiButton = require('@mui/material/Button').default;
  MuiAlert = require('@mui/material/Alert').default;
  Snackbar = require('@mui/material/Snackbar').default;
  DataGrid = require('@mui/x-data-grid').DataGrid;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
}

type EmpWithComp = Profile & {
  comp_basic_salary: number;
  comp_hra: number;
  comp_transportation: number;
  comp_other_allowances: number;
  comp_total: number;
  comp_effective_from: string | null;
};

function formatMoney(n: number, currency = 'SAR'): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + ' ' + currency;
}

interface AddDialogState {
  open: boolean;
  employee: EmpWithComp | null;
  effective_from: string;
  basic_salary: string;
  hra: string;
  transportation: string;
  other_allowances: string;
  notes: string;
  submitting: boolean;
  error: string;
}

const INITIAL_ADD: AddDialogState = {
  open: false,
  employee: null,
  effective_from: '',
  basic_salary: '',
  hra: '',
  transportation: '',
  other_allowances: '',
  notes: '',
  submitting: false,
  error: '',
};

interface HistoryDialogState {
  open: boolean;
  employee: EmpWithComp | null;
  history: EmployeeCompensation[];
  loading: boolean;
}

const INITIAL_HISTORY: HistoryDialogState = {
  open: false,
  employee: null,
  history: [],
  loading: false,
};

export default function CompensationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [rows, setRows] = useState<EmpWithComp[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [addDialog, setAddDialog] = useState<AddDialogState>(INITIAL_ADD);
  const [historyDialog, setHistoryDialog] = useState<HistoryDialogState>(INITIAL_HISTORY);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, comps] = await Promise.all([
        userService.getEmployees({ is_active: true }),
        compensationService.listCurrentForAll(),
      ]);
      const compByEmp = new Map<string, EmployeeCompensation>();
      for (const c of comps) compByEmp.set(c.employee_id, c);
      const enriched: EmpWithComp[] = emps.map((e) => {
        const c = compByEmp.get(e.id);
        const basic = c?.basic_salary ?? 0;
        const hra = c?.hra ?? 0;
        const transport = c?.transportation ?? 0;
        const other = c?.other_allowances ?? 0;
        return {
          ...e,
          comp_basic_salary: basic,
          comp_hra: hra,
          comp_transportation: transport,
          comp_other_allowances: other,
          comp_total: basic + hra + transport + other,
          comp_effective_from: c?.effective_from ?? null,
        };
      });
      setRows(enriched);
    } finally {
      setLoading(false);
    }
  }, []);

  const { invalidate } = useAutoRefresh(() => { void loadData(); }, []);

  const openHistory = async (emp: EmpWithComp) => {
    setHistoryDialog({ open: true, employee: emp, history: [], loading: true });
    try {
      const history = await compensationService.getHistory(emp.id);
      setHistoryDialog((s) => (s.employee?.id === emp.id ? { ...s, history, loading: false } : s));
    } catch {
      setHistoryDialog((s) => (s.employee?.id === emp.id ? { ...s, loading: false } : s));
    }
  };

  const openAdd = (emp: EmpWithComp) => {
    setAddDialog({
      ...INITIAL_ADD,
      open: true,
      employee: emp,
      effective_from: new Date().toISOString().slice(0, 10),
      basic_salary: String(emp.comp_basic_salary || ''),
      hra: String(emp.comp_hra || ''),
      transportation: String(emp.comp_transportation || ''),
      other_allowances: String(emp.comp_other_allowances || ''),
    });
  };

  const submitAdd = async () => {
    if (!addDialog.employee || !user) return;
    setAddDialog((s) => ({ ...s, submitting: true, error: '' }));
    try {
      await compensationService.addNewRow({
        employee_id: addDialog.employee.id,
        effective_from: addDialog.effective_from,
        basic_salary: parseFloat(addDialog.basic_salary) || 0,
        hra: parseFloat(addDialog.hra) || 0,
        transportation: parseFloat(addDialog.transportation) || 0,
        other_allowances: parseFloat(addDialog.other_allowances) || 0,
        notes: addDialog.notes.trim() || undefined,
        created_by: user.id,
      });
      setAddDialog(INITIAL_ADD);
      setSuccessMsg(`New compensation row added.`);
      invalidate();
    } catch (err: any) {
      setAddDialog((s) => ({ ...s, submitting: false, error: err.message || 'Save failed' }));
    }
  };

  const columns = useMemo(() => ([
    { field: 'full_name', headerName: 'Employee', flex: 1.5, minWidth: 180 },
    { field: 'department', headerName: 'Department', flex: 1, minWidth: 140, valueGetter: (p: any) => p.row.department || '—' },
    { field: 'comp_basic_salary', headerName: 'Basic', flex: 1, minWidth: 110, type: 'number',
      valueFormatter: (p: any) => formatMoney(p.value || 0) },
    { field: 'comp_hra', headerName: 'HRA', flex: 1, minWidth: 110, type: 'number',
      valueFormatter: (p: any) => formatMoney(p.value || 0) },
    { field: 'comp_transportation', headerName: 'Transport', flex: 1, minWidth: 110, type: 'number',
      valueFormatter: (p: any) => formatMoney(p.value || 0) },
    { field: 'comp_other_allowances', headerName: 'Other', flex: 1, minWidth: 110, type: 'number',
      valueFormatter: (p: any) => formatMoney(p.value || 0) },
    { field: 'comp_total', headerName: 'Monthly Total', flex: 1, minWidth: 130, type: 'number',
      valueFormatter: (p: any) => formatMoney(p.value || 0),
      cellClassName: 'comp-total-cell' },
    { field: 'comp_effective_from', headerName: 'Effective From', flex: 1, minWidth: 120,
      valueGetter: (p: any) => p.row.comp_effective_from || '—' },
  ]), []);

  if (!isWeb) {
    return (
      <EmptyState
        title="Web-only feature"
        description="Open Compensation on a desktop browser to view and edit employee pay."
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
            Compensation
          </div>
          <div style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
            Click any row to see history or add a raise.
          </div>
        </div>
      </div>

      <View style={{ flex: 1, padding: 16 }}>
        {rows.length === 0 && !loading ? (
          <EmptyState title="No active employees" description="" />
        ) : (
          <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
            <MuiThemeProvider isDark={isDark}>
              <DataGrid
                rows={rows}
                columns={columns}
                loading={loading}
                getRowId={(r: any) => r.id}
                onRowClick={(p: any) => openHistory(p.row as EmpWithComp)}
                disableRowSelectionOnClick
                density="compact"
                pageSizeOptions={[25, 50, 100]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 25, page: 0 } },
                }}
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-row:hover': { cursor: 'pointer' },
                  '& .comp-total-cell': { fontWeight: 700 },
                }}
              />

              {/* History dialog */}
              <Dialog
                open={historyDialog.open}
                onClose={() => setHistoryDialog(INITIAL_HISTORY)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, backgroundImage: 'none' } }}
              >
                <DialogTitle sx={{ pb: 1, pt: 3, px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{historyDialog.employee?.full_name}</div>
                  <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>
                    Compensation history. Each row is a snapshot in effect from its date forward.
                  </div>
                </DialogTitle>
                <DialogContent sx={{ pt: '20px !important', pb: 1, px: 3 }}>
                  {historyDialog.loading ? (
                    <div style={{ padding: 24, textAlign: 'center', fontSize: 13, opacity: 0.6 }}>Loading…</div>
                  ) : historyDialog.history.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', fontSize: 13, opacity: 0.6 }}>
                      No compensation rows yet for this employee. Click <b>Add new row</b> below to enter one.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid', borderColor: 'rgba(148,163,184,0.3)', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1.2fr', gap: 0, fontSize: 12, fontWeight: 700, opacity: 0.7, padding: '8px 12px', borderBottom: '1px solid rgba(148,163,184,0.2)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <div>Effective From</div>
                        <div style={{ textAlign: 'right' }}>Basic</div>
                        <div style={{ textAlign: 'right' }}>HRA</div>
                        <div style={{ textAlign: 'right' }}>Transport</div>
                        <div style={{ textAlign: 'right' }}>Other</div>
                        <div style={{ textAlign: 'right' }}>Monthly Total</div>
                      </div>
                      {historyDialog.history.map((h, idx) => {
                        const total = Number(h.basic_salary) + Number(h.hra) + Number(h.transportation) + Number(h.other_allowances);
                        return (
                          <div key={h.effective_from + idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1.2fr', gap: 0, fontSize: 13, padding: '8px 12px', borderBottom: idx < historyDialog.history.length - 1 ? '1px solid rgba(148,163,184,0.15)' : undefined }}>
                            <div style={{ fontWeight: idx === 0 ? 700 : 400 }}>
                              {h.effective_from}{idx === 0 ? ' (current)' : ''}
                            </div>
                            <div style={{ textAlign: 'right' }}>{formatMoney(Number(h.basic_salary))}</div>
                            <div style={{ textAlign: 'right' }}>{formatMoney(Number(h.hra))}</div>
                            <div style={{ textAlign: 'right' }}>{formatMoney(Number(h.transportation))}</div>
                            <div style={{ textAlign: 'right' }}>{formatMoney(Number(h.other_allowances))}</div>
                            <div style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(total)}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
                  <MuiButton onClick={() => setHistoryDialog(INITIAL_HISTORY)} sx={{ textTransform: 'none', fontWeight: 600 }}>
                    Close
                  </MuiButton>
                  <div style={{ flex: 1 }} />
                  <MuiButton
                    variant="contained"
                    onClick={() => {
                      const emp = historyDialog.employee;
                      setHistoryDialog(INITIAL_HISTORY);
                      if (emp) openAdd(emp);
                    }}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
                  >
                    + Add new pay row
                  </MuiButton>
                </DialogActions>
              </Dialog>

              {/* Add dialog */}
              <Dialog
                open={addDialog.open}
                onClose={() => !addDialog.submitting && setAddDialog(INITIAL_ADD)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, backgroundImage: 'none' } }}
              >
                <DialogTitle sx={{ pb: 1, pt: 3, px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>New pay row · {addDialog.employee?.full_name}</div>
                  <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>
                    Inserts a new effective-dated row. Past rows are preserved as audit trail.
                  </div>
                </DialogTitle>
                <DialogContent sx={{ pt: '20px !important', pb: 1, px: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {addDialog.error && <MuiAlert severity="error">{addDialog.error}</MuiAlert>}
                  <MuiTextField
                    label="Effective From"
                    type="date"
                    value={addDialog.effective_from}
                    onChange={(e: any) => setAddDialog((s) => ({ ...s, effective_from: e.target.value }))}
                    fullWidth size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                  <div style={{ display: 'flex', gap: 12 }}>
                    <MuiTextField label="Basic Salary" type="number" value={addDialog.basic_salary}
                      onChange={(e: any) => setAddDialog((s) => ({ ...s, basic_salary: e.target.value }))}
                      fullWidth size="small" inputProps={{ min: 0, step: 0.01 }} />
                    <MuiTextField label="HRA" type="number" value={addDialog.hra}
                      onChange={(e: any) => setAddDialog((s) => ({ ...s, hra: e.target.value }))}
                      fullWidth size="small" inputProps={{ min: 0, step: 0.01 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <MuiTextField label="Transportation" type="number" value={addDialog.transportation}
                      onChange={(e: any) => setAddDialog((s) => ({ ...s, transportation: e.target.value }))}
                      fullWidth size="small" inputProps={{ min: 0, step: 0.01 }} />
                    <MuiTextField label="Other Allowances" type="number" value={addDialog.other_allowances}
                      onChange={(e: any) => setAddDialog((s) => ({ ...s, other_allowances: e.target.value }))}
                      fullWidth size="small" inputProps={{ min: 0, step: 0.01 }} />
                  </div>
                  <MuiTextField
                    label="Notes (optional)"
                    value={addDialog.notes}
                    onChange={(e: any) => setAddDialog((s) => ({ ...s, notes: e.target.value }))}
                    fullWidth size="small" multiline rows={2}
                    placeholder='e.g. "Annual raise" or "Promotion to Senior Engineer"'
                  />
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}>
                  <MuiButton onClick={() => setAddDialog(INITIAL_ADD)} disabled={addDialog.submitting} sx={{ textTransform: 'none', fontWeight: 600 }}>
                    Cancel
                  </MuiButton>
                  <div style={{ flex: 1 }} />
                  <MuiButton
                    variant="contained"
                    color="success"
                    onClick={submitAdd}
                    disabled={addDialog.submitting || !addDialog.effective_from}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
                  >
                    {addDialog.submitting ? 'Saving…' : 'Save'}
                  </MuiButton>
                </DialogActions>
              </Dialog>

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
        )}
      </View>
    </View>
  );
}
