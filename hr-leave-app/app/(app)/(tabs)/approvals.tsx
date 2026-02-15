import { useCallback, useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useColorScheme } from 'nativewind';
import { RequestCard } from '@/components/leave/request-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { useApprovals } from '@/hooks/use-approvals';
import { useApprovalStore } from '@/stores/approval-store';
import { LeaveStatus, LeaveType } from '@/types/enums';
import { getStatusLabel } from '@/lib/state-machine';
import { formatDateRange, formatHours, formatPendingSince } from '@/lib/utils';
import type { LeaveRequest } from '@/types/models';

const isWeb = Platform.OS === 'web';

const TABS = ['Action Required', 'All Requests'] as const;

// Lazy-load MUI components only on web
let DataGrid: any;
let GridToolbar: any;
let MuiThemeProvider: any;
let Chip: any;
let ApprovalChainCell: any;
if (isWeb) {
  const dg = require('@mui/x-data-grid');
  DataGrid = dg.DataGrid;
  GridToolbar = dg.GridToolbar;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  Chip = require('@mui/material/Chip').default;
  ApprovalChainCell = require('@/components/web/approval-chain-cell').ApprovalChainCell;
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

function WebApprovalsTable({
  data,
  isDark,
  userId,
  onRowClick,
}: {
  data: LeaveRequest[];
  isDark: boolean;
  userId?: string;
  onRowClick: (request: LeaveRequest) => void;
}) {
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
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
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

export default function ApprovalsScreen() {
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
  const setPendingCount = useApprovalStore((s) => s.setPendingCount);
  const [activeTab, setActiveTab] = useState(0);
  const [, setTick] = useState(0);

  // Keep sidebar badge in sync
  useEffect(() => {
    setPendingCount(pendingApprovals.length);
  }, [pendingApprovals.length]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      fetchPendingApprovals(user.id);
      fetchChainRequests(user.id, user.role);

      // Re-render every 60s so "Pending Since" stays fresh
      const timer = setInterval(() => setTick((t) => t + 1), 60_000);
      return () => clearInterval(timer);
    }, [user?.id])
  );

  const data = activeTab === 0 ? pendingApprovals : chainRequests;
  const isLoading = activeTab === 0 ? loading : chainLoading;

  const handleRowPress = (request: LeaveRequest) => {
    router.push(`/(app)/requests/${request.id}` as any);
  };

  return (
    <View className="flex-1 bg-background dark:bg-slate-900">
      {/* Tab bar */}
      <View className="flex-row border-b border-border dark:border-slate-700">
        {TABS.map((tab, i) => (
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
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Web: DataGrid / Mobile: Card list */}
      {isWeb ? (
        <View style={{ flex: 1, padding: 16, paddingTop: 8 }}>
          {data.length > 0 || isLoading ? (
            <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
              <WebApprovalsTable
                data={data}
                isDark={isDark}
                userId={activeTab === 1 ? user?.id : undefined}
                onRowClick={handleRowPress}
              />
            </View>
          ) : (
            <EmptyState
              title={activeTab === 0 ? 'No pending approvals' : 'No requests found'}
              description={
                activeTab === 0
                  ? 'All caught up! No requests need your attention right now.'
                  : 'No requests from your team yet.'
              }
            />
          )}
        </View>
      ) : (
        <FlatList
          data={data}
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
            !isLoading ? (
              <EmptyState
                title={activeTab === 0 ? 'No pending approvals' : 'No requests found'}
                description={
                  activeTab === 0
                    ? 'All caught up! No requests need your attention right now.'
                    : 'No requests from your team yet.'
                }
              />
            ) : null
          }
        />
      )}
    </View>
  );
}
