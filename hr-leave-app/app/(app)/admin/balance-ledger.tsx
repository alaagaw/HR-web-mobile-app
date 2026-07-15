import { AccessGate } from '@/components/access/access-gate';
import { useMemo, useState } from 'react';
import { View, Text, FlatList, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useViewState } from '@/hooks/use-view-state';
import { useColorScheme } from 'nativewind';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { ScreenHeader } from '@/components/layout/screen-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { balanceService } from '@/services';
import { formatHours, formatDate, getInitials } from '@/lib/utils';
import { DEFAULT_WORKDAY_HOURS } from '@/lib/constants';
import { LedgerReason } from '@/types/enums';
import type { LeaveLedgerEntry } from '@/types/models';

const isWeb = Platform.OS === 'web';

// Lazy-load MUI components only on web
let DataGrid: any;
let MuiThemeProvider: any;
let Chip: any;

if (isWeb) {
  const dg = require('@mui/x-data-grid');
  DataGrid = dg.DataGrid;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  Chip = require('@mui/material/Chip').default;
}

type LedgerEntryWithDetails = LeaveLedgerEntry & {
  employee_name: string;
  employee_department: string | null;
  performer_name: string | null;
};

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  [LedgerReason.Accrual]: { label: 'Accrual', color: '#22C55E' },
  [LedgerReason.ApprovedDeduction]: { label: 'Approved Deduction', color: '#F87171' },
  [LedgerReason.ManualAdjustment]: { label: 'Manual Adjustment', color: '#2563EB' },
  [LedgerReason.CancellationCredit]: { label: 'Cancellation Credit', color: '#F59E0B' },
};

function getReasonDisplay(reason: string) {
  return REASON_LABELS[reason] ?? { label: reason, color: '#94A3B8' };
}

// --------------- Web Components ---------------

function WebLedgerTable({
  data,
  isDark,
}: {
  data: LedgerEntryWithDetails[];
  isDark: boolean;
}) {
  const [filters, setFilters] = useViewState('admin/balance-ledger.columnFilters', {
    employee: '',
    type: '',
    change: '',
    reason: '',
    performedBy: '',
    date: '',
  });

  const [paginationModel, setPaginationModel] = useViewState(
    'admin/balance-ledger.pagination',
    { page: 0, pageSize: 25 }
  );
  const [sortModel, setSortModel] = useViewState<any[]>('admin/balance-ledger.sort', []);

  // Memoized so the DataGrid `rows` reference stays stable across the
  // re-render a pagination/sort click triggers — otherwise MUI's
  // "rows changed → reset to page 0" fires and paging never sticks.
  const filteredData = useMemo(
    () =>
      data.filter((row) => {
        const emp = `${row.employee_name} ${row.employee_department || ''}`.toLowerCase();
        const type = row.leave_type.toLowerCase();
        const changeText = `${row.change_hours > 0 ? '+' : ''}${formatHours(row.change_hours)}`.toLowerCase();
        const reasonText = getReasonDisplay(row.reason).label.toLowerCase();
        const performerText = (row.performer_name || 'System').toLowerCase();
        const dateText = formatDate(row.created_at).toLowerCase();

        if (filters.employee && !emp.includes(filters.employee.toLowerCase())) return false;
        if (filters.type && !type.includes(filters.type.toLowerCase())) return false;
        if (filters.change && !changeText.includes(filters.change.toLowerCase())) return false;
        if (filters.reason && !reasonText.includes(filters.reason.toLowerCase())) return false;
        if (filters.performedBy && !performerText.includes(filters.performedBy.toLowerCase())) return false;
        if (filters.date && !dateText.includes(filters.date.toLowerCase())) return false;
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

  const columns = [
    {
      field: 'employee_name',
      headerName: 'Employee',
      flex: 1.4,
      minWidth: 180,
      renderHeader: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 0' }}>
          <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const }}>Employee</span>
          <input
            placeholder="Filter..."
            value={filters.employee}
            onChange={(e) => setFilters((f) => ({ ...f, employee: e.target.value }))}
            onClick={(e) => e.stopPropagation()}
            style={inputStyle}
          />
        </div>
      ),
      valueGetter: (_value: any, row: LedgerEntryWithDetails) =>
        `${row.employee_name} ${row.employee_department || ''}`.trim(),
      renderCell: (params: any) => {
        const row = params.row as LedgerEntryWithDetails;
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
              {row.employee_name}
            </div>
            <div style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B' }}>
              {row.employee_department || '—'}
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
      renderHeader: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 0' }}>
          <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const }}>Type</span>
          <input
            placeholder="Filter..."
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            onClick={(e) => e.stopPropagation()}
            style={inputStyle}
          />
        </div>
      ),
      renderCell: (params: any) => (
        <Chip
          label={params.row.leave_type === 'pto' ? 'PTO' : 'Emergency'}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: 12 }}
        />
      ),
    },
    {
      field: 'change_hours',
      headerName: 'Change',
      flex: 0.8,
      minWidth: 110,
      type: 'number' as const,
      renderHeader: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 0' }}>
          <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const }}>Change</span>
          <input
            placeholder="Filter..."
            value={filters.change}
            onChange={(e) => setFilters((f) => ({ ...f, change: e.target.value }))}
            onClick={(e) => e.stopPropagation()}
            style={inputStyle}
          />
        </div>
      ),
      renderCell: (params: any) => {
        const hours = params.row.change_hours as number;
        const isPositive = hours > 0;
        const color = isPositive ? '#22C55E' : '#F87171';
        return (
          <div style={{ fontWeight: 700, fontSize: 14, color }}>
            {isPositive ? '+' : ''}{formatHours(hours)}
          </div>
        );
      },
    },
    {
      field: 'reason',
      headerName: 'Reason',
      flex: 1.2,
      minWidth: 160,
      renderHeader: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 0' }}>
          <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const }}>Reason</span>
          <input
            placeholder="Filter..."
            value={filters.reason}
            onChange={(e) => setFilters((f) => ({ ...f, reason: e.target.value }))}
            onClick={(e) => e.stopPropagation()}
            style={inputStyle}
          />
        </div>
      ),
      renderCell: (params: any) => {
        const { label, color } = getReasonDisplay(params.row.reason);
        return (
          <Chip
            label={label}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: 12,
              color,
              borderColor: color,
              backgroundColor: `${color}18`,
            }}
            variant="outlined"
          />
        );
      },
      valueGetter: (_value: any, row: LedgerEntryWithDetails) => getReasonDisplay(row.reason).label,
    },
    {
      field: 'performed_by',
      headerName: 'Performed By',
      flex: 1,
      minWidth: 140,
      renderHeader: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 0' }}>
          <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const }}>Performed By</span>
          <input
            placeholder="Filter..."
            value={filters.performedBy}
            onChange={(e) => setFilters((f) => ({ ...f, performedBy: e.target.value }))}
            onClick={(e) => e.stopPropagation()}
            style={inputStyle}
          />
        </div>
      ),
      renderCell: (params: any) => {
        const name = (params.row as LedgerEntryWithDetails).performer_name;
        return (
          <div style={{ fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
            {name || 'System'}
          </div>
        );
      },
      valueGetter: (_value: any, row: LedgerEntryWithDetails) => row.performer_name || 'System',
    },
    {
      field: 'created_at',
      headerName: 'Date',
      flex: 0.9,
      minWidth: 130,
      renderHeader: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 0' }}>
          <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase' as const }}>Date</span>
          <input
            placeholder="Filter..."
            value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
            onClick={(e) => e.stopPropagation()}
            style={inputStyle}
          />
        </div>
      ),
      renderCell: (params: any) => (
        <div style={{ fontSize: 13, color: isDark ? '#CBD5E1' : '#334155' }}>
          {formatDate(params.row.created_at)}
        </div>
      ),
      valueGetter: (_value: any, row: LedgerEntryWithDetails) => formatDate(row.created_at),
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
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        pageSizeOptions={[10, 25, 50, 100]}
        rowHeight={52}
        sx={{
          borderRadius: 3,
          '& .MuiDataGrid-cell': { whiteSpace: 'normal', lineHeight: 1.4, display: 'flex', alignItems: 'center' },
          '& .MuiDataGrid-columnHeader': { alignItems: 'flex-start' },
          '& .MuiDataGrid-columnHeaderTitleContainer': { overflow: 'visible' },
        }}
      />
    </div>
  );
}

