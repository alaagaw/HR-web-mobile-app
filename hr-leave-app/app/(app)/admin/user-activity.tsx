import { AccessGate } from '@/components/access/access-gate';
import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useViewState } from '@/hooks/use-view-state';
import { useColorScheme } from 'nativewind';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { ScreenHeader } from '@/components/layout/screen-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { userService } from '@/services';
import type { UserActivityRow } from '@/services/types';

const isWeb = Platform.OS === 'web';

let DataGrid: any;
let MuiThemeProvider: any;
let Chip: any;

if (isWeb) {
  const dg = require('@mui/x-data-grid');
  DataGrid = dg.DataGrid;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  Chip = require('@mui/material/Chip').default;
}

// "Last active" carries a time too (it can move every hour while the
// app is open); "last sign-in" is coarse enough that a date reads
// cleaner. Both call out the never-happened case explicitly — that's
// the whole point of the screen.
const fmtSeen = (v: string | null) =>
  v ? new Date(v).toLocaleString() : 'Never';
const fmtSignIn = (v: string | null) =>
  v ? new Date(v).toLocaleDateString() : 'Never logged in';

// ISO 8601 sorts lexicographically, so the raw string is a valid sort
// key. '' for null pushes "never" rows to the bottom on a desc sort —
// exactly where "who isn't using the system" should surface.
const sortKey = (v: string | null) => v ?? '';

const roleLabel = (r: string) =>
  r === 'hr_director' ? 'HR Director'
    : r.charAt(0).toUpperCase() + r.slice(1);

export default function UserActivityScreen() {
  return (
    <AccessGate resourceKey="page:admin/user-activity">
      <UserActivityScreenInner />
    </AccessGate>
  );
}

