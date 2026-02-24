import { useState } from 'react';
import { View, FlatList, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { Plus } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { RequestCard } from '@/components/leave/request-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { useLeaveRequest } from '@/hooks/use-leave-request';
import { LeaveStatus } from '@/types/enums';
import { getStatusLabel, getLeaveTypeLabel, getLeaveTypeMuiColor } from '@/lib/state-machine';
import { formatDateRange, formatHours, formatPendingSince } from '@/lib/utils';
import type { LeaveRequest } from '@/types/models';

const isWeb = Platform.OS === 'web';

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

function WebRequestsTable({
  data,
  isDark,
  onRowClick,
}: {
  data: LeaveRequest[];
  isDark: boolean;
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
      field: 'leave_type',
      headerName: 'Type',
      flex: 0.7,
      minWidth: 110,
      renderCell: (params: any) => (
        <Chip
          label={getLeaveTypeLabel(params.row.leave_type)}
          size="small"
          color={getLeaveTypeMuiColor(params.row.leave_type)}
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: 12 }}
        />
      ),
      valueGetter: (_value: any, row: LeaveRequest) => getLeaveTypeLabel(row.leave_type),
    },
    {
      field: 'dates',
      headerName: 'Dates',
      flex: 1.5,
      minWidth: 180,
      valueGetter: (_value: any, row: LeaveRequest) => formatDateRange(row.start_date, row.end_date),
      sortComparator: (_v1: string, _v2: string, p1: any, p2: any) => {
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
      flex: 1.1,
      minWidth: 150,
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
      minWidth: 130,
      valueGetter: (_value: any, row: LeaveRequest) =>
        row.pending_since ? formatPendingSince(row.pending_since) : '—',
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
          sx={{
            borderRadius: 3,
            '& .MuiDataGrid-row': { cursor: 'pointer' },
          }}
        />
      </div>
    </MuiThemeProvider>
  );
}

export default function RequestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { requests, loading, fetchMyRequests } = useLeaveRequest();
  useAutoRefresh(() => {
    if (!user) return;
    fetchMyRequests(user.id);
  }, [user?.id]);

  const handleRowPress = (request: LeaveRequest) => {
    router.push(`/(app)/requests/${request.id}` as any);
  };

  return (
    <View className="flex-1 bg-background dark:bg-slate-900">
      {/* Web: DataGrid / Mobile: Card list */}
      {isWeb ? (
        <View style={{ flex: 1, padding: 16 }}>
          {requests.length > 0 || loading ? (
            <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
              <WebRequestsTable data={requests} isDark={isDark} onRowClick={handleRowPress} />
            </View>
          ) : (
            <EmptyState
              title="No requests yet"
              description="Submit your first leave request"
              actionLabel="Request Time Off"
              onAction={() => router.push('/(app)/requests/new' as any)}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8, flexGrow: 1 }}
          renderItem={({ item }) => (
            <RequestCard
              request={item}
              onPress={() => handleRowPress(item)}
            />
          )}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                title="No requests yet"
                description="Submit your first leave request"
                actionLabel="Request Time Off"
                onAction={() => router.push('/(app)/requests/new' as any)}
              />
            ) : null
          }
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/(app)/requests/new' as any)}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
      >
        <Plus size={24} color="#fff" />
      </Pressable>
    </View>
  );
}
