import { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, Platform, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useViewState } from '@/hooks/use-view-state';
import { useColorScheme } from 'nativewind';
import { RequestCard } from '@/components/leave/request-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { useApprovals } from '@/hooks/use-leave-approvals';
import { useRenewalTasks } from '@/hooks/use-renewal-tasks';
import { useTaskStore } from '@/stores/task-store';
import { LeaveStatus, LeaveType, RenewalTaskStatus, Role } from '@/types/enums';
import { getStatusLabel } from '@/lib/state-machine';
import { formatDateRange, formatHours, formatPendingSince } from '@/lib/utils';
import type { LeaveRequest, RenewalTask } from '@/types/models';

const isWeb = Platform.OS === 'web';

const TABS = ['Leave Requests', 'All Leave Requests', 'Document Renewals'] as const;

// Lazy-load MUI components only on web
let DataGrid: any;
let GridToolbar: any;
let MuiThemeProvider: any;
let Chip: any;
let ApprovalChainCell: any;
let MuiButton: any;
let Dialog: any;
let DialogTitle: any;
let DialogContent: any;
let DialogActions: any;
let TextField: any;
if (isWeb) {
  const dg = require('@mui/x-data-grid');
  DataGrid = dg.DataGrid;
  GridToolbar = dg.GridToolbar;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  Chip = require('@mui/material/Chip').default;
  ApprovalChainCell = require('@/components/web/approval-chain-cell').ApprovalChainCell;
  MuiButton = require('@mui/material/Button').default;
  Dialog = require('@mui/material/Dialog').default;
  DialogTitle = require('@mui/material/DialogTitle').default;
  DialogContent = require('@mui/material/DialogContent').default;
  DialogActions = require('@mui/material/DialogActions').default;
  TextField = require('@mui/material/TextField').default;
}

const STATUS_COLOR_MAP: Record<string, 'warning' | 'success' | 'error' | 'default' | 'info'> = {
  [LeaveStatus.PendingSupervisor]: 'warning',
  [LeaveStatus.PendingManager]: 'warning',
  [LeaveStatus.PendingHR]: 'warning',
  [LeaveStatus.PendingHRDirector]: 'warning',
  [LeaveStatus.Approved]: 'success',
  [LeaveStatus.Rejected]: 'error',
  [LeaveStatus.Cancelled]: 'default',
  [LeaveStatus.Draft]: 'default',
  [LeaveStatus.Submitted]: 'info',
};

const TASK_STATUS_MAP: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
  [RenewalTaskStatus.Pending]: 'warning',
  [RenewalTaskStatus.InProgress]: 'info',
  [RenewalTaskStatus.Completed]: 'success',
  [RenewalTaskStatus.Cancelled]: 'default',
};

const TASK_STATUS_LABELS: Record<string, string> = {
  [RenewalTaskStatus.Pending]: 'Pending',
  [RenewalTaskStatus.InProgress]: 'In Progress',
  [RenewalTaskStatus.Completed]: 'Completed',
  [RenewalTaskStatus.Cancelled]: 'Cancelled',
};

// ─── Web: Leave Requests DataGrid ─────────────────────────────────────

