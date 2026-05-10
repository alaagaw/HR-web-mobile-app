import { useCallback, useState } from 'react';
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

  // ── Web Layout ──────────────────────────────────────────────

  if (isWeb) {
    const columns = [
      { field: 'full_name', headerName: 'Name', flex: 1, minWidth: 150 },
      { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
      {
        field: 'registration_status',
        headerName: 'Status',
        width: 160,
        renderCell: (params: any) => (
          <Chip
            label={params.value === 'pending_approval' ? 'Pending Approval' : 'Pending Info'}
            size="small"
            color={params.value === 'pending_approval' ? 'warning' : 'default'}
          />
        ),
      },
      {
        field: 'created_at',
        headerName: 'Submitted',
        width: 160,
        valueFormatter: (value: string) =>
          value ? new Date(value).toLocaleDateString() : '-',
      },
      {
        field: 'actions',
        headerName: '',
        width: 120,
        sortable: false,
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
        <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <ScreenHeader title="Pending Registrations" />

          <div style={{ flex: 1, marginTop: 16 }}>
            <DataGrid
              rows={registrations}
              columns={columns}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              sortModel={sortModel}
              onSortModelChange={setSortModel}
              disableRowSelectionOnClick
              getRowId={(row: any) => row.id}
              sx={{
                '& .MuiDataGrid-cell': { fontSize: 13 },
                border: isDark ? '1px solid #334155' : '1px solid #E2E8F0',
              }}
            />
          </div>

          <ReviewRegistrationDialog
            open={!!reviewing}
            registration={reviewing}
            currentUserId={user?.id}
            onClose={() => setReviewing(null)}
            onProcessed={() => invalidate()}
          />
        </div>
      </MuiThemeProvider>
    );
  }

  // ── Mobile Layout ────────────────────────────────────────────

  const renderItem = ({ item }: { item: PendingRegistration }) => (
    <Card className="mb-3">
      <View className="py-2">
        <Text className="text-sm font-semibold text-text-primary dark:text-white">
          {item.full_name || '(No name)'}
        </Text>
        <Text className="text-xs text-text-muted dark:text-slate-400 mt-0.5">
          {item.email}
        </Text>
        <View className="flex-row items-center mt-2 gap-2">
          <Badge variant={item.registration_status === 'pending_approval' ? 'warning' : 'default'}>
            {item.registration_status === 'pending_approval' ? 'Pending Approval' : 'Pending Info'}
          </Badge>
          <Text className="text-xs text-text-muted dark:text-slate-400">
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </Card>
  );

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
