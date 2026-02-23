import { useCallback, useState } from 'react';
import { View, Text, FlatList, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useColorScheme } from 'nativewind';
import { ScreenHeader } from '@/components/layout/screen-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { registrationService, userService } from '@/services';
import { useAuth } from '@/hooks/use-auth';
import { getRoleLabel } from '@/lib/utils';
import { Role, RegistrationStatus } from '@/types/enums';
import type { PendingRegistration, Profile } from '@/types/models';

const isWeb = Platform.OS === 'web';

let DataGrid: any;
let MuiThemeProvider: any;
let Chip: any;
let Dialog: any;
let DialogTitle: any;
let DialogContent: any;
let DialogActions: any;
let MuiTextField: any;
let MuiButton: any;
let MuiAlert: any;
let Snackbar: any;
let MenuItem: any;
let Autocomplete: any;
let Box: any;

if (isWeb) {
  const dg = require('@mui/x-data-grid');
  DataGrid = dg.DataGrid;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  Chip = require('@mui/material/Chip').default;
  Dialog = require('@mui/material/Dialog').default;
  DialogTitle = require('@mui/material/DialogTitle').default;
  DialogContent = require('@mui/material/DialogContent').default;
  DialogActions = require('@mui/material/DialogActions').default;
  MuiTextField = require('@mui/material/TextField').default;
  MuiButton = require('@mui/material/Button').default;
  MuiAlert = require('@mui/material/Alert').default;
  Snackbar = require('@mui/material/Snackbar').default;
  MenuItem = require('@mui/material/MenuItem').default;
  Autocomplete = require('@mui/material/Autocomplete').default;
  Box = require('@mui/material/Box').default;
}

const ROLE_OPTIONS = [
  { value: Role.Employee, label: 'Employee' },
  { value: Role.Supervisor, label: 'Supervisor' },
  { value: Role.Manager, label: 'Manager' },
  { value: Role.HR, label: 'HR' },
  { value: Role.HRDirector, label: 'HR Director' },
];

interface ReviewDialogState {
  open: boolean;
  registration: PendingRegistration | null;
  mode: 'approve' | 'reject' | null;
  emp_code: string;
  role: Role;
  department: string;
  supervisor_id: string | null;
  manager_id: string | null;
  rejectReason: string;
  submitting: boolean;
}

const INITIAL_DIALOG: ReviewDialogState = {
  open: false,
  registration: null,
  mode: null,
  emp_code: '',
  role: Role.Employee,
  department: '',
  supervisor_id: null,
  manager_id: null,
  rejectReason: '',
  submitting: false,
};

