import { AccessGate } from '@/components/access/access-gate';
import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useViewState } from '@/hooks/use-view-state';
import { useColorScheme } from 'nativewind';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { format, subDays, startOfMonth, startOfYear, subMonths } from 'date-fns';
import { ScreenHeader } from '@/components/layout/screen-header';
import { RequestCard } from '@/components/leave/request-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { leaveService } from '@/services';
import { formatDateRange, formatHours, formatDate } from '@/lib/utils';
import { getStatusLabel, getLeaveTypeLabel, getLeaveTypeMuiColor } from '@/lib/state-machine';
import { LeaveStatus } from '@/types/enums';
import type { LeaveRequest } from '@/types/models';

const isWeb = Platform.OS === 'web';

// Lazy-load MUI components only on web
let DataGrid: any;
let MuiThemeProvider: any;
let Chip: any;
let ApprovalChainCell: any;

if (isWeb) {
  const dg = require('@mui/x-data-grid');
  DataGrid = dg.DataGrid;
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

type QuickRange = 'last30' | 'thisMonth' | 'last3Months' | 'thisYear' | 'allTime';

function getDateRange(range: QuickRange): { from: string; to: string } {
  const now = new Date();
  const toStr = format(now, 'yyyy-MM-dd');

  switch (range) {
    case 'last30':
      return { from: format(subDays(now, 30), 'yyyy-MM-dd'), to: toStr };
    case 'thisMonth':
      return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: toStr };
    case 'last3Months':
      return { from: format(subMonths(now, 3), 'yyyy-MM-dd'), to: toStr };
    case 'thisYear':
      return { from: format(startOfYear(now), 'yyyy-MM-dd'), to: toStr };
    case 'allTime':
      return { from: '2020-01-01', to: toStr };
  }
}

const QUICK_LABELS: { key: QuickRange; label: string }[] = [
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'last3Months', label: 'Last 3 Months' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'allTime', label: 'All Time' },
];

// --------------- Web Table ---------------

