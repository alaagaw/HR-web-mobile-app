import { useState } from 'react';
import { View, Text, FlatList, Platform } from 'react-native';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useViewState } from '@/hooks/use-view-state';
import { useColorScheme } from 'nativewind';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { leaveService } from '@/services';
import { LeaveStatus, LeaveType } from '@/types/enums';
import { formatDateRange, formatHours } from '@/lib/utils';
import { todayDateOnly } from '@/lib/date-only';
import type { LeaveRequest } from '@/types/models';

const isWeb = Platform.OS === 'web';

// Lazy-load MUI components only on web
let DataGrid: any;
let GridToolbar: any;
let MuiThemeProvider: any;
let Chip: any;
if (isWeb) {
  const dg = require('@mui/x-data-grid');
  DataGrid = dg.DataGrid;
  GridToolbar = dg.GridToolbar;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  Chip = require('@mui/material/Chip').default;
}

function WebTeamTable({ data, isDark }: { data: LeaveRequest[]; isDark: boolean }) {
  const [paginationModel, setPaginationModel] = useViewState(
    'tabs/team.pagination',
    { page: 0, pageSize: 25 }
  );
  const [sortModel, setSortModel] = useViewState<any[]>('tabs/team.sort', []);

  const columns = [
    {
      field: 'employee_name',
      headerName: 'Employee',
      flex: 1.5,
      minWidth: 180,
      valueGetter: (_value: any, row: LeaveRequest) => row.employee?.full_name || '—',
    },
    {
      field: 'department',
      headerName: 'Department',
      flex: 1.2,
      minWidth: 150,
      valueGetter: (_value: any, row: LeaveRequest) => row.employee?.department || '—',
    },
    {
      field: 'leave_type',
      headerName: 'Type',
      flex: 0.8,
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
      flex: 1.5,
      minWidth: 180,
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
      flex: 0.7,
      minWidth: 90,
      type: 'number' as const,
      valueFormatter: (value: number) => formatHours(value),
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
          sx={{ borderRadius: 3 }}
        />
      </div>
    </MuiThemeProvider>
  );
}

export default function TeamScreen() {
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [teamRequests, setTeamRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useAutoRefresh(() => {
    if (!user) return;
    setLoading(true);
    leaveService
      .getAllRequests({ status: LeaveStatus.Approved })
      .then((data) => {
        const today = todayDateOnly();
        const upcoming = data.filter((r) => r.end_date >= today);
        setTeamRequests(upcoming);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <View className="flex-1 bg-background dark:bg-slate-900">
      {isWeb ? (
        <View style={{ flex: 1, padding: 16 }}>
          {teamRequests.length > 0 || loading ? (
            <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
              <WebTeamTable data={teamRequests} isDark={isDark} />
            </View>
          ) : (
            <EmptyState
              title="No one is out"
              description="No approved leave for the upcoming period."
            />
          )}
        </View>
      ) : (
        <FlatList
          data={teamRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListHeaderComponent={
            <Text className="text-base font-semibold text-text-primary dark:text-white mb-3">
              Who's Out
            </Text>
          }
          renderItem={({ item }) => (
            <Card className="mb-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text-primary dark:text-white">
                    {item.employee?.full_name}
                  </Text>
                  <Text className="text-xs text-text-muted dark:text-slate-400 mt-0.5">
                    {item.employee?.department}
                  </Text>
                  <Text className="text-xs text-text-muted dark:text-slate-400 mt-1">
                    {formatDateRange(item.start_date, item.end_date)}
                  </Text>
                </View>
                <Badge variant={item.leave_type === LeaveType.Emergency ? 'error' : 'info'}>
                  {item.leave_type === LeaveType.Emergency ? 'Emergency' : 'PTO'}
                </Badge>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                title="No one is out"
                description="No approved leave for the upcoming period."
              />
            ) : null
          }
        />
      )}
    </View>
  );
}
