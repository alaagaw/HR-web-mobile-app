import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useColorScheme } from 'nativewind';
import {
  Clock,
  CalendarDays,
  Zap,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ChevronRight,
  Bell,
} from 'lucide-react-native';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RequestCard } from '@/components/leave/request-card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useBalance } from '@/hooks/use-balance';
import { useLeaveRequest } from '@/hooks/use-leave-request';
import { useApprovals } from '@/hooks/use-leave-approvals';
import { useRenewalTasks } from '@/hooks/use-renewal-tasks';
import { useNotifications } from '@/hooks/use-notifications';
import { useNotificationStore } from '@/stores/notification-store';
import { useTaskStore } from '@/stores/task-store';
import { Role, LeaveStatus, LeaveType, RenewalTaskStatus } from '@/types/enums';
import { getStatusLabel, getLeaveTypeLabel, getLeaveTypeMuiColor } from '@/lib/state-machine';
import { formatHours, formatDaysHours, formatDateRange, formatPendingSince, getRoleLabel } from '@/lib/utils';
import type { LeaveRequest, AppNotification, RenewalTask } from '@/types/models';

const isWeb = Platform.OS === 'web';

// Lazy-load MUI components only on web
let DataGrid: any;
let MuiThemeProvider: any;
let Chip: any;
let MuiButton: any;
let Dialog: any;
let DialogTitle: any;
let DialogContent: any;
let DialogActions: any;
let TextField: any;
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
}

// ─── Enterprise Design Tokens ────────────────────────────────────────
// Semantic color system: blue=info, yellow=warning, red=danger, green=success

const DT = {
  // Background
  bgMain: '#0b1220',
  bgGradient: 'linear-gradient(180deg, #0b1220 0%, #0f172a 100%)',

  // Card surface
  cardBg: '#111a2e',
  cardBorder: 'rgba(255,255,255,0.06)',
  cardShadow: '0 10px 30px rgba(0,0,0,0.35)',

  // Info (blue) — informational metrics
  infoBg: 'rgba(59,130,246,0.15)',
  infoBorder: '#3b82f6',
  infoText: '#93c5fd',

  // Danger (red) — risk / limit / alert
  dangerBg: 'rgba(239,68,68,0.15)',
  dangerBorder: '#ef4444',
  dangerText: '#fca5a5',

  // Warning (yellow) — requires attention
  warningBg: 'rgba(245,158,11,0.15)',
  warningBorder: '#f59e0b',
  warningText: '#fcd34d',

  // Success (green) — completed / approved
  successBg: 'rgba(34,197,94,0.15)',
  successBorder: '#22c55e',
  successText: '#86efac',

  // Sub-widget rows
  subBg: 'rgba(255,255,255,0.03)',
  subHover: 'rgba(255,255,255,0.06)',

  // Action panel (highlighted container)
  actionBg: '#16213e',
  actionBorder: 'rgba(59,130,246,0.25)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Accent
  accent: '#3b82f6',
};

// Light-mode fallbacks
const LT = {
  bgMain: '#F8FAFC',
  cardBg: '#FFFFFF',
  cardBorder: '#E2E8F0',
  cardShadow: '0 4px 12px rgba(0,0,0,0.06)',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  subBg: '#F8FAFC',
  actionBg: '#FFFFFF',
  actionBorder: '#E2E8F0',
  accent: '#2563EB',
};

function t(isDark: boolean) {
  return isDark ? DT : LT;
}

// ─── Status chip color map ──────────────────────────────────────────

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

// ─── Web Components ──────────────────────────────────────────────────

