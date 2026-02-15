import { useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
  Users,
} from 'lucide-react-native';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RequestCard } from '@/components/leave/request-card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useBalance } from '@/hooks/use-balance';
import { useLeaveRequest } from '@/hooks/use-leave-request';
import { useApprovals } from '@/hooks/use-approvals';
import { useNotifications } from '@/hooks/use-notifications';
import { useNotificationStore } from '@/stores/notification-store';
import { useApprovalStore } from '@/stores/approval-store';
import { Role, LeaveStatus, LeaveType } from '@/types/enums';
import { getStatusLabel } from '@/lib/state-machine';
import { formatHours, formatDaysHours, formatDateRange, formatPendingSince, getRoleLabel } from '@/lib/utils';
import type { LeaveRequest, AppNotification } from '@/types/models';

const isWeb = Platform.OS === 'web';

// Lazy-load MUI components only on web
let DataGrid: any;
let MuiThemeProvider: any;
let Chip: any;
let MuiButton: any;
if (isWeb) {
  const dg = require('@mui/x-data-grid');
  DataGrid = dg.DataGrid;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  Chip = require('@mui/material/Chip').default;
  MuiButton = require('@mui/material/Button').default;
}

// ─── Web Components ──────────────────────────────────────────────────

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

/** Compact stat card for the MY STATUS row */
function CompactStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  borderColor,
  isDark,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  borderColor: string;
  isDark: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        border: `1px solid ${isDark ? '#475569' : '#E2E8F0'}`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 12,
        padding: '14px 16px',
        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={14} color={borderColor} />
        <span
          style={{
            fontSize: 10,
            color: isDark ? '#94A3B8' : '#64748B',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            fontWeight: 600,
          }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: isDark ? '#FFFFFF' : '#0F172A',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: isDark ? '#64748B' : '#94A3B8', marginTop: 2 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

/** Action Required Card — left column */
function ActionRequiredCard({
  pendingApprovals,
  notifications,
  isDark,
  isApprover,
  onApprove,
  onViewRequest,
  onViewAllNotifications,
  onViewAllApprovals,
}: {
  pendingApprovals: LeaveRequest[];
  notifications: AppNotification[];
  isDark: boolean;
  isApprover: boolean;
  onApprove: (request: LeaveRequest) => void;
  onViewRequest: (request: LeaveRequest) => void;
  onViewAllNotifications: () => void;
  onViewAllApprovals: () => void;
}) {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const totalCount = (isApprover ? pendingApprovals.length : 0) + (unreadCount || 0);
  const recent = notifications.slice(0, 3);

  return (
    <div
      style={{
        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
        border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
        borderRadius: 16,
        overflow: 'hidden',
        borderLeft: `4px solid #2563EB`,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={20} color="#F59E0B" />
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: isDark ? '#FFFFFF' : '#0F172A',
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
                backgroundColor: '#2563EB',
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
          <ChevronRight size={20} color={isDark ? '#64748B' : '#94A3B8'} />
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
                backgroundColor: '#F59E0B',
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
                borderBottom: `1px solid ${isDark ? '#334155' : '#F1F5F9'}`,
                backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : '#FAFBFC',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#FFFFFF' : '#0F172A' }}>
                    {req.employee?.full_name || '—'}
                  </span>
                  <span style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B' }}>
                    {req.leave_type === LeaveType.Emergency ? 'Emergency' : 'PTO'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: isDark ? '#64748B' : '#94A3B8' }}>
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

      {/* No approvals fallback for non-approvers or empty */}
      {(!isApprover || pendingApprovals.length === 0) && (
        <div
          style={{
            padding: '20px',
            textAlign: 'center' as const,
            color: isDark ? '#64748B' : '#94A3B8',
            fontSize: 13,
            borderBottom: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
          }}
        >
          No pending approvals
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
              color: '#2563EB',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            View All <ArrowRight size={14} color="#2563EB" />
          </span>
        </div>
        {recent.length === 0 ? (
          <div
            style={{
              padding: '16px 20px',
              fontSize: 13,
              color: isDark ? '#64748B' : '#94A3B8',
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
                      ? 'rgba(37,99,235,0.08)'
                      : 'rgba(37,99,235,0.04)'
                    : 'transparent',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: !n.is_read ? '#2563EB' : 'transparent',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: isDark ? '#E2E8F0' : '#0F172A',
                      fontWeight: n.is_read ? 400 : 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const,
                    }}
                  >
                    {n.title}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: isDark ? '#64748B' : '#94A3B8', flexShrink: 0 }}>
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

/** My Status Card — right column */
function MyStatusCard({
  ptoBalance,
  pendingCount,
  awaitingCount,
  emergencyCount,
  requests,
  isDark,
  isApprover,
  workdayHours,
  onViewAllNotifications,
}: {
  ptoBalance: { balance_hours: number; used_hours: number } | undefined;
  pendingCount: number;
  awaitingCount: number;
  emergencyCount: number;
  requests: LeaveRequest[];
  isDark: boolean;
  isApprover: boolean;
  workdayHours: number;
  onViewAllNotifications: () => void;
}) {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const monthlyRequests = requests.filter((r) => {
    const d = new Date(r.created_at);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const approved = monthlyRequests.filter((r) => r.status === LeaveStatus.Approved).length;
  const rejected = monthlyRequests.filter((r) => r.status === LeaveStatus.Rejected).length;
  const currentlyPending = requests.filter((r) =>
    ['submitted', 'pending_supervisor', 'pending_manager', 'pending_hr', 'pending_hr_director'].includes(r.status),
  ).length;
  const pendingHours = requests
    .filter((r) =>
      ['submitted', 'pending_supervisor', 'pending_manager', 'pending_hr', 'pending_hr_director'].includes(r.status),
    )
    .reduce((sum, r) => sum + r.requested_hours, 0);
  const totalHoursUsed = requests
    .filter((r) => r.status === LeaveStatus.Approved)
    .reduce((sum, r) => sum + r.requested_hours, 0);

  return (
    <div
      style={{
        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
        border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px 14px' }}>
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: isDark ? '#FFFFFF' : '#0F172A',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.03em',
          }}
        >
          My Status
        </span>
      </div>

      {/* Stat Cards Row */}
      <div style={{ display: 'flex', gap: 10, padding: '0 20px 16px' }}>
        <CompactStatCard
          title="PTO Balance"
          value={ptoBalance ? formatHours(ptoBalance.balance_hours) : '--'}
          subtitle={ptoBalance ? formatDaysHours(ptoBalance.balance_hours, workdayHours) : undefined}
          icon={CalendarDays}
          borderColor={ptoBalance && ptoBalance.balance_hours <= 0 ? '#DC2626' : '#0EA5E9'}
          isDark={isDark}
        />
        <CompactStatCard
          title="Pending"
          value={pendingCount}
          subtitle={pendingCount === 1 ? 'request' : 'requests'}
          icon={Clock}
          borderColor="#F59E0B"
          isDark={isDark}
        />
        {isApprover && (
          <CompactStatCard
            title="Awaiting You"
            value={awaitingCount}
            subtitle="to approve"
            icon={AlertCircle}
            borderColor="#2563EB"
            isDark={isDark}
          />
        )}
      </div>

      {/* Urgent Notifications header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px 10px',
          borderTop: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>
            Urgent Notifications
          </span>
          {unreadCount > 0 && (
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
              {unreadCount}
            </span>
          )}
        </div>
        <span
          onClick={onViewAllNotifications}
          style={{
            fontSize: 13,
            color: '#2563EB',
            cursor: 'pointer',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          View All <ArrowRight size={14} color="#2563EB" />
        </span>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, padding: '4px 20px 12px' }}>
        {[
          { icon: CheckCircle2, color: '#16A34A', label: 'Pending requests', value: formatHours(pendingHours) },
          { icon: XCircle, color: '#DC2626', label: 'Emergencies used', value: emergencyCount },
          { icon: Clock, color: '#F59E0B', label: 'Total hours used', value: formatHours(ptoBalance?.used_hours || 0) },
          { icon: TrendingUp, color: '#2563EB', label: 'Total hours used', value: formatHours(totalHoursUsed) },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: `${item.color}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <item.icon size={14} color={item.color} />
              </div>
              <span style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B' }}>{item.label}</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A' }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Divider + Summary */}
      <div style={{ borderTop: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`, padding: '12px 20px 16px' }}>
        {[
          { icon: Users, color: '#16A34A', label: 'Approved this month', value: approved },
          { icon: XCircle, color: '#DC2626', label: 'Rejected this month', value: rejected },
          { icon: TrendingUp, color: '#F59E0B', label: 'Currently pending', value: currentlyPending },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <item.icon size={16} color={item.color} />
              <span style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B' }}>{item.label}</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A' }}>
              {item.value}
            </span>
          </div>
        ))}
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
  const columns = [
    { field: 'case_number', headerName: 'CASE #', flex: 1, minWidth: 130 },
    {
      field: 'leave_type',
      headerName: 'TYPE',
      flex: 0.7,
      minWidth: 90,
      renderCell: (params: any) => (
        <Chip
          label={params.row.leave_type === LeaveType.Emergency ? 'Emergency' : 'PTO'}
          size="small"
          color={params.row.leave_type === LeaveType.Emergency ? 'error' : 'info'}
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: 12 }}
        />
      ),
      valueGetter: (_v: any, row: LeaveRequest) =>
        row.leave_type === LeaveType.Emergency ? 'Emergency' : 'PTO',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: isDark ? '#64748B' : '#94A3B8', fontSize: 13 }}>
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
              borderBottom: `1px solid ${isDark ? '#334155' : '#F1F5F9'}`,
            },
            '& .MuiDataGrid-columnHeaders': {
              borderBottom: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: isDark ? '#94A3B8' : '#64748B',
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
  const setPendingCount = useApprovalStore((s) => s.setPendingCount);
  const { notifications, fetchNotifications } = useNotifications(user?.id);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      fetchBalance(user.id);
      fetchEmergencyCount(user.id);
      fetchMyRequests(user.id);
      fetchNotifications();

      const isApproverRole = [Role.Supervisor, Role.Manager, Role.HR, Role.HRDirector].includes(user.role);
      if (isApproverRole) {
        fetchPendingApprovals(user.id);
      }
    }, [user?.id]),
  );

  // Keep sidebar badge in sync
  useEffect(() => {
    setPendingCount(pendingApprovals.length);
  }, [pendingApprovals.length]);

  const ptoBalance = balances.find((b) => b.leave_type === 'pto');
  const pendingRequests = requests.filter((r) =>
    ['submitted', 'pending_supervisor', 'pending_manager', 'pending_hr', 'pending_hr_director'].includes(r.status),
  );
  const recentRequests = requests.slice(0, 5);

  const isApprover = user && [Role.Supervisor, Role.Manager, Role.HR, Role.HRDirector].includes(user.role);

  const handleRowPress = (request: LeaveRequest) => {
    router.push(`/(app)/requests/${request.id}` as any);
  };

  const handleApprove = async (request: LeaveRequest) => {
    if (!user) return;
    try {
      await approve(request.id, user.id);
      // Re-fetch to update counts
      fetchPendingApprovals(user.id);
      fetchMyRequests(user.id);
    } catch {
      // Error is handled by the hook
    }
  };

  // ─── Web Layout ──────────────────────────────────────────────────

  if (isWeb) {
    return (
      <div
        style={{
          padding: 28,
          overflowY: 'auto' as const,
          height: '100%',
          backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
        }}
      >
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 28,
            }}
          >
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A' }}>
                Hello, {user?.full_name?.split(' ')[0]}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: isDark ? '#94A3B8' : '#64748B',
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
                    color: '#2563EB',
                    backgroundColor: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF',
                    borderRadius: 6,
                    padding: '2px 8px',
                  }}
                >
                  {user ? getRoleLabel(user.role) : ''}
                </span>
              </div>
            </div>
            <Button onPress={() => router.push('/(app)/requests/new' as any)}>
              Request Time Off
            </Button>
          </div>

          {/* Two-column: Action Required | My Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
            <ActionRequiredCard
              pendingApprovals={pendingApprovals}
              notifications={notifications}
              isDark={isDark}
              isApprover={!!isApprover}
              onApprove={handleApprove}
              onViewRequest={handleRowPress}
              onViewAllNotifications={() => router.push('/(app)/notifications' as any)}
              onViewAllApprovals={() => router.push('/(app)/(tabs)/approvals' as any)}
            />
            <MyStatusCard
              ptoBalance={ptoBalance as any}
              pendingCount={pendingRequests.length}
              awaitingCount={pendingApprovals.length}
              emergencyCount={emergencyCount}
              requests={requests}
              isDark={isDark}
              isApprover={!!isApprover}
              workdayHours={user?.workday_hours || 8}
              onViewAllNotifications={() => router.push('/(app)/notifications' as any)}
            />
          </div>

          {/* Recent Requests — full width */}
          <div
            style={{
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
              borderRadius: 16,
              overflow: 'hidden',
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
                  color: isDark ? '#FFFFFF' : '#0F172A',
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
                  color: '#2563EB',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                View All <ArrowRight size={14} color="#2563EB" />
              </span>
            </div>
            {recentRequests.length > 0 ? (
              <WebRecentRequestsTable data={recentRequests} isDark={isDark} onRowClick={handleRowPress} />
            ) : (
              <div
                style={{
                  padding: '32px 20px',
                  textAlign: 'center' as const,
                  color: isDark ? '#64748B' : '#94A3B8',
                  fontSize: 14,
                }}
              >
                No requests yet. Submit your first leave request!
              </div>
            )}
          </div>
        </div>
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
            <Button variant="ghost" onPress={() => router.push('/(app)/(tabs)/approvals' as any)}>
              {`View All (${pendingApprovals.length})`}
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