export default function RegistrationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<ReviewDialogState>(INITIAL_DIALOG);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [regs, emps] = await Promise.all([
        registrationService.getPendingRegistrations(),
        userService.getEmployees({ is_active: true }),
      ]);
      setRegistrations(regs);
      setEmployees(emps);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const { invalidate } = useAutoRefresh(() => { fetchData(); }, []);

  const openReview = (reg: PendingRegistration) => {
    setDialog({
      ...INITIAL_DIALOG,
      open: true,
      registration: reg,
    });
  };

  const handleApprove = async () => {
    if (!dialog.registration || !user) return;
    if (!dialog.emp_code.trim()) return;

    setDialog((d) => ({ ...d, submitting: true }));
    try {
      await registrationService.approveRegistration(
        dialog.registration.id,
        {
          emp_code: dialog.emp_code,
          role: dialog.role,
          department: dialog.department,
          supervisor_id: dialog.supervisor_id,
          manager_id: dialog.manager_id,
        },
        user.id
      );
      setSnack({ open: true, message: 'Registration approved!', severity: 'success' });
      setDialog(INITIAL_DIALOG);
      invalidate();
    } catch (err: any) {
      setSnack({ open: true, message: err.message, severity: 'error' });
      setDialog((d) => ({ ...d, submitting: false }));
    }
  };

  const handleReject = async () => {
    if (!dialog.registration || !user || !dialog.rejectReason.trim()) return;

    setDialog((d) => ({ ...d, submitting: true }));
    try {
      await registrationService.rejectRegistration(
        dialog.registration.id,
        dialog.rejectReason,
        user.id
      );
      setSnack({ open: true, message: 'Registration rejected.', severity: 'success' });
      setDialog(INITIAL_DIALOG);
      invalidate();
    } catch (err: any) {
      setSnack({ open: true, message: err.message, severity: 'error' });
      setDialog((d) => ({ ...d, submitting: false }));
    }
  };

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
            <MuiButton size="small" onClick={() => openReview(params.row)}>
              Review
            </MuiButton>
          ) : (
            <Chip label="Waiting" size="small" variant="outlined" />
          ),
      },
    ];

    const reg = dialog.registration;
    const doc = reg?.employee_documents;

    return (
      <MuiThemeProvider>
        <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <ScreenHeader title="Pending Registrations" subtitle="Review and approve employee self-registrations" onBack={() => router.back()} />

          <div style={{ flex: 1, marginTop: 16 }}>
            <DataGrid
              rows={registrations}
              columns={columns}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              disableRowSelectionOnClick
              getRowId={(row: any) => row.id}
              sx={{
                '& .MuiDataGrid-cell': { fontSize: 13 },
                border: isDark ? '1px solid #334155' : '1px solid #E2E8F0',
              }}
            />
          </div>

          {/* Review Dialog */}
          <Dialog open={dialog.open} onClose={() => setDialog(INITIAL_DIALOG)} maxWidth="sm" fullWidth>
            <DialogTitle>Review Registration</DialogTitle>
            <DialogContent>
              {reg && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  {/* Submitted info */}
                  <MuiAlert severity="info" variant="outlined">
                    <strong>{reg.full_name || '(No name)'}</strong> — {reg.email}
                    {reg.phone && <> — {reg.phone}</>}
                  </MuiAlert>

                  {doc && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, fontSize: 13, p: 1.5, bgcolor: isDark ? '#1E293B' : '#F8FAFC', borderRadius: 1 }}>
                      <div><strong>Iqama:</strong> {doc.iqama_number || '-'}</div>
                      <div><strong>Iqama Expiry:</strong> {doc.iqama_expiry || '-'}</div>
                      <div><strong>Passport:</strong> {doc.passport_number || '-'}</div>
                      <div><strong>Passport Expiry:</strong> {doc.passport_expiry || '-'}</div>
                      <div><strong>Insurance:</strong> {doc.insurance_number || '-'}</div>
                      <div><strong>Insurance Expiry:</strong> {doc.insurance_expiry || '-'}</div>
                      <div><strong>Occupation:</strong> {doc.occupation || '-'}</div>
                      <div><strong>Birth Date:</strong> {doc.birth_date || '-'}</div>
                    </Box>
                  )}

                  {dialog.mode !== 'reject' && (
                    <>
                      <MuiTextField
                        label="Employee Code"
                        value={dialog.emp_code}
                        onChange={(e: any) => setDialog((d) => ({ ...d, emp_code: e.target.value }))}
                        size="small"
                        required
                        placeholder="e.g. 70150"
                      />

                      <MuiTextField
                        label="Role"
                        select
                        value={dialog.role}
                        onChange={(e: any) => setDialog((d) => ({ ...d, role: e.target.value }))}
                        size="small"
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </MuiTextField>

                      <MuiTextField
                        label="Department"
                        value={dialog.department}
                        onChange={(e: any) => setDialog((d) => ({ ...d, department: e.target.value }))}
                        size="small"
                        placeholder="e.g. Engineering"
                      />

                      <Autocomplete
                        options={employees}
                        getOptionLabel={(opt: Profile) => `${opt.full_name} (${getRoleLabel(opt.role)})`}
                        value={employees.find((e) => e.id === dialog.supervisor_id) || null}
                        onChange={(_: any, val: Profile | null) => setDialog((d) => ({ ...d, supervisor_id: val?.id || null }))}
                        renderInput={(params: any) => <MuiTextField {...params} label="Supervisor" size="small" />}
                        size="small"
                      />

                      <Autocomplete
                        options={employees}
                        getOptionLabel={(opt: Profile) => `${opt.full_name} (${getRoleLabel(opt.role)})`}
                        value={employees.find((e) => e.id === dialog.manager_id) || null}
                        onChange={(_: any, val: Profile | null) => setDialog((d) => ({ ...d, manager_id: val?.id || null }))}
                        renderInput={(params: any) => <MuiTextField {...params} label="Manager" size="small" />}
                        size="small"
                      />
                    </>
                  )}

                  {dialog.mode === 'reject' && (
                    <MuiTextField
                      label="Rejection Reason"
                      value={dialog.rejectReason}
                      onChange={(e: any) => setDialog((d) => ({ ...d, rejectReason: e.target.value }))}
                      size="small"
                      multiline
                      rows={3}
                      required
                      placeholder="Explain why this registration is being rejected..."
                    />
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <MuiButton onClick={() => setDialog(INITIAL_DIALOG)}>Cancel</MuiButton>
              {dialog.mode === 'reject' ? (
                <MuiButton
                  color="error"
                  variant="contained"
                  onClick={handleReject}
                  disabled={dialog.submitting || !dialog.rejectReason.trim()}
                >
                  {dialog.submitting ? 'Rejecting...' : 'Confirm Rejection'}
                </MuiButton>
              ) : (
                <>
                  <MuiButton
                    color="error"
                    onClick={() => setDialog((d) => ({ ...d, mode: 'reject' }))}
                    disabled={dialog.submitting}
                  >
                    Reject
                  </MuiButton>
                  <MuiButton
                    color="success"
                    variant="contained"
                    onClick={handleApprove}
                    disabled={dialog.submitting || !dialog.emp_code.trim()}
                  >
                    {dialog.submitting ? 'Approving...' : 'Approve'}
                  </MuiButton>
                </>
              )}
            </DialogActions>
          </Dialog>

          <Snackbar
            open={snack.open}
            autoHideDuration={4000}
            onClose={() => setSnack((s) => ({ ...s, open: false }))}
          >
            <MuiAlert severity={snack.severity} variant="filled">
              {snack.message}
            </MuiAlert>
          </Snackbar>
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
        {item.registration_status === 'pending_approval' && (
          <Button
            onPress={() => openReview(item)}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Review
          </Button>
        )}
      </View>
    </Card>
  );

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900" edges={['top']}>
      <ScreenHeader title="Pending Registrations" subtitle="Review employee self-registrations" onBack={() => router.back()} />
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