function UserActivityScreenInner() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isMobile } = useBreakpoint();

  const [rows, setRows] = useState<UserActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useViewState(
    'admin/user-activity.pagination',
    { page: 0, pageSize: 25 }
  );
  const [sortModel, setSortModel] = useViewState<any[]>(
    'admin/user-activity.sort',
    [{ field: 'last_seen_at', sort: 'desc' }]
  );
  const [filters, setFilters] = useViewState('admin/user-activity.columnFilters', {
    empCode: '',
    name: '',
    email: '',
    role: '',
    status: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getUserActivity();
      // Pre-sort newest-active-first so the mobile list and the initial
      // web view agree before the DataGrid applies its own sortModel.
      data.sort((a, b) => sortKey(b.last_seen_at).localeCompare(sortKey(a.last_seen_at)));
      setRows(data);
    } catch {
      // Non-HR callers get a thrown error from the RPC; show nothing
      // rather than a stack trace (routing already gates this screen).
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useAutoRefresh(() => { fetchData(); }, []);

  // Memoized so the `rows` prop keeps a stable reference across the
  // re-render a pagination/sort click triggers (same DataGrid
  // page-reset gotcha guarded against in registrations.tsx).
  const filteredData = useMemo(
    () =>
      rows.filter((row) => {
        const empCode = (row.emp_code || '').toLowerCase();
        const name = (row.full_name || '').toLowerCase();
        const email = (row.email || '').toLowerCase();
        const role = roleLabel(row.role).toLowerCase();
        const status = (row.is_active ? 'active' : 'inactive');
        if (filters.empCode && !empCode.includes(filters.empCode.toLowerCase())) return false;
        if (filters.name && !name.includes(filters.name.toLowerCase())) return false;
        if (filters.email && !email.includes(filters.email.toLowerCase())) return false;
        if (filters.role && !role.includes(filters.role.toLowerCase())) return false;
        if (filters.status && !status.includes(filters.status.toLowerCase())) return false;
        return true;
      }),
    [rows, filters]
  );

  // ── Web Layout ──────────────────────────────────────────────

  if (isWeb && !isMobile) {
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

    const plainHeader = (label: string) => () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 0' }}>
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const }}>{label}</span>
      </div>
    );

    const columns = [
      {
        field: 'emp_code',
        headerName: 'Emp Code',
        flex: 0.55,
        minWidth: 100,
        renderHeader: renderHeader('Emp Code', 'empCode'),
        valueGetter: (_v: any, row: UserActivityRow) => row.emp_code || '',
        renderCell: (p: any) => (
          <span style={{ fontSize: 13, color: isDark ? '#E2E8F0' : '#0F172A' }}>
            {p.row.emp_code || '—'}
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
        field: 'role',
        headerName: 'Role',
        flex: 0.55,
        minWidth: 110,
        renderHeader: renderHeader('Role', 'role'),
        valueGetter: (_v: any, row: UserActivityRow) => roleLabel(row.role),
        renderCell: (p: any) => (
          <Chip label={roleLabel(p.row.role)} size="small" variant="outlined" />
        ),
      },
      {
        field: 'last_seen_at',
        headerName: 'Last Active',
        flex: 0.8,
        minWidth: 170,
        renderHeader: plainHeader('Last Active'),
        valueGetter: (_v: any, row: UserActivityRow) => sortKey(row.last_seen_at),
        renderCell: (p: any) => (
          <span
            style={{
              fontSize: 13,
              color: p.row.last_seen_at
                ? (isDark ? '#E2E8F0' : '#0F172A')
                : (isDark ? '#64748B' : '#94A3B8'),
            }}
          >
            {fmtSeen(p.row.last_seen_at)}
          </span>
        ),
      },
      {
        field: 'last_sign_in_at',
        headerName: 'Last Sign-in',
        flex: 0.7,
        minWidth: 150,
        renderHeader: plainHeader('Last Sign-in'),
        valueGetter: (_v: any, row: UserActivityRow) => sortKey(row.last_sign_in_at),
        renderCell: (p: any) =>
          p.row.last_sign_in_at ? (
            <span style={{ fontSize: 13, color: isDark ? '#E2E8F0' : '#0F172A' }}>
              {fmtSignIn(p.row.last_sign_in_at)}
            </span>
          ) : (
            <Chip label="Never logged in" size="small" color="warning" variant="outlined" />
          ),
      },
      {
        field: 'is_active',
        headerName: 'Status',
        flex: 0.5,
        minWidth: 110,
        renderHeader: renderHeader('Status', 'status'),
        valueGetter: (_v: any, row: UserActivityRow) => (row.is_active ? 'Active' : 'Inactive'),
        renderCell: (p: any) => (
          <Chip
            label={p.row.is_active ? 'Active' : 'Inactive'}
            size="small"
            color={p.row.is_active ? 'success' : 'default'}
          />
        ),
      },
    ];

    return (
      <MuiThemeProvider isDark={isDark}>
        <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
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
                User Activity
              </div>
              <div style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
                Who is actually using the system, and when. "Last Active" updates whenever the app is opened — sorted oldest-idle last.
                <span style={{ marginLeft: 8, opacity: 0.7 }}>{rows.length} users</span>
              </div>
            </div>
          </div>

          <View style={{ flex: 1, padding: 16 }}>
            <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
              <DataGrid
                rows={filteredData}
                columns={columns}
                loading={loading}
                pageSizeOptions={[10, 25, 50, 100]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                disableRowSelectionOnClick
                disableColumnFilter
                disableColumnMenu
                columnHeaderHeight={70}
                getRowId={(row: UserActivityRow) => row.id}
                sx={{
                  borderRadius: 3,
                  '& .MuiDataGrid-columnHeader': { alignItems: 'flex-start' },
                  '& .MuiDataGrid-columnHeaderTitleContainer': { overflow: 'visible' },
                  '& .MuiDataGrid-cell': { fontSize: 13 },
                }}
              />
            </View>
          </View>
        </View>
      </MuiThemeProvider>
    );
  }

  // ── Mobile Layout ────────────────────────────────────────────

  const renderItem = ({ item }: { item: UserActivityRow }) => (
    <Card className="mb-3">
      <View className="py-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-text-primary dark:text-white flex-1">
            {item.full_name || '(No name)'}
          </Text>
          {item.emp_code ? (
            <Text className="text-xs font-medium text-text-muted dark:text-slate-400 ml-2">
              {item.emp_code}
            </Text>
          ) : null}
        </View>
        <Text className="text-xs text-text-muted dark:text-slate-400 mt-0.5">
          {item.email}
        </Text>
        <View className="flex-row items-center mt-2 gap-2">
          <Badge variant="default">{roleLabel(item.role)}</Badge>
          <Badge variant={item.is_active ? 'success' : 'default'}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </View>
        <Text className="text-xs text-text-muted dark:text-slate-400 mt-2">
          Last active: <Text className="font-medium">{fmtSeen(item.last_seen_at)}</Text>
        </Text>
        <Text className="text-xs text-text-muted dark:text-slate-400 mt-0.5">
          Last sign-in: <Text className="font-medium">{fmtSignIn(item.last_sign_in_at)}</Text>
        </Text>
      </View>
    </Card>
  );

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900" edges={['top']}>
      <ScreenHeader title="User Activity" />
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState title="No activity to show" description="No users found, or you don't have access to this report." />
          )
        }
      />
    </SafeAreaView>
  );
}