// --------------- Main Screen ---------------

export default function BalanceLedgerScreen() {
  return (
    <AccessGate resourceKey="page:admin/balance-ledger">
      <BalanceLedgerScreenInner />
    </AccessGate>
  );
}

function BalanceLedgerScreenInner() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isMobile } = useBreakpoint();
  const [entries, setEntries] = useState<LedgerEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await balanceService.getAllLedgerEntries();
      setEntries(data);
    } finally {
      setLoading(false);
    }
  };

  useAutoRefresh(() => { loadData(); }, []);

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
                router.replace('/(app)/(tabs)/profile' as any);
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
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A' }}>
              Balance Ledger
            </div>
            <div style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
              All balance transactions across employees
            </div>
          </div>
        </div>

        {/* DataGrid */}
        <View style={{ flex: 1, padding: 16 }}>
          {entries.length > 0 || loading ? (
            <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
              <MuiThemeProvider isDark={isDark}>
                <WebLedgerTable data={entries} isDark={isDark} />
              </MuiThemeProvider>
            </View>
          ) : (
            <EmptyState title="No transactions" description="No balance transactions recorded yet." />
          )}
        </View>
      </View>
    );
  }

  // --------------- Mobile render ---------------
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-[#0F172A]" edges={['top']}>
      <ScreenHeader title="Balance Ledger" />

      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        renderItem={({ item }) => {
          const isPositive = item.change_hours > 0;
          const { label: reasonLabel } = getReasonDisplay(item.reason);
          return (
            <Card className="mb-3">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-primary-light dark:bg-blue-900/40 items-center justify-center mr-3">
                  <Text className="text-sm font-bold text-primary dark:text-blue-400">
                    {getInitials(item.employee_name)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text-primary dark:text-white">
                    {item.employee_name}
                  </Text>
                  <Text className="text-xs text-text-muted dark:text-slate-400">
                    {item.employee_department || '—'} · {item.leave_type === 'pto' ? 'PTO' : 'Emergency'}
                  </Text>
                </View>
                <View className="items-end">
                  <Text
                    className={`text-base font-bold ${isPositive ? 'text-green-500' : 'text-red-400'}`}
                  >
                    {isPositive ? '+' : ''}{formatHours(item.change_hours)}
                  </Text>
                  <Text className="text-xs text-text-muted dark:text-slate-400">
                    {formatDate(item.created_at)}
                  </Text>
                </View>
              </View>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-xs text-text-muted dark:text-slate-400">
                  {reasonLabel}
                </Text>
                <Text className="text-xs text-text-muted dark:text-slate-400">
                  by {item.performer_name || 'System'}
                </Text>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="No transactions"
              description="No balance transactions recorded yet."
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
