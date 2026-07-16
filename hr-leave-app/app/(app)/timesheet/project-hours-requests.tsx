import { AccessGate } from '@/components/access/access-gate';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { ScreenHeader } from '@/components/layout/screen-header';
import { MobileCardList } from '@/components/ui/mobile-card-list';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useAuth } from '@/hooks/use-auth';
import { projectHoursChangeService, profileCapabilitiesService } from '@/services';
import { format } from 'date-fns';
import type { ProjectHoursChangeRequest, ProjectHoursChangeHistory } from '@/types/models';
import { ProjectHoursChangeStatus, ProjectHoursChangeScope, Role } from '@/types/enums';

const isWeb = Platform.OS === 'web';

let DataGrid: any;
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
  DataGrid = require('@mui/x-data-grid').DataGrid;
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

function statusChipColor(s: ProjectHoursChangeStatus): 'warning' | 'success' | 'error' | 'default' {
  switch (s) {
    case ProjectHoursChangeStatus.Pending: return 'warning';
    case ProjectHoursChangeStatus.Approved: return 'success';
    case ProjectHoursChangeStatus.Rejected: return 'error';
    case ProjectHoursChangeStatus.Cancelled: return 'default';
    default: return 'default';
  }
}

// RN status pill for the mobile card list (MUI Chip is web-DOM only).
function StatusPill({ status }: { status: ProjectHoursChangeStatus }) {
  const map: Record<string, { bg: string; text: string }> = {
    [ProjectHoursChangeStatus.Pending]: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
    [ProjectHoursChangeStatus.Approved]: { bg: 'rgba(34,197,94,0.15)', text: '#22C55E' },
    [ProjectHoursChangeStatus.Rejected]: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444' },
    [ProjectHoursChangeStatus.Cancelled]: { bg: 'rgba(148,163,184,0.15)', text: '#94A3B8' },
  };
  const c = map[status] ?? map[ProjectHoursChangeStatus.Cancelled];
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color: c.text, fontSize: 11, fontWeight: '700' }}>{status}</Text>
    </View>
  );
}

function scopeLabel(s: ProjectHoursChangeScope): string {
  switch (s) {
    case ProjectHoursChangeScope.ThisWeek: return 'This week';
    case ProjectHoursChangeScope.FromWeekForward: return 'From week forward';
    case ProjectHoursChangeScope.RetroactiveWeek: return 'Retroactive';
    default: return s;
  }
}

export default function ProjectHoursRequestsScreen() {
  return (
    <AccessGate resourceKey="nav:timesheet-management">
      <ProjectHoursRequestsScreenInner />
    </AccessGate>
  );
}