function WebLeaveRequestsTable({
  data,
  isDark,
  userId,
  onRowClick,
  stateKey,
}: {
  data: LeaveRequest[];
  isDark: boolean;
  userId?: string;
  onRowClick: (request: LeaveRequest) => void;
  stateKey: string;
}) {
  const [paginationModel, setPaginationModel] = useViewState(
    `tabs/tasks.${stateKey}.pagination`,
    { page: 0, pageSize: 25 }
  );
  const [sortModel, setSortModel] = useViewState<any[]>(`tabs/tasks.${stateKey}.sort`, []);

  const columns = [
    {
      field: 'case_number',
      headerName: 'Case #',
      flex: 1,
      minWidth: 140,
    },
    {
      field: 'employee_name',
      headerName: 'Employee',
      flex: 1.4,
      minWidth: 160,
      valueGetter: (_value: any, row: LeaveRequest) => row.employee?.full_name || '—',
    },
    {
      field: 'department',
      headerName: 'Department',
      flex: 1,
      minWidth: 130,
      valueGetter: (_value: any, row: LeaveRequest) => row.employee?.department || '—',
    },
    {
      field: 'leave_type',
      headerName: 'Type',
      flex: 0.7,
      minWidth: 110,
      renderCell: (params: any) => (
        <Chip
          label={params.row.leave_type === LeaveType.Emergency ? 'Emergency' : 'PTO'}
          size="small"
          color={params.row.leave_type === LeaveType.Emergency ? 'error' : 'info'}
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: 12 }}
        />
      ),
      valueGetter: (_value: any, row: LeaveRequest) =>
        row.leave_type === LeaveType.Emergency ? 'Emergency' : 'PTO',
    },
    {
      field: 'dates',
      headerName: 'Dates',
      flex: 1.3,
      minWidth: 170,
      valueGetter: (_value: any, row: LeaveRequest) => formatDateRange(row.start_date, row.end_date),
      sortComparator: (v1: string, v2: string, p1: any, p2: any) => {
        const r1 = data.find((r) => r.id === p1.id);
        const r2 = data.find((r) => r.id === p2.id);
        return (r1?.start_date || '').localeCompare(r2?.start_date || '');
      },
    },
    {
      field: 'requested_hours',
      headerName: 'Hours',
      flex: 0.6,
      minWidth: 80,
      type: 'number' as const,
      valueFormatter: (value: number) => formatHours(value),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 140,
      renderCell: (params: any) => (
        <Chip
          label={getStatusLabel(params.row.status)}
          size="small"
          color={STATUS_COLOR_MAP[params.row.status] || 'default'}
          variant="filled"
          sx={{ fontWeight: 600, fontSize: 12 }}
        />
      ),
      valueGetter: (_value: any, row: LeaveRequest) => getStatusLabel(row.status),
    },
    {
      field: 'progress',
      headerName: 'Progress',
      flex: 1.8,
      minWidth: 240,
      sortable: false,
      filterable: false,
      renderCell: (params: any) => <ApprovalChainCell request={params.row} />,
    },
    {
      field: 'pending_with',
      headerName: 'Pending With',
      flex: 1.2,
      minWidth: 150,
      valueGetter: (_value: any, row: LeaveRequest) => {
        const isPending = [
          LeaveStatus.PendingSupervisor,
          LeaveStatus.PendingManager,
          LeaveStatus.PendingHR,
          LeaveStatus.PendingHRDirector,
        ].includes(row.status);
        if (!isPending) return '—';
        if (userId && row.current_assignee_id === userId) return 'You';
        if (!row.current_assignee_id) {
          if (row.status === LeaveStatus.PendingHR) return 'All HR';
          if (row.status === LeaveStatus.PendingHRDirector) return 'All HR Directors';
        }
        return row.current_assignee?.full_name || row.current_assignee_role || '—';
      },
    },
    {
      field: 'pending_since',
      headerName: 'Pending Since',
      flex: 1,
      minWidth: 140,
      valueGetter: (_value: any, row: LeaveRequest) =>
        row.pending_since ? formatPendingSince(row.pending_since) : '—',
    },
    {
      field: 'resolved_at',
      headerName: 'Resolved On',
      flex: 1.2,
      minWidth: 160,
      valueGetter: (_value: any, row: LeaveRequest) =>
        row.resolved_at
          ? new Date(row.resolved_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })
          : '—',
    },
  ];

  return (
    <MuiThemeProvider isDark={isDark}>
      <div style={{ height: '100%', width: '100%' }}>
        <DataGrid
          rows={data}
          columns={columns}
          disableRowSelectionOnClick
          onRowClick={(params: any) => onRowClick(params.row)}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 300 },
            },
          }}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          pageSizeOptions={[10, 25, 50]}
          rowHeight={56}
          getRowClassName={(params: any) =>
            userId && params.row.current_assignee_id === userId ? 'highlight-row' : ''
          }
          sx={{
            borderRadius: 3,
            '& .highlight-row': {
              backgroundColor: isDark ? 'rgba(37, 99, 235, 0.12) !important' : 'rgba(37, 99, 235, 0.06) !important',
            },
            '& .MuiDataGrid-row': { cursor: 'pointer' },
          }}
        />
      </div>
    </MuiThemeProvider>
  );
}

// ─── Web: Document Renewals DataGrid ──────────────────────────────────

