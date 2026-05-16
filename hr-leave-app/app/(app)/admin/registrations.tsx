import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useViewState } from '@/hooks/use-view-state';
import { useColorScheme } from 'nativewind';
import { ScreenHeader } from '@/components/layout/screen-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { registrationService } from '@/services';
import { useAuth } from '@/hooks/use-auth';
import type { PendingRegistration } from '@/types/models';

const isWeb = Platform.OS === 'web';

let DataGrid: any;
let MuiThemeProvider: any;
let Chip: any;
let MuiButton: any;
let ReviewRegistrationDialog: any;

if (isWeb) {
  const dg = require('@mui/x-data-grid');
  DataGrid = dg.DataGrid;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  Chip = require('@mui/material/Chip').default;
  MuiButton = require('@mui/material/Button').default;
  ReviewRegistrationDialog = require('@/components/dialogs/review-registration-dialog').ReviewRegistrationDialog;
}

// emp_code lives in employee_documents (carried forward from HR
// pre-creation). The PENDING-* placeholder only appears for a pure
// self-registration with no HR-precreated row — treat it as "no code"
// so the column stays meaningful.
const getEmpCode = (row: any): string => {
  const c = String(row.employee_documents?.emp_code ?? '');
  return c && !c.startsWith('PENDING-') ? c : '';
};
const statusLabel = (s: string) =>
  s === 'pending_approval' ? 'Pending Approval' : 'Pending Info';
const submittedStr = (row: any) => {
  const v = row.registration_submitted_at ?? row.created_at;
  return v ? new Date(v).toLocaleDateString() : '';
};