function ProjectHoursRequestsScreenInner() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isMobile } = useBreakpoint();

  const [requests, setRequests] = useState<ProjectHoursChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ProjectHoursChangeRequest | null>(null);
  const [history, setHistory] = useState<ProjectHoursChangeHistory[]>([]);
  const [decisionComment, setDecisionComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  // Approver = HR Director (role) OR General Manager (capability).
  useEffect(() => {
    if (!user) return;
    if (user.role === Role.HRDirector) {
      setCanApprove(true);
      return;
    }
    profileCapabilitiesService
      .getForProfile(user.id)
      .then((caps) => setCanApprove(!!caps?.is_general_manager))
      .catch(() => setCanApprove(false));
  }, [user]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectHoursChangeService.listAll();
      setRequests(data);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to load requests', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleOpenDetail = useCallback(async (req: ProjectHoursChangeRequest) => {
    setSelected(req);
    setDecisionComment('');
    setHistory([]);
    try {
      const h = await projectHoursChangeService.getHistory(req.id);
      setHistory(h);
    } catch {
      // Non-fatal
    }
  }, []);

  const handleDecision = useCallback(async (action: 'approve' | 'reject') => {
    if (!selected || !user) return;
    setSubmitting(true);
    try {
      if (action === 'approve') {
        await projectHoursChangeService.approve(selected.id, user.id, user.role, decisionComment.trim() || undefined);
      } else {
        await projectHoursChangeService.reject(selected.id, user.id, user.role, decisionComment.trim() || undefined);
      }
      setSnackbar({ open: true, message: `Request ${action}d`, severity: 'success' });
      setSelected(null);
      await loadRequests();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || `Failed to ${action} request`, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [selected, user, decisionComment, loadRequests]);

  const handleCancel = useCallback(async () => {
    if (!selected || !user) return;
    setSubmitting(true);
    try {
      await projectHoursChangeService.cancel(selected.id, user.id, user.role, decisionComment.trim() || undefined);
      setSnackbar({ open: true, message: 'Request cancelled', severity: 'success' });
      setSelected(null);
      await loadRequests();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to cancel request', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [selected, user, decisionComment, loadRequests]);

  const rows = useMemo(
    () => requests.map((r) => ({
      id: r.id,
      project: r.project ? `${r.project.project_number} · ${r.project.name}` : r.project_id,
      scope: scopeLabel(r.scope),
      week_start: r.week_start,
      current: r.current_value,
      requested: r.requested_value,
      status: r.status,
      requester: r.requester?.full_name ?? '—',
      requested_at: r.requested_at,
      raw: r,
    })),
    [requests],
  );

  const columns = useMemo(() => [
    { field: 'project', headerName: 'Project', flex: 2, minWidth: 200 },
    { field: 'scope', headerName: 'Scope', width: 170 },
    { field: 'week_start', headerName: 'Week', width: 110 },
    {
      field: 'change',
      headerName: 'Change',
      width: 130,
      renderCell: (p: any) => `${p.row.current} → ${p.row.requested} h/day`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (p: any) =>
        Chip ? (
          <Chip label={p.row.status} size="small" color={statusChipColor(p.row.status)} sx={{ fontWeight: 700, fontSize: 11 }} />
        ) : (
          <span>{p.row.status}</span>
        ),
    },
    { field: 'requester', headerName: 'Requester', flex: 1, minWidth: 160 },
    {
      field: 'requested_at',
      headerName: 'When',
      width: 160,
      valueGetter: (p: any) => p?.row?.requested_at ? format(new Date(p.row.requested_at), 'yyyy-MM-dd HH:mm') : '',
    },
  ], []);

  if (!isWeb || !DataGrid) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0b1220' }} edges={['top']}>
        <ScreenHeader title="Project Hours Requests" onBack={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isMobile ? (isDark ? '#0F172A' : '#F8FAFC') : '#0b1220' }} edges={['top']}>
      <ScreenHeader title="Project Hours Requests" onBack={() => router.back()} />
      <MuiThemeProvider isDark={isDark}>
        {isMobile ? (
          <MobileCardList
            data={rows}
            keyExtractor={(item) => String(item.id)}
            loading={loading}
            emptyTitle="No requests"
            emptyDescription="No project-hours change requests yet."
            onPress={(item) => handleOpenDetail(item.raw)}
            title={(item) => item.project}
            subtitle={(item) => `${item.scope} · Week ${item.week_start}`}
            right={(item) => <StatusPill status={item.status} />}
            rows={(item) => [
              { label: 'Change', value: `${item.current} → ${item.requested} h/day` },
              { label: 'Requester', value: item.requester },
              { label: 'When', value: item.requested_at ? format(new Date(item.requested_at), 'yyyy-MM-dd HH:mm') : '—' },
            ]}
          />
        ) : (
          <View style={{ padding: 16, flex: 1 }}>
            <div style={{ height: 600, backgroundColor: '#111a2e', borderRadius: 12, padding: 8 }}>
              <DataGrid
                rows={rows}
                columns={columns}
                loading={loading}
                onRowClick={(p: any) => handleOpenDetail(p.row.raw)}
                pageSizeOptions={[10, 25, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                sx={{
                  '& .MuiDataGrid-row': { cursor: 'pointer' },
                  '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(59,130,246,0.08)' },
                }}
              />
            </div>
          </View>
        )}

        {/* Detail / decision dialog */}
        {selected && Dialog && (
          <Dialog
            open={!!selected}
            onClose={() => !submitting && setSelected(null)}
            maxWidth="sm"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3, backgroundImage: 'none' } }}
          >
            <DialogTitle sx={{ pb: 1, pt: 3, px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Hours Change Request</div>
              <div style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>
                {selected.project?.project_number} · {selected.project?.name}
              </div>
            </DialogTitle>
            <DialogContent sx={{ pt: '24px !important', pb: 1, px: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 6, fontSize: 13 }}>
                <div style={{ opacity: 0.6 }}>Scope</div><div>{scopeLabel(selected.scope)}</div>
                <div style={{ opacity: 0.6 }}>Week</div><div>{selected.week_start}</div>
                <div style={{ opacity: 0.6 }}>Current</div><div>{selected.current_value} h/day</div>
                <div style={{ opacity: 0.6 }}>Requested</div><div style={{ fontWeight: 700 }}>{selected.requested_value} h/day</div>
                <div style={{ opacity: 0.6 }}>Requester</div><div>{selected.requester?.full_name ?? '—'}</div>
                <div style={{ opacity: 0.6 }}>Status</div>
                <div>{Chip && <Chip label={selected.status} size="small" color={statusChipColor(selected.status)} />}</div>
                {selected.reason && (
                  <>
                    <div style={{ opacity: 0.6 }}>Reason</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{selected.reason}</div>
                  </>
                )}
              </div>

              {/* History */}
              {history.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, opacity: 0.7, marginBottom: 8, textTransform: 'uppercase' }}>
                    Timeline
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {history.map((h) => (
                      <div key={h.id} style={{ fontSize: 12, display: 'flex', gap: 8 }}>
                        <div style={{ opacity: 0.6, minWidth: 130 }}>
                          {format(new Date(h.created_at), 'yyyy-MM-dd HH:mm')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong>{h.action}</strong>
                          {h.performer?.full_name ? ` — ${h.performer.full_name}` : ''}
                          {h.comment ? <div style={{ opacity: 0.8, marginTop: 2 }}>{h.comment}</div> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.status === ProjectHoursChangeStatus.Pending && (canApprove || selected.requested_by === user?.id) && (
                <TextField
                  label="Decision comment (optional)"
                  value={decisionComment}
                  onChange={(e: any) => setDecisionComment(e.target.value)}
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  sx={{ mt: 1 }}
                />
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <MuiButton onClick={() => setSelected(null)} disabled={submitting} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Close
              </MuiButton>
              {selected.status === ProjectHoursChangeStatus.Pending && selected.requested_by === user?.id && (
                <MuiButton onClick={handleCancel} disabled={submitting} color="warning" sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Cancel Request
                </MuiButton>
              )}
              {selected.status === ProjectHoursChangeStatus.Pending && canApprove && (
                <>
                  <MuiButton onClick={() => handleDecision('reject')} disabled={submitting} color="error" sx={{ textTransform: 'none', fontWeight: 600 }}>
                    Reject
                  </MuiButton>
                  <MuiButton onClick={() => handleDecision('approve')} disabled={submitting} variant="contained" color="success" sx={{ textTransform: 'none', fontWeight: 600 }}>
                    {submitting ? 'Working…' : 'Approve'}
                  </MuiButton>
                </>
              )}
            </DialogActions>
          </Dialog>
        )}

        {Snackbar && (
          <Snackbar
            open={snackbar.open}
            autoHideDuration={4000}
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} variant="filled">
              {snackbar.message}
            </Alert>
          </Snackbar>
        )}
      </MuiThemeProvider>
    </SafeAreaView>
  );
}