/** Action Required Card — left column */
function ActionRequiredCard({
  pendingApprovals,
  renewalTasks,
  notifications,
  isDark,
  isApprover,
  onApprove,
  onViewRequest,
  onRenew,
  onViewAllNotifications,
  onViewAllApprovals,
  onViewAllRenewals,
}: {
  pendingApprovals: LeaveRequest[];
  renewalTasks: RenewalTask[];
  notifications: AppNotification[];
  isDark: boolean;
  isApprover: boolean;
  onApprove: (request: LeaveRequest) => void;
  onViewRequest: (request: LeaveRequest) => void;
  onRenew: (task: RenewalTask) => void;
  onViewAllNotifications: () => void;
  onViewAllApprovals: () => void;
  onViewAllRenewals: () => void;
}) {
  const tk = t(isDark);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const totalCount = (isApprover ? pendingApprovals.length : 0) + renewalTasks.length + (unreadCount || 0);
  const recent = notifications.slice(0, 3);

  return (
    <div
      style={{
        backgroundColor: isDark ? DT.actionBg : tk.cardBg,
        border: `1px solid ${isDark ? DT.actionBorder : tk.cardBorder}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: tk.cardShadow,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: `1px solid ${isDark ? DT.cardBorder : tk.cardBorder}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={20} color={DT.warningBorder} />
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: tk.textPrimary,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.03em',
            }}
          >
            Action Required
          </span>
          {totalCount > 0 && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: tk.accent,
                color: '#FFFFFF',
                borderRadius: 10,
                padding: '2px 8px',
                minWidth: 20,
                textAlign: 'center' as const,
              }}
            >
              {totalCount}
            </span>
          )}
        </div>
        <span onClick={onViewAllApprovals} style={{ cursor: 'pointer', display: 'flex' }}>
          <ChevronRight size={20} color={tk.textMuted} />
        </span>
      </div>

      {/* Pending Your Approval */}
      {isApprover && pendingApprovals.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px 10px' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>
              Pending Your Approval
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: DT.warningBorder,
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '1px 7px',
              }}
            >
              {pendingApprovals.length}
            </span>
          </div>
          {pendingApprovals.slice(0, 4).map((req) => (
            <div
              key={req.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: `1px solid ${isDark ? DT.cardBorder : '#F1F5F9'}`,
                backgroundColor: isDark ? DT.subBg : '#FAFBFC',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: tk.textPrimary }}>
                    {req.employee?.full_name || '—'}
                  </span>
                  <span style={{ fontSize: 13, color: tk.textSecondary }}>
                    {getLeaveTypeLabel(req.leave_type)}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: tk.textMuted }}>
                  {formatDateRange(req.start_date, req.end_date)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <MuiButton
                  variant="contained"
                  size="small"
                  color="success"
                  onClick={(e: any) => {
                    e.stopPropagation();
                    onApprove(req);
                  }}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    borderRadius: '8px',
                    px: 2,
                    py: 0.5,
                    minWidth: 0,
                  }}
                >
                  Approve
                </MuiButton>
                <MuiButton
                  variant="contained"
                  size="small"
                  color="error"
                  onClick={(e: any) => {
                    e.stopPropagation();
                    onViewRequest(req);
                  }}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    borderRadius: '8px',
                    px: 2,
                    py: 0.5,
                    minWidth: 0,
                  }}
                >
                  Reject
                </MuiButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Renewals */}
      {renewalTasks.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>
                Document Renewals
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  borderRadius: 8,
                  padding: '1px 7px',
                }}
              >
                {renewalTasks.length}
              </span>
            </div>
            {renewalTasks.length > 4 && (
              <span
                onClick={onViewAllRenewals}
                style={{ fontSize: 12, fontWeight: 600, color: tk.accent, cursor: 'pointer' }}
              >
                View All
              </span>
            )}
          </div>
          {renewalTasks.slice(0, 4).map((task) => (
            <div
              key={task.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: `1px solid ${isDark ? DT.cardBorder : '#F1F5F9'}`,
                backgroundColor: isDark ? DT.subBg : '#FAFBFC',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: tk.textPrimary }}>
                    {task.employee?.full_name || '—'}
                  </span>
                  <span style={{ fontSize: 13, color: tk.textSecondary }}>
                    {task.document_type}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: tk.textMuted }}>
                  Expires {task.expiry_date} · {task.task_number}
                </div>
              </div>
              <MuiButton
                variant="contained"
                size="small"
                onClick={(e: any) => {
                  e.stopPropagation();
                  onRenew(task);
                }}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  borderRadius: '8px',
                  px: 2,
                  py: 0.5,
                  minWidth: 0,
                }}
              >
                Renew
              </MuiButton>
            </div>
          ))}
        </div>
      )}

      {/* No action required fallback */}
      {(!isApprover || pendingApprovals.length === 0) && renewalTasks.length === 0 && (
        <div
          style={{
            padding: '20px',
            textAlign: 'center' as const,
            color: tk.textMuted,
            fontSize: 13,
            borderBottom: `1px solid ${isDark ? DT.cardBorder : tk.cardBorder}`,
          }}
        >
          No action required
        </div>
      )}

      {/* Urgent Notifications */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px 10px',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>
            Urgent Notifications
          </span>
          <span
            onClick={onViewAllNotifications}
            style={{
              fontSize: 13,
              color: tk.accent,
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            View All <ArrowRight size={14} color={tk.accent} />
          </span>
        </div>
        {recent.length === 0 ? (
          <div
            style={{
              padding: '16px 20px',
              fontSize: 13,
              color: tk.textMuted,
              textAlign: 'center' as const,
            }}
          >
            No new notifications
          </div>
        ) : (
          <div style={{ padding: '0 12px 12px' }}>
            {recent.map((n) => (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 8px',
                  borderRadius: 8,
                  backgroundColor: !n.is_read
                    ? isDark
                      ? 'rgba(59,130,246,0.08)'
                      : 'rgba(37,99,235,0.04)'
                    : isDark
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(0,0,0,0.01)',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: !n.is_read ? tk.accent : isDark ? '#334155' : '#CBD5E1',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: !n.is_read
                        ? isDark ? '#E2E8F0' : '#0F172A'
                        : isDark ? '#94A3B8' : '#475569',
                      fontWeight: n.is_read ? 500 : 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const,
                    }}
                  >
                    {n.title}
                  </div>
                  {n.body && (
                    <div
                      style={{
                        fontSize: 12,
                        color: tk.textMuted,
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' as const,
                      }}
                    >
                      {n.body}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: tk.textMuted, flexShrink: 0 }}>
                  {formatPendingSince(n.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Recent Requests DataGrid table — full-width bottom section */
function WebRecentRequestsTable({
  data,
  isDark,
  onRowClick,
}: {
  data: LeaveRequest[];
  isDark: boolean;
  onRowClick: (r: LeaveRequest) => void;
}) {
  const tk = t(isDark);

  const columns = [
    { field: 'case_number', headerName: 'CASE #', flex: 1, minWidth: 130 },
    {
      field: 'leave_type',
      headerName: 'TYPE',
      flex: 0.7,
      minWidth: 90,
      renderCell: (params: any) => (
        <Chip
          label={getLeaveTypeLabel(params.row.leave_type)}
          size="small"
          color={getLeaveTypeMuiColor(params.row.leave_type)}
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: 12 }}
        />
      ),
      valueGetter: (_v: any, row: LeaveRequest) => getLeaveTypeLabel(row.leave_type),
    },
    {
      field: 'dates',
      headerName: 'DATES',
      flex: 1.2,
      minWidth: 140,
      valueGetter: (_v: any, row: LeaveRequest) => formatDateRange(row.start_date, row.end_date),
    },
    {
      field: 'requested_hours',
      headerName: 'HOURS',
      flex: 0.6,
      minWidth: 70,
      type: 'number' as const,
      valueFormatter: (value: number) => formatHours(value),
    },
    {
      field: 'status',
      headerName: 'STATUS',
      flex: 1,
      minWidth: 130,
      renderCell: (params: any) => (
        <Chip
          label={getStatusLabel(params.row.status)}
          size="small"
          color={STATUS_COLOR_MAP[params.row.status] || 'default'}
          variant="filled"
          sx={{ fontWeight: 600, fontSize: 12 }}
        />
      ),
      valueGetter: (_v: any, row: LeaveRequest) => getStatusLabel(row.status),
    },
    {
      field: 'created_at',
      headerName: '',
      flex: 1,
      minWidth: 140,
      sortable: false,
      renderCell: (params: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: tk.textMuted, fontSize: 13 }}>
          <span>{formatPendingSince(params.row.created_at)}</span>
          <ChevronRight size={16} />
        </div>
      ),
    },
  ];

  return (
    <MuiThemeProvider isDark={isDark}>
      <div style={{ width: '100%' }}>
        <DataGrid
          rows={data.slice(0, 5)}
          columns={columns}
          disableRowSelectionOnClick
          onRowClick={(params: any) => onRowClick(params.row)}
          hideFooter
          rowHeight={52}
          autoHeight
          disableColumnMenu
          disableColumnFilter
          sx={{
            border: 'none',
            '& .MuiDataGrid-row': { cursor: 'pointer' },
            '& .MuiDataGrid-cell': {
              borderBottom: `1px solid ${isDark ? DT.cardBorder : '#F1F5F9'}`,
            },
            '& .MuiDataGrid-columnHeaders': {
              borderBottom: `1px solid ${isDark ? DT.cardBorder : '#E2E8F0'}`,
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: tk.textSecondary,
            },
          }}
        />
      </div>
    </MuiThemeProvider>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { balances, emergencyCount, fetchBalance, fetchEmergencyCount } = useBalance();
  const { requests, fetchMyRequests } = useLeaveRequest();
  const { pendingApprovals, fetchPendingApprovals, approve } = useApprovals();
  const { myTasks: renewalTasks, fetchMyTasks: fetchRenewalTasks, completeTask } = useRenewalTasks();
  const setPendingCount = useTaskStore((s) => s.setPendingCount);
  const setRenewalTaskCount = useTaskStore((s) => s.setRenewalTaskCount);
  const { notifications, fetchNotifications } = useNotifications(user?.id);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  useAutoRefresh(() => {
    if (!user) return;
    fetchBalance(user.id);
    fetchEmergencyCount(user.id);
    fetchMyRequests(user.id);
    fetchNotifications();

    const isApproverRole = [Role.Supervisor, Role.Manager, Role.HR, Role.HRDirector].includes(user.role);
    if (isApproverRole) {
      fetchPendingApprovals(user.id, user.role);
    }
    fetchRenewalTasks(user.id);
  }, [user?.id]);

  // Keep sidebar badge in sync
  useEffect(() => {
    setPendingCount(pendingApprovals.length);
  }, [pendingApprovals.length]);

  useEffect(() => {
    setRenewalTaskCount(renewalTasks.length);
  }, [renewalTasks.length]);

  const ptoBalance = balances.find((b) => b.leave_type === 'pto');
  const pendingRequests = requests.filter((r) =>
    ['submitted', 'pending_supervisor', 'pending_manager', 'pending_hr', 'pending_hr_director'].includes(r.status),
  );
  const recentRequests = requests.slice(0, 5);

  const isApprover = user && [Role.Supervisor, Role.Manager, Role.HR, Role.HRDirector].includes(user.role);

  // Stats for header bar
  const now = new Date();
  const monthApproved = requests.filter((r) => {
    const d = new Date(r.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && r.status === LeaveStatus.Approved;
  }).length;
  const monthRejected = requests.filter((r) => {
    const d = new Date(r.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && r.status === LeaveStatus.Rejected;
  }).length;
  const pendingHoursTotal = pendingRequests.reduce((sum, r) => sum + r.requested_hours, 0);

  const handleRowPress = (request: LeaveRequest) => {
    router.push(`/(app)/requests/${request.id}` as any);
  };

  const handleApprove = async (request: LeaveRequest) => {
    if (!user) return;
    try {
      await approve(request.id, user.id);
      fetchPendingApprovals(user.id, user.role);
      fetchMyRequests(user.id);
    } catch (err: any) {
      if (err.message?.startsWith('ALREADY_HANDLED')) {
        if (Platform.OS === 'web') {
          window.alert('This request has already been handled by another user.');
        } else {
          Alert.alert('Already Handled', 'This request has already been processed by another user.');
        }
        fetchPendingApprovals(user.id, user.role);
      }
    }
  };

  // Renew dialog state (web only)
  const [renewDialog, setRenewDialog] = useState<{ open: boolean; task: RenewalTask | null }>({ open: false, task: null });
  const [newExpiry, setNewExpiry] = useState('');

  const handleRenew = async (taskId: string, newExpiryDate: string) => {
    if (!user) return;
    try {
      await completeTask(taskId, user.id, newExpiryDate);
      setRenewDialog({ open: false, task: null });
      setNewExpiry('');
      fetchRenewalTasks(user.id);
    } catch {
      // Error handled by hook
    }
  };

  // ─── Web Layout ──────────────────────────────────────────────────

  if (isWeb) {
    const tk = t(isDark);

    const headerChips: { icon: any; label: string; value: string | number; color: string; textColor: string; bg: string }[] = [
      { icon: CheckCircle2, label: 'Approved', value: monthApproved, color: DT.successBorder, textColor: isDark ? DT.successText : '#16A34A', bg: isDark ? DT.successBg : '#F0FDF4' },
      { icon: XCircle, label: 'Rejected', value: monthRejected, color: DT.dangerBorder, textColor: isDark ? DT.dangerText : '#DC2626', bg: isDark ? DT.dangerBg : '#FEF2F2' },
      { icon: TrendingUp, label: 'Pending', value: formatHours(pendingHoursTotal), color: DT.warningBorder, textColor: isDark ? DT.warningText : '#D97706', bg: isDark ? DT.warningBg : '#FFFBEB' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column' as const, height: '100%' }}>
        {/* ─── Sticky Header Bar ─── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '12px 28px',
            backgroundColor: isDark ? '#0b1220' : '#FFFFFF',
            borderBottom: `1px solid ${isDark ? DT.cardBorder : '#E2E8F0'}`,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: tk.textPrimary, marginRight: 8 }}>
            Dashboard
          </span>

          {/* Stat chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            {headerChips.map((chip) => (
              <div
                key={chip.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 8,
                  backgroundColor: chip.bg,
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'transparent'}`,
                }}
              >
                <chip.icon size={14} color={chip.color} />
                <span style={{ fontSize: 12, color: tk.textSecondary, fontWeight: 500 }}>{chip.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: chip.textColor }}>{chip.value}</span>
              </div>
            ))}

            {/* Awaiting you chip (approvers only) */}
            {isApprover && pendingApprovals.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 8,
                  backgroundColor: isDark ? DT.warningBg : '#FFFBEB',
                  border: `1px solid ${isDark ? 'rgba(245,158,11,0.25)' : '#FDE68A'}`,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? DT.warningText : '#D97706' }}>
                  +{pendingApprovals.length}
                </span>
                <span style={{ fontSize: 12, color: isDark ? DT.warningText : '#92400E', fontWeight: 500 }}>
                  Awaiting your approval
                </span>
              </div>
            )}

            {/* Expired docs chip */}
            {renewalTasks.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 8,
                  backgroundColor: isDark ? DT.dangerBg : '#FEF2F2',
                  border: `1px solid ${isDark ? 'rgba(239,68,68,0.25)' : '#FECACA'}`,
                }}
              >
                <AlertCircle size={14} color={isDark ? DT.dangerText : '#DC2626'} />
                <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? DT.dangerText : '#DC2626' }}>
                  +{renewalTasks.length}
                </span>
                <span style={{ fontSize: 12, color: isDark ? DT.dangerText : '#991B1B', fontWeight: 500 }}>
                  Expired doc{renewalTasks.length > 1 ? 's' : ''} need renewal
                </span>
              </div>
            )}
          </div>

          {/* Notification bell */}
          <div
            onClick={() => router.push('/(app)/notifications' as any)}
            style={{ position: 'relative', cursor: 'pointer', padding: 6 }}
          >
            <Bell size={20} color={isDark ? '#94A3B8' : '#64748B'} />
            {unreadCount > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  backgroundColor: '#DC2626',
                  borderRadius: 10,
                  minWidth: 18,
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingLeft: 4,
                  paddingRight: 4,
                  border: `2px solid ${isDark ? '#0b1220' : '#FFFFFF'}`,
                }}
              >
                <span style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </div>
            )}
          </div>

          {/* Request Time Off button */}
          <Button size="sm" onPress={() => router.push('/(app)/requests/new' as any)}>
            Request Time Off
          </Button>
        </div>

        {/* ─── Scrollable Content ─── */}
        <div
          style={{
            padding: 28,
            overflowY: 'auto' as const,
            flex: 1,
            background: isDark ? DT.bgGradient : LT.bgMain,
          }}
        >
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* Greeting */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: tk.textPrimary }}>
              Hello, {user?.full_name?.split(' ')[0]}
            </div>
            <div
              style={{
                fontSize: 14,
                color: tk.textSecondary,
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isDark ? DT.infoText : '#2563EB',
                  backgroundColor: isDark ? DT.infoBg : '#EFF6FF',
                  borderRadius: 6,
                  padding: '2px 8px',
                }}
              >
                {user ? getRoleLabel(user.role) : ''}
              </span>
            </div>
          </div>

          {/* Action Required — full width */}
          <div style={{ marginBottom: 28 }}>
            <ActionRequiredCard
              pendingApprovals={pendingApprovals}
              renewalTasks={renewalTasks}
              notifications={notifications}
              isDark={isDark}
              isApprover={!!isApprover}
              onApprove={handleApprove}
              onViewRequest={handleRowPress}
              onRenew={(task) => { setRenewDialog({ open: true, task }); setNewExpiry(''); }}
              onViewAllNotifications={() => router.push('/(app)/notifications' as any)}
              onViewAllApprovals={() => router.push('/(app)/(tabs)/tasks' as any)}
              onViewAllRenewals={() => router.push('/(app)/(tabs)/tasks' as any)}
            />
          </div>

          {/* Recent Requests — full width */}
          <div
            style={{
              backgroundColor: tk.cardBg,
              border: `1px solid ${isDark ? DT.cardBorder : tk.cardBorder}`,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: tk.cardShadow,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px 12px',
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: tk.textPrimary,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.03em',
                }}
              >
                Recent Requests
              </span>
              <span
                onClick={() => router.push('/(app)/(tabs)/requests' as any)}
                style={{
                  fontSize: 13,
                  color: tk.accent,
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                View All <ArrowRight size={14} color={tk.accent} />
              </span>
            </div>
            {recentRequests.length > 0 ? (
              <WebRecentRequestsTable data={recentRequests} isDark={isDark} onRowClick={handleRowPress} />
            ) : (
              <div
                style={{
                  padding: '32px 20px',
                  textAlign: 'center' as const,
                  color: tk.textMuted,
                  fontSize: 14,
                }}
              >
                No requests yet. Submit your first leave request!
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Renew Dialog */}
        {renewDialog.task && (
          <MuiThemeProvider isDark={isDark}>
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
                  onClick={() => renewDialog.task && newExpiry && handleRenew(renewDialog.task.id, newExpiry)}
                  variant="contained"
                  color="primary"
                  disabled={!newExpiry}
                  sx={{ fontWeight: 700 }}
                >
                  Confirm Renewal
                </MuiButton>
              </DialogActions>
            </Dialog>
          </MuiThemeProvider>
        )}
      </div>
    );
  }

  // ─── Mobile Layout (unchanged) ────────────────────────────────────

  return (
    <ScrollView className="flex-1 bg-background dark:bg-slate-900" contentContainerStyle={{ padding: 16 }}>
      {/* Greeting */}
      <Text className="text-2xl font-bold text-text-primary dark:text-white mb-1">
        Hello, {user?.full_name?.split(' ')[0]}
      </Text>
      <Text className="text-sm text-text-muted dark:text-slate-400 mb-5">
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </Text>

      {/* Quick action */}
      <Button
        onPress={() => router.push('/(app)/requests/new' as any)}
        fullWidth
        className="mb-5"
      >
        Request Time Off
      </Button>

      {/* Stats row */}
      <View className="flex-row gap-3 mb-5">
        <StatsCard
          title="PTO Balance"
          value={ptoBalance ? formatHours(ptoBalance.balance_hours) : '--'}
          subtitle={ptoBalance ? formatDaysHours(ptoBalance.balance_hours, user?.workday_hours || 8) : undefined}
          icon={CalendarDays}
          iconColor={ptoBalance && ptoBalance.balance_hours <= 0 ? '#DC2626' : '#2563EB'}
          iconBg={ptoBalance && ptoBalance.balance_hours <= 0 ? 'bg-error-light' : 'bg-primary-light'}
          valueClassName={ptoBalance && ptoBalance.balance_hours <= 0 ? 'text-error' : undefined}
          subtitleClassName={ptoBalance && ptoBalance.balance_hours <= 0 ? 'text-error' : undefined}
        />
        <StatsCard
          title="Pending"
          value={pendingRequests.length}
          subtitle="requests"
          icon={Clock}
          iconColor="#F59E0B"
          iconBg="bg-warning-light"
        />
      </View>

      <View className="flex-row gap-3 mb-5">
        <StatsCard
          title="Emergency"
          value={`${emergencyCount}/3`}
          subtitle="this month"
          icon={Zap}
          iconColor="#DC2626"
          iconBg="bg-error-light"
        />
        {isApprover && (
          <StatsCard
            title="Awaiting You"
            value={pendingApprovals.length}
            subtitle="to approve"
            icon={AlertCircle}
            iconColor="#0EA5E9"
            iconBg="bg-info-light"
          />
        )}
      </View>

      {/* Pending approvals (for approvers) */}
      {isApprover && pendingApprovals.length > 0 && (
        <View className="mb-5">
          <Text className="text-base font-semibold text-text-primary dark:text-white mb-3">
            Pending Your Approval
          </Text>
          {pendingApprovals.slice(0, 3).map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              showEmployee
              onPress={() => router.push(`/(app)/requests/${req.id}` as any)}
            />
          ))}
          {pendingApprovals.length > 3 && (
            <Button variant="ghost" onPress={() => router.push('/(app)/(tabs)/tasks' as any)}>
              {`View All (${pendingApprovals.length})`}
            </Button>
          )}
        </View>
      )}

      {/* Document renewals (for HR with assigned tasks) */}
      {renewalTasks.length > 0 && (
        <View className="mb-5">
          <Text className="text-base font-semibold text-text-primary dark:text-white mb-3">
            Document Renewals
          </Text>
          {renewalTasks.slice(0, 3).map((task) => (
            <Pressable
              key={task.id}
              onPress={() => router.push('/(app)/(tabs)/tasks' as any)}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-2 border border-slate-100 dark:border-slate-700"
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-semibold text-text-primary dark:text-white">
                    {task.employee?.full_name || '—'}
                  </Text>
                  <Text className="text-xs text-text-secondary dark:text-slate-400 mt-1">
                    {task.document_type} · Expires {task.expiry_date}
                  </Text>
                </View>
                <View className={`px-2 py-1 rounded-md ${task.status === RenewalTaskStatus.InProgress ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-violet-50 dark:bg-violet-900/20'}`}>
                  <Text className={`text-xs font-semibold ${task.status === RenewalTaskStatus.InProgress ? 'text-amber-600' : 'text-violet-600'}`}>
                    {task.status === RenewalTaskStatus.InProgress ? 'In Progress' : 'Pending'}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
          {renewalTasks.length > 3 && (
            <Button variant="ghost" onPress={() => router.push('/(app)/(tabs)/tasks' as any)}>
              {`View All (${renewalTasks.length})`}
            </Button>
          )}
        </View>
      )}

      {/* Recent requests */}
      {recentRequests.length > 0 && (
        <View className="mb-5">
          <Text className="text-base font-semibold text-text-primary dark:text-white mb-3">
            Recent Requests
          </Text>
          {recentRequests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              onPress={() => router.push(`/(app)/requests/${req.id}` as any)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