function WebHistoryTable({
  data,
  isDark,
  onRowClick,
}: {
  data: LeaveRequest[];
  isDark: boolean;
  onRowClick: (request: LeaveRequest) => void;
}) {
  const [filters, setFilters] = useViewState('admin/request-history.columnFilters', {
    caseNumber: '',
    employee: '',
    type: '',
    dates: '',
    hours: '',
    status: '',
    resolvedOn: '',
  });

  const [paginationModel, setPaginationModel] = useViewState(
    'admin/request-history.pagination',
    { page: 0, pageSize: 25 }
  );
  const [sortModel, setSortModel] = useViewState<any[]>('admin/request-history.sort', []);

  // Memoized so the DataGrid `rows` reference stays stable across the
  // re-render a pagination/sort click triggers — otherwise MUI's
  // "rows changed → reset to page 0" fires and paging never sticks.
  const filteredData = useMemo(
    () =>
      data.filter((row) => {
        const caseNum = row.case_number.toLowerCase();
        const emp = `${row.employee?.full_name || ''} ${row.employee?.department || ''}`.toLowerCase();
        const type = getLeaveTypeLabel(row.leave_type).toLowerCase();
        const dates = formatDateRange(row.start_date, row.end_date).toLowerCase();
        const hours = formatHours(row.requested_hours).toLowerCase();
        const status = getStatusLabel(row.status).toLowerCase();
        const resolved = row.resolved_at
          ? new Date(row.resolved_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            }).toLowerCase()
          : '';

        if (filters.caseNumber && !caseNum.includes(filters.caseNumber.toLowerCase())) return false;
        if (filters.employee && !emp.includes(filters.employee.toLowerCase())) return false;
        if (filters.type && !type.includes(filters.type.toLowerCase())) return false;
        if (filters.dates && !dates.includes(filters.dates.toLowerCase())) return false;
        if (filters.hours && !hours.includes(filters.hours.toLowerCase())) return false;
        if (filters.status && !status.includes(filters.status.toLowerCase())) return false;
        if (filters.resolvedOn && !resolved.includes(filters.resolvedOn.toLowerCase())) return false;
        return true;
      }),
    [data, filters]
  );

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    fontSize: 12,
    border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
    borderRadius: 6,
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    color: isDark ? '#F8FAFC' : '#0F172A',
    outline: 'none',
  };

  const renderHeader = (label: string, filterKey: keyof typeof filters) => () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 0' }}>
      <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const }}>{label}</span>
      <input
        placeholder="Filter..."
        value={filters[filterKey]}
        onChange={(e) => setFilters((f) => ({ ...f, [filterKey]: e.target.value }))}
        onClick={(e) => e.stopPropagation()}
        style={inputStyle}
      />
    </div>
  );

  const columns = [
    {
      field: 'case_number',
      headerName: 'Case #',
      flex: 1,
      minWidth: 140,
      renderHeader: renderHeader('Case #', 'caseNumber'),
    },
    {
      field: 'employee_name',
      headerName: 'Employee',
      flex: 1.4,
      minWidth: 160,
      renderHeader: renderHeader('Employee', 'employee'),
      valueGetter: (_value: any, row: LeaveRequest) =>
        `${row.employee?.full_name || ''} ${row.employee?.department || ''}`.trim(),
      renderCell: (params: any) => {
        const row = params.row as LeaveRequest;
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
              {row.employee?.full_name || '—'}
            </div>
            <div style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B' }}>
              {row.employee?.department || '—'}
            </div>
          </div>
        );
      },
    },
    {
      field: 'leave_type',
      headerName: 'Type',
      flex: 0.6,
      minWidth: 90,
      renderHeader: renderHeader('Type', 'type'),
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
      flex: 1.2,
      minWidth: 160,
      renderHeader: renderHeader('Dates', 'dates'),
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
      minWidth: 90,
      type: 'number' as const,
      renderHeader: renderHeader('Hours', 'hours'),
      valueFormatter: (value: number) => formatHours(value),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 140,
      renderHeader: renderHeader('Status', 'status'),
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
      flex: 1.6,
      minWidth: 220,
      sortable: false,
      filterable: false,
      renderCell: (params: any) => <ApprovalChainCell request={params.row} />,
    },
    {
      field: 'resolved_at',
      headerName: 'Resolved On',
      flex: 1,
      minWidth: 140,
      renderHeader: renderHeader('Resolved On', 'resolvedOn'),
      valueGetter: (_value: any, row: LeaveRequest) =>
        row.resolved_at
          ? new Date(row.resolved_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })
          : '—',
    },
  ];

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <DataGrid
        rows={filteredData}
        columns={columns}
        getRowId={(row: any) => row.id}
        disableRowSelectionOnClick
        disableColumnFilter
        disableColumnMenu
        columnHeaderHeight={70}
        onRowClick={(params: any) => onRowClick(params.row)}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        pageSizeOptions={[10, 25, 50, 100]}
        rowHeight={56}
        sx={{
          borderRadius: 3,
          '& .MuiDataGrid-cell': { whiteSpace: 'normal', lineHeight: 1.4, display: 'flex', alignItems: 'center' },
          '& .MuiDataGrid-columnHeader': { alignItems: 'flex-start' },
          '& .MuiDataGrid-columnHeaderTitleContainer': { overflow: 'visible' },
          '& .MuiDataGrid-row': { cursor: 'pointer' },
        }}
      />
    </div>
  );
}

// --------------- Date Range Filter Bar (Web) ---------------