export default function RegistrationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<PendingRegistration | null>(null);
  const [paginationModel, setPaginationModel] = useViewState(
    'admin/registrations.pagination',
    { page: 0, pageSize: 25 }
  );
  const [sortModel, setSortModel] = useViewState<any[]>('admin/registrations.sort', []);
  const [filters, setFilters] = useViewState('admin/registrations.columnFilters', {
    empCode: '',
    name: '',
    email: '',
    status: '',
    submitted: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const regs = await registrationService.getPendingRegistrations();
      setRegistrations(regs);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const { invalidate } = useAutoRefresh(() => { fetchData(); }, []);

  // Memoized so the `rows` prop keeps a stable reference across the
  // re-render a pagination/sort click triggers. A fresh array every
  // render makes MUI X DataGrid fire its "rows changed → reset to
  // page 0" safeguard, so paging would never advance.
  const filteredData = useMemo(
    () =>
      registrations.filter((row: any) => {
        const empCode = getEmpCode(row).toLowerCase();
        const name = (row.full_name || '').toLowerCase();
        const email = (row.email || '').toLowerCase();
        const status = statusLabel(row.registration_status).toLowerCase();
        const submitted = submittedStr(row).toLowerCase();
        if (filters.empCode && !empCode.includes(filters.empCode.toLowerCase())) return false;
        if (filters.name && !name.includes(filters.name.toLowerCase())) return false;
        if (filters.email && !email.includes(filters.email.toLowerCase())) return false;
        if (filters.status && !status.includes(filters.status.toLowerCase())) return false;
        if (filters.submitted && !submitted.includes(filters.submitted.toLowerCase())) return false;
        return true;
      }),
    [registrations, filters]
  );

  // ── Web Layout ──────────────────────────────────────────────

  if (isWeb) {

    const inputStyle = {
      width: '100%',
      padding: '5px 8px',
      fontSize: 11,
      border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
      borderRadius: 6,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      color: isDark ? '#F8FAFC' : '#0F172A',
      outline: 'none',
    };

    const renderHeader = (label: string, filterKey: keyof typeof filters) => () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 0' }}>
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const }}>{label}</span>
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
        field: 'emp_code',
        headerName: 'Emp Code',
        flex: 0.6,
        minWidth: 110,
        renderHeader: renderHeader('Emp Code', 'empCode'),
        valueGetter: (_value: any, row: any) => getEmpCode(row),
        renderCell: (params: any) => (
          <span style={{ fontSize: 13, color: isDark ? '#E2E8F0' : '#0F172A' }}>
            {getEmpCode(params.row) || '—'}
          </span>
        ),
      },
      {
        field: 'full_name',
        headerName: 'Name',
        flex: 1,
        minWidth: 150,
        renderHeader: renderHeader('Name', 'name'),
      },
      {
        field: 'email',
        headerName: 'Email',
        flex: 1,
        minWidth: 200,
        renderHeader: renderHeader('Email', 'email'),
      },
      {
        field: 'registration_status',
        headerName: 'Status',
        flex: 0.7,
        minWidth: 150,
        renderHeader: renderHeader('Status', 'status'),
        valueGetter: (_value: any, row: any) => statusLabel(row.registration_status),
        renderCell: (params: any) => (
          <Chip
            label={statusLabel(params.row.registration_status)}
            size="small"
            color={params.row.registration_status === 'pending_approval' ? 'warning' : 'default'}
          />
        ),
      },
      {
        field: 'registration_submitted_at',
        headerName: 'Submitted',
        flex: 0.7,
        minWidth: 140,
        renderHeader: renderHeader('Submitted', 'submitted'),
        // Fall back to created_at for any pre-040 row that was never
        // backfilled (defensive — backfill covers all pending rows).
        valueGetter: (_value: any, row: any) =>
          row.registration_submitted_at ?? row.created_at,
        valueFormatter: (value: string) =>
          value ? new Date(value).toLocaleDateString() : '-',
      },
      {
        field: 'actions',
        headerName: '',
        width: 120,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params: any) =>
          params.row.registration_status === 'pending_approval' ? (
            <MuiButton size="small" onClick={() => setReviewing(params.row)}>
              Review
            </MuiButton>
          ) : (
            <Chip label="Waiting" size="small" variant="outlined" />
          ),
      },
    ];

    return (
      <MuiThemeProvider isDark={isDark}>
        <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
          {/* Page header with back button — mirrors Employee Directory.
              ScreenHeader's router.back() is a no-op on web when the
              expo-router history stack is empty (direct load / refresh),
              so use window.history with a route fallback instead. */}
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
                if (typeof window !== 'undefined' && window.history.length > 1) {
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
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A' }}>
                Pending Registrations
              </div>
              <div style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
                Review and approve new employee registrations.
                <span style={{ marginLeft: 8, opacity: 0.7 }}>{registrations.length} shown</span>
              </div>
            </div>
          </div>

          <View style={{ flex: 1, padding: 16 }}>
            <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
              <DataGrid
                rows={filteredData}
                columns={columns}
                loading={loading}
                pageSizeOptions={[10, 25, 50]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                disableRowSelectionOnClick
                disableColumnFilter
                disableColumnMenu
                columnHeaderHeight={70}
                getRowId={(row: any) => row.id}
                sx={{
                  borderRadius: 3,
                  '& .MuiDataGrid-columnHeader': { alignItems: 'flex-start' },
                  '& .MuiDataGrid-columnHeaderTitleContainer': { overflow: 'visible' },
                  '& .MuiDataGrid-cell': { fontSize: 13 },
                }}
              />
            </View>
          </View>

          <ReviewRegistrationDialog
            open={!!reviewing}
            registration={reviewing}
            currentUserId={user?.id}
            onClose={() => setReviewing(null)}
            onProcessed={() => invalidate()}
          />
        </View>
      </MuiThemeProvider>
    );
  }

  // ── Mobile Layout ────────────────────────────────────────────

  const renderItem = ({ item }: { item: PendingRegistration }) => {
    const empCode = String(item.employee_documents?.emp_code ?? '');
    const showCode = empCode && !empCode.startsWith('PENDING-') ? empCode : null;
    return (
    <Card className="mb-3">
      <View className="py-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-text-primary dark:text-white flex-1">
            {item.full_name || '(No name)'}
          </Text>
          {showCode && (
            <Text className="text-xs font-medium text-text-muted dark:text-slate-400 ml-2">
              {showCode}
            </Text>
          )}
        </View>
        <Text className="text-xs text-text-muted dark:text-slate-400 mt-0.5">
          {item.email}
        </Text>
        <View className="flex-row items-center mt-2 gap-2">
          <Badge variant={item.registration_status === 'pending_approval' ? 'warning' : 'default'}>
            {item.registration_status === 'pending_approval' ? 'Pending Approval' : 'Pending Info'}
          </Badge>
          <Text className="text-xs text-text-muted dark:text-slate-400">
            {new Date(item.registration_submitted_at ?? item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </Card>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900" edges={['top']}>
      <ScreenHeader title="Pending Registrations" />
      <FlatList
        data={registrations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState title="No pending registrations" description="All registrations have been processed." />
          )
        }
      />
    </SafeAreaView>
  );
}