function WebDocumentRenewalsTable({
  data,
  isDark,
  onRenew,
}: {
  data: RenewalTask[];
  isDark: boolean;
  onRenew: (taskId: string, newExpiryDate: string) => void;
}) {
  const [renewDialog, setRenewDialog] = useState<{ open: boolean; task: RenewalTask | null }>({ open: false, task: null });
  const [newExpiry, setNewExpiry] = useState('');
  const [paginationModel, setPaginationModel] = useViewState(
    'tabs/tasks.renewals.pagination',
    { page: 0, pageSize: 25 }
  );
  const [sortModel, setSortModel] = useViewState<any[]>('tabs/tasks.renewals.sort', []);

  function daysRemaining(expiry?: string | null): number | null {
    if (!expiry) return null;
    const d = new Date(expiry);
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.floor((d.getTime() - today.getTime()) / 86400000);
  }

  const openRenewDialog = (task: RenewalTask) => {
    setNewExpiry('');
    setRenewDialog({ open: true, task });
  };

  const handleConfirmRenew = () => {
    if (renewDialog.task && newExpiry) {
      onRenew(renewDialog.task.id, newExpiry);
      setRenewDialog({ open: false, task: null });
    }
  };

  const columns = [
    {
      field: 'task_number',
      headerName: 'Task #',
      flex: 0.9,
      minWidth: 130,
    },
    {
      field: 'employee_name',
      headerName: 'Employee',
      flex: 1.3,
      minWidth: 160,
      valueGetter: (_value: any, row: RenewalTask) => row.employee?.full_name || '—',
      renderCell: (params: any) => {
        const row = params.row as RenewalTask;
        return (
          <div style={{ overflow: 'hidden', lineHeight: 1.3 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {row.employee?.full_name || '—'}
            </div>
            <div style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {row.employee?.department || '—'}
            </div>
          </div>
        );
      },
    },
    {
      field: 'document_type',
      headerName: 'Document',
      flex: 0.8,
      minWidth: 110,
      renderCell: (params: any) => (
        <Chip
          label={params.row.document_type.charAt(0).toUpperCase() + params.row.document_type.slice(1)}
          size="small"
          color="default"
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: 12 }}
        />
      ),
    },
    {
      field: 'expiry_date',
      headerName: 'Expiry Date',
      flex: 0.9,
      minWidth: 120,
      renderCell: (params: any) => {
        const days = daysRemaining(params.row.expiry_date);
        const isUrgent = days !== null && days <= 30;
        return (
          <span style={{ color: isUrgent ? '#EF4444' : undefined, fontWeight: isUrgent ? 700 : 400 }}>
            {params.row.expiry_date || '—'}
          </span>
        );
      },
    },
    {
      field: 'days_left',
      headerName: 'Days Left',
      width: 90,
      valueGetter: (_value: any, row: RenewalTask) => daysRemaining(row.expiry_date),
      renderCell: (params: any) => {
        const days = daysRemaining(params.row.expiry_date);
        if (days === null) return <span style={{ color: '#6B7280' }}>—</span>;
        const color = days < 0 ? '#EF4444' : days <= 7 ? '#F97316' : days <= 30 ? '#F59E0B' : '#16A34A';
        return <span style={{ fontWeight: 700, color }}>{days}</span>;
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 110,
      renderCell: (params: any) => (
        <Chip
          label={TASK_STATUS_LABELS[params.row.status] || params.row.status}
          size="small"
          color={TASK_STATUS_MAP[params.row.status] || 'default'}
          variant="filled"
          sx={{ fontWeight: 600, fontSize: 12 }}
        />
      ),
    },
    {
      field: 'assigned_by_name',
      headerName: 'Assigned By',
      flex: 1,
      minWidth: 130,
      valueGetter: (_value: any, row: RenewalTask) => row.assigned_by?.full_name || '—',
    },
    {
      field: 'assigned_at',
      headerName: 'Assigned Since',
      flex: 1,
      minWidth: 140,
      valueGetter: (_value: any, row: RenewalTask) =>
        row.assigned_at ? formatPendingSince(row.assigned_at) : '—',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      minWidth: 100,
      sortable: false,
      filterable: false,
      renderCell: (params: any) => {
        const row = params.row as RenewalTask;
        if (row.status === RenewalTaskStatus.Completed) {
          return <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>Renewed</span>;
        }
        if (row.status === RenewalTaskStatus.Cancelled) {
          return <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Cancelled</span>;
        }
        return (
          <MuiButton
            size="small"
            variant="contained"
            color="primary"
            onClick={(e: any) => { e.stopPropagation(); openRenewDialog(row); }}
            sx={{ fontSize: 11, fontWeight: 700, textTransform: 'none', minWidth: 70 }}
          >
            Renew
          </MuiButton>
        );
      },
    },
  ];

  return (
    <MuiThemeProvider isDark={isDark}>
      <div style={{ height: '100%', width: '100%' }}>
        <DataGrid
          rows={data}
          columns={columns}
          disableRowSelectionOnClick
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 300 },
            },
          }}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          pageSizeOptions={[10, 25, 50]}
          rowHeight={56}
          sx={{
            borderRadius: 3,
            '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
          }}
        />
      </div>

      {/* Renew Dialog */}
      {renewDialog.task && (
        <Dialog open={renewDialog.open} onClose={() => setRenewDialog({ open: false, task: null })} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Renew Document</DialogTitle>
          <DialogContent>
            <div style={{ marginBottom: 16, fontSize: 14 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Employee:</strong> {renewDialog.task.employee?.full_name || '—'}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Document:</strong> {renewDialog.task.document_type.charAt(0).toUpperCase() + renewDialog.task.document_type.slice(1)}
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong>Current Expiry:</strong>{' '}
                <span style={{ color: '#EF4444', fontWeight: 600 }}>{renewDialog.task.expiry_date}</span>
              </div>
            </div>
            <TextField
              label="New Expiry Date"
              type="date"
              value={newExpiry}
              onChange={(e: any) => setNewExpiry(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: new Date().toISOString().split('T')[0] }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <MuiButton onClick={() => setRenewDialog({ open: false, task: null })} color="inherit">
              Cancel
            </MuiButton>
            <MuiButton
              onClick={handleConfirmRenew}
              variant="contained"
              color="primary"
              disabled={!newExpiry}
              sx={{ fontWeight: 700 }}
            >
              Confirm Renewal
            </MuiButton>
          </DialogActions>
        </Dialog>
      )}
    </MuiThemeProvider>
  );
}

// ─── Mobile: Document Renewal Card ────────────────────────────────────

function RenewalTaskCard({
  task,
  onRenew,
}: {
  task: RenewalTask;
  onRenew: () => void;
}) {
  const isPending = task.status === RenewalTaskStatus.Pending;
  const isInProgress = task.status === RenewalTaskStatus.InProgress;
  const isActive = isPending || isInProgress;

  function daysLeft(): number | null {
    if (!task.expiry_date) return null;
    const d = new Date(task.expiry_date);
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.floor((d.getTime() - today.getTime()) / 86400000);
  }

  const days = daysLeft();

  return (
    <View
      className={`mb-3 p-4 rounded-xl border ${
        isActive
          ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
          : 'border-border dark:border-slate-700 bg-surface dark:bg-slate-800'
      }`}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-xs text-text-muted dark:text-slate-400 mb-0.5">{task.task_number}</Text>
          <Text className="text-base font-bold text-text-primary dark:text-white">
            {task.employee?.full_name || '—'}
          </Text>
          <Text className="text-xs text-text-muted dark:text-slate-400">
            {task.employee?.department || '—'}
          </Text>
        </View>
        <View
          className={`px-2 py-1 rounded-md ${
            isPending ? 'bg-amber-100 dark:bg-amber-900/20' :
            isInProgress ? 'bg-blue-100 dark:bg-blue-900/20' :
            task.status === RenewalTaskStatus.Completed ? 'bg-green-100 dark:bg-green-900/20' :
            'bg-gray-100 dark:bg-gray-800'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              isPending ? 'text-amber-600 dark:text-amber-400' :
              isInProgress ? 'text-blue-600 dark:text-blue-400' :
              task.status === RenewalTaskStatus.Completed ? 'text-green-600 dark:text-green-400' :
              'text-gray-600 dark:text-gray-400'
            }`}
          >
            {TASK_STATUS_LABELS[task.status] || task.status}
          </Text>
        </View>
      </View>

      {/* Document info */}
      <View className="flex-row justify-between items-center mb-2 py-1.5 px-3 rounded-lg bg-background dark:bg-slate-900/50">
        <Text className="text-xs font-semibold text-text-muted dark:text-slate-400">
          {task.document_type.charAt(0).toUpperCase() + task.document_type.slice(1)}
        </Text>
        <Text className="text-xs text-text-muted dark:text-slate-400">
          Expires: {task.expiry_date}
        </Text>
        {days !== null && (
          <Text
            className={`text-xs font-bold ${
              days < 0 ? 'text-red-500' : days <= 7 ? 'text-orange-500' : days <= 30 ? 'text-amber-500' : 'text-green-500'
            }`}
          >
            {days}d
          </Text>
        )}
      </View>

      {/* Meta */}
      <Text className="text-xs text-text-muted dark:text-slate-400 mb-2">
        Assigned by {task.assigned_by?.full_name || '—'}
        {task.assigned_at ? ` · ${formatPendingSince(task.assigned_at)}` : ''}
      </Text>

      {/* Actions */}
      {isActive && (
        <Pressable onPress={onRenew} className="py-2.5 rounded-lg bg-blue-600 items-center mt-1">
          <Text className="text-sm font-bold text-white">Renew</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────

export default function TasksScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const {
    pendingApprovals,
    chainRequests,
    loading,
    chainLoading,
    fetchPendingApprovals,
    fetchChainRequests,
  } = useApprovals();
  const {
    myTasks: renewalTasks,
    loading: renewalLoading,
    fetchMyTasks: fetchRenewalTasks,
    completeTask,
  } = useRenewalTasks();
  const setPendingCount = useTaskStore((s) => s.setPendingCount);
  const setRenewalTaskCount = useTaskStore((s) => s.setRenewalTaskCount);
  const [activeTab, setActiveTab] = useViewState('tabs/tasks.activeTab', 0);
  const [mobileRenewTask, setMobileRenewTask] = useState<RenewalTask | null>(null);
  const [mobileNewExpiry, setMobileNewExpiry] = useState('');

  const isHR = user && (user.role === Role.HR || user.role === Role.HRDirector);

  // Keep sidebar badge in sync
  useEffect(() => {
    setPendingCount(pendingApprovals.length);
  }, [pendingApprovals.length]);

  useEffect(() => {
    setRenewalTaskCount(renewalTasks.length);
  }, [renewalTasks.length]);

  useAutoRefresh(() => {
    if (!user) return;
    fetchPendingApprovals(user.id, user.role);
    fetchChainRequests(user.id, user.role);
    if (user.role === Role.HR || user.role === Role.HRDirector) {
      fetchRenewalTasks(user.id);
    }
  }, [user?.id]);

  const handleRowPress = (request: LeaveRequest) => {
    router.push(`/(app)/requests/${request.id}` as any);
  };

  const handleRenew = async (taskId: string, newExpiryDate: string) => {
    if (!user) return;
    try {
      await completeTask(taskId, user.id, newExpiryDate);
    } catch {}
  };

  // Determine visible tabs — only show Document Renewals for HR roles
  const visibleTabs = isHR ? TABS : TABS.slice(0, 2);

  // Get data for current tab
  const getLeaveData = () => (activeTab === 0 ? pendingApprovals : chainRequests);
  const getIsLoading = () =>
    activeTab === 0 ? loading : activeTab === 1 ? chainLoading : renewalLoading;

  return (
    <View className="flex-1 bg-background dark:bg-slate-900">
      {/* Tab bar */}
      <View className="flex-row border-b border-border dark:border-slate-700">
        {visibleTabs.map((tab, i) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(i)}
            className={`flex-1 py-3 items-center border-b-2 ${
              activeTab === i ? 'border-primary' : 'border-transparent'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                activeTab === i ? 'text-primary' : 'text-text-muted dark:text-slate-400'
              }`}
            >
              {tab}
              {i === 0 && pendingApprovals.length > 0 ? ` (${pendingApprovals.length})` : ''}
              {i === 1 && chainRequests.length > 0 ? ` (${chainRequests.length})` : ''}
              {i === 2 && renewalTasks.length > 0 ? ` (${renewalTasks.length})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      {activeTab <= 1 ? (
        /* Tab 0 & 1: Leave Requests */
        isWeb ? (
          <View style={{ flex: 1, padding: 16, paddingTop: 8 }}>
            {getLeaveData().length > 0 || getIsLoading() ? (
              <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
                <WebLeaveRequestsTable
                  data={getLeaveData()}
                  isDark={isDark}
                  userId={activeTab === 1 ? user?.id : undefined}
                  onRowClick={handleRowPress}
                  stateKey={activeTab === 0 ? 'pending' : 'all'}
                />
              </View>
            ) : (
              <EmptyState
                title={activeTab === 0 ? 'No pending leave requests' : 'No leave requests found'}
                description={
                  activeTab === 0
                    ? 'All caught up! No leave requests need your attention right now.'
                    : 'No leave requests from your team yet.'
                }
              />
            )}
          </View>
        ) : (
          <FlatList
            data={getLeaveData()}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingTop: 16, flexGrow: 1 }}
            renderItem={({ item }) => (
              <RequestCard
                request={item}
                showEmployee
                highlightAssignee={activeTab === 1 ? user?.id : undefined}
                onPress={() => handleRowPress(item)}
              />
            )}
            ListEmptyComponent={
              !getIsLoading() ? (
                <EmptyState
                  title={activeTab === 0 ? 'No pending leave requests' : 'No leave requests found'}
                  description={
                    activeTab === 0
                      ? 'All caught up! No leave requests need your attention right now.'
                      : 'No leave requests from your team yet.'
                  }
                />
              ) : null
            }
          />
        )
      ) : (
        /* Tab 2: Document Renewals */
        isWeb ? (
          <View style={{ flex: 1, padding: 16, paddingTop: 8 }}>
            {renewalTasks.length > 0 || renewalLoading ? (
              <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
                <WebDocumentRenewalsTable
                  data={renewalTasks}
                  isDark={isDark}
                  onRenew={handleRenew}
                />
              </View>
            ) : (
              <EmptyState
                title="No document renewals"
                description="No document renewal tasks assigned to you."
              />
            )}
          </View>
        ) : (
          <FlatList
            data={renewalTasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingTop: 16, flexGrow: 1 }}
            renderItem={({ item }) => (
              <RenewalTaskCard
                task={item}
                onRenew={() => setMobileRenewTask(item)}
              />
            )}
            ListEmptyComponent={
              !renewalLoading ? (
                <EmptyState
                  title="No renewal tasks"
                  description="No document renewal tasks assigned to you."
                />
              ) : null
            }
          />
        )
      )}

      {/* Mobile Renew Modal */}
      {!isWeb && (
        <Modal
          visible={!!mobileRenewTask}
          transparent
          animationType="slide"
          onRequestClose={() => setMobileRenewTask(null)}
        >
          <Pressable
            className="flex-1 bg-black/50 justify-end"
            onPress={() => setMobileRenewTask(null)}
          >
            <Pressable
              className="bg-white dark:bg-slate-800 rounded-t-2xl p-6"
              onPress={() => {}}
            >
              <Text className="text-lg font-bold text-text-primary dark:text-white mb-4">
                Renew Document
              </Text>
              {mobileRenewTask && (
                <>
                  <Text className="text-sm text-text-secondary dark:text-slate-300 mb-1">
                    <Text className="font-semibold">Employee:</Text> {mobileRenewTask.employee?.full_name || '—'}
                  </Text>
                  <Text className="text-sm text-text-secondary dark:text-slate-300 mb-1">
                    <Text className="font-semibold">Document:</Text> {mobileRenewTask.document_type.charAt(0).toUpperCase() + mobileRenewTask.document_type.slice(1)}
                  </Text>
                  <Text className="text-sm text-text-secondary dark:text-slate-300 mb-4">
                    <Text className="font-semibold">Current Expiry:</Text>{' '}
                    <Text className="text-red-500 font-semibold">{mobileRenewTask.expiry_date}</Text>
                  </Text>
                  <Text className="text-xs font-semibold text-text-muted dark:text-slate-400 mb-1.5">
                    New Expiry Date
                  </Text>
                  <TextInput
                    className="border border-border dark:border-slate-600 rounded-lg px-4 py-3 text-sm text-text-primary dark:text-white bg-background dark:bg-slate-900 mb-5"
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    value={mobileNewExpiry}
                    onChangeText={setMobileNewExpiry}
                    keyboardType="numbers-and-punctuation"
                  />
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={() => setMobileRenewTask(null)}
                      className="flex-1 py-3 rounded-lg bg-surface dark:bg-slate-700 border border-border dark:border-slate-600 items-center"
                    >
                      <Text className="text-sm font-semibold text-text-muted dark:text-slate-400">Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (mobileRenewTask && mobileNewExpiry) {
                          handleRenew(mobileRenewTask.id, mobileNewExpiry);
                          setMobileRenewTask(null);
                          setMobileNewExpiry('');
                        }
                      }}
                      className={`flex-1 py-3 rounded-lg items-center ${mobileNewExpiry ? 'bg-blue-600' : 'bg-blue-400'}`}
                      disabled={!mobileNewExpiry}
                    >
                      <Text className="text-sm font-bold text-white">Confirm Renewal</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