function WebDateFilterBar({
  dateFrom,
  dateTo,
  activeRange,
  isDark,
  onDateFromChange,
  onDateToChange,
  onQuickRange,
}: {
  dateFrom: string;
  dateTo: string;
  activeRange: QuickRange | null;
  isDark: boolean;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onQuickRange: (range: QuickRange) => void;
}) {
  const dateInputStyle: React.CSSProperties = {
    padding: '7px 12px',
    fontSize: 13,
    border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
    borderRadius: 8,
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    color: isDark ? '#F8FAFC' : '#0F172A',
    outline: 'none',
    colorScheme: isDark ? 'dark' : 'light',
  };

  const quickBtnBase: React.CSSProperties = {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        padding: '12px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B' }}>From</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          style={dateInputStyle}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B' }}>To</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          style={dateInputStyle}
        />
      </div>

      <div style={{ width: 1, height: 28, backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {QUICK_LABELS.map(({ key, label }) => {
          const isActive = activeRange === key;
          return (
            <button
              key={key}
              onClick={() => onQuickRange(key)}
              style={{
                ...quickBtnBase,
                backgroundColor: isActive
                  ? '#2563EB'
                  : isDark ? '#1E293B' : '#F1F5F9',
                color: isActive
                  ? '#FFFFFF'
                  : isDark ? '#CBD5E1' : '#334155',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --------------- Main Screen ---------------

export default function RequestHistoryScreen() {
  return (
    <AccessGate resourceKey="page:admin/request-history">
      <RequestHistoryScreenInner />
    </AccessGate>
  );
}

function RequestHistoryScreenInner() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isMobile } = useBreakpoint();

  const defaultRange = getDateRange('last30');
  const [dateFrom, setDateFrom] = useViewState('admin/request-history.dateFrom', defaultRange.from);
  const [dateTo, setDateTo] = useViewState('admin/request-history.dateTo', defaultRange.to);
  const [activeRange, setActiveRange] = useViewState<QuickRange | null>(
    'admin/request-history.activeRange',
    'last30'
  );
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);

  // If a quick range is persisted, recompute its dates from current "now" on mount.
  // This keeps "Last 30 Days" relative to today instead of frozen at the time of selection.
  useEffect(() => {
    if (activeRange) {
      const { from, to } = getDateRange(activeRange);
      if (from !== dateFrom || to !== dateTo) {
        setDateFrom(from);
        setDateTo(to);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async (from: string, to: string) => {
    setLoading(true);
    try {
      const data = await leaveService.getAllRequestsInRange(
        `${from}T00:00:00.000Z`,
        `${to}T23:59:59.999Z`,
      );
      setRequests(data);
    } finally {
      setLoading(false);
    }
  };

  useAutoRefresh(() => { loadData(dateFrom, dateTo); }, [dateFrom, dateTo]);

  const handleDateFromChange = (v: string) => {
    setDateFrom(v);
    setActiveRange(null);
    loadData(v, dateTo);
  };

  const handleDateToChange = (v: string) => {
    setDateTo(v);
    setActiveRange(null);
    loadData(dateFrom, v);
  };

  const handleQuickRange = (range: QuickRange) => {
    const { from, to } = getDateRange(range);
    setDateFrom(from);
    setDateTo(to);
    setActiveRange(range);
    loadData(from, to);
  };

  const handleRowPress = (request: LeaveRequest) => {
    router.push(`/(app)/requests/${request.id}` as any);
  };

  // --------------- Web render ---------------
  if (isWeb && !isMobile) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
        {/* Page header with back button */}
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
              if (window.history.length > 1) {
                window.history.back();
              } else {
                router.replace('/(app)/(tabs)/admin' as any);
              }
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#E2E8F0' : '#0F172A'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A' }}>
              Leave Request History
            </div>
            <div style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
              All leave request transactions across employees
            </div>
          </div>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              fontSize: 13,
              fontWeight: 600,
              color: isDark ? '#CBD5E1' : '#334155',
            }}
          >
            {requests.length} request{requests.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Filter bar + DataGrid */}
        <View style={{ flex: 1, padding: '0 16px 16px' }}>
          <WebDateFilterBar
            dateFrom={dateFrom}
            dateTo={dateTo}
            activeRange={activeRange}
            isDark={isDark}
            onDateFromChange={handleDateFromChange}
            onDateToChange={handleDateToChange}
            onQuickRange={handleQuickRange}
          />

          {requests.length > 0 || loading ? (
            <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
              <MuiThemeProvider isDark={isDark}>
                <WebHistoryTable data={requests} isDark={isDark} onRowClick={handleRowPress} />
              </MuiThemeProvider>
            </View>
          ) : (
            <EmptyState
              title="No requests found"
              description="No leave requests found for the selected date range."
            />
          )}
        </View>
      </View>
    );
  }

  // --------------- Mobile render ---------------
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-[#0F172A]" edges={['top']}>
      <ScreenHeader title="Leave Request History" />

      {/* Mobile date filter */}
      <View className="px-4 pt-3 pb-1">
        <View className="flex-row flex-wrap gap-2 mb-3">
          {QUICK_LABELS.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => handleQuickRange(key)}
              className={`px-3 py-1.5 rounded-lg ${
                activeRange === key ? 'bg-primary' : 'bg-surface dark:bg-slate-800 border border-border dark:border-slate-700'
              }`}
            >
              <Text className={`text-xs font-semibold ${activeRange === key ? 'text-white' : 'text-text-muted dark:text-slate-400'}`}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text className="text-xs text-text-muted dark:text-slate-400 mb-2">
          {requests.length} request{requests.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0, flexGrow: 1 }}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            showEmployee
            onPress={() => handleRowPress(item)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="No requests found"
              description="No leave requests found for the selected date range."
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
