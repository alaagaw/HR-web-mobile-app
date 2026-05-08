import { useCallback, useEffect, useState } from 'react';
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
import { supabase } from '@/services/supabase/client';
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

// ─── Dialog helpers ────────────────────────────────────────────────

function prettyIdType(t: string | null | undefined): string {
  if (t === 'national_id') return 'Saudi National ID';
  if (t === 'iqama')       return 'Iqama (Residence Permit)';
  if (t === 'passport')    return 'Passport';
  return '—';
}

/**
 * Diff highlight: render value with a yellow tint if it differs from the
 * HR-original snapshot. Plain text otherwise.
 */
function hl(value: any, original: any, isDark: boolean, bold: boolean = false): any {
  const display = value ?? '—';
  const changed =
    original !== undefined &&
    original !== null &&
    String(original) !== '' &&
    String(value) !== String(original);
  if (!changed) {
    return bold ? <span style={{ fontWeight: 700 }}>{display}</span> : display;
  }
  return (
    <span
      title={`Originally: ${String(original)}`}
      style={{
        backgroundColor: isDark ? 'rgba(245,158,11,0.25)' : 'rgba(254,243,199,0.9)',
        color: isDark ? '#FBBF24' : '#92400E',
        padding: '1px 6px',
        borderRadius: 4,
        fontWeight: bold ? 700 : 500,
      }}
    >
      {display}
    </span>
  );
}

// Small read-only labelled value used inside the dialog grid.
function Field({ label, value, bg }: { label: string; value: any; bg: boolean }) {
  return (
    <div style={{
      padding: '8px 12px',
      borderRadius: 8,
      background: bg ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
      border: `1px solid ${bg ? 'rgba(255,255,255,0.06)' : '#E2E8F0'}`,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>
        {value || '—'}
      </div>
    </div>
  );
}

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

  const [idDocSignedUrl, setIdDocSignedUrl] = useState<string>('');

  const openReview = (reg: PendingRegistration) => {
    // Pre-fill the HR-controlled fields from the existing profile/document
    // row. For HR-invited employees, all of these are already set (HR
    // entered them at create-employee time) — the dialog just confirms.
    // For self-registered employees, the values are blank and HR fills.
    setDialog({
      ...INITIAL_DIALOG,
      open: true,
      registration: reg,
      emp_code: reg.employee_documents?.emp_code?.startsWith('PENDING-')
        ? '' // PENDING-<timestamp> placeholder from self-registration → blank
        : reg.employee_documents?.emp_code || '',
      role: (reg.role as Role) || Role.Employee,
      department: reg.department || '',
      supervisor_id: reg.supervisor_id,
      manager_id: reg.manager_id,
    });
    setIdDocSignedUrl('');

    // If the employee uploaded an ID document, fetch a signed URL to display it.
    const path = reg.employee_documents?.id_document_url;
    if (path) {
      supabase.storage
        .from('employee-id-documents')
        .createSignedUrl(path, 60 * 10) // 10-minute signed URL
        .then(({ data }) => { if (data?.signedUrl) setIdDocSignedUrl(data.signedUrl); })
        .catch(() => { /* preview will just be a download fallback */ });
    }
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
          <Dialog
            open={dialog.open}
            onClose={() => setDialog(INITIAL_DIALOG)}
            maxWidth="md"
            fullWidth
            PaperProps={{
              sx: {
                bgcolor: isDark ? '#0B1220' : '#FFFFFF',
                color: isDark ? '#F1F5F9' : '#0F172A',
                backgroundImage: 'none',
                borderRadius: 3,
              },
            }}
          >
            <DialogTitle
              sx={{
                fontSize: 18,
                fontWeight: 700,
                borderBottom: '1px solid',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                pb: 2,
              }}
            >
              Review Registration
              {reg?.hr_original_values && (
                <Box sx={{ fontSize: 12, fontWeight: 400, opacity: 0.7, mt: 0.5 }}>
                  Yellow fields = changed by employee from what HR originally entered.
                </Box>
              )}
            </DialogTitle>
            <DialogContent sx={{ pt: '20px !important' }}>
              {reg && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {/* Identity header */}
                  <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }}>
                    <Box sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>
                      {hl(reg.full_name, reg.hr_original_values?.full_name, isDark, true)}
                    </Box>
                    <Box sx={{ fontSize: 13, opacity: 0.8 }}>
                      {reg.email}
                      {reg.phone && <> · {hl(reg.phone, reg.hr_original_values?.phone, isDark)}</>}
                    </Box>
                  </Box>

                  {/* Employee-supplied personal info */}
                  <Box>
                    <Box sx={{ fontSize: 12, fontWeight: 700, opacity: 0.7, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Personal Info (employee-supplied)
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.25, fontSize: 13 }}>
                      <Field label="Nationality" value={reg.nationality} bg={isDark} />
                      <Field label="Date of Birth" value={doc?.birth_date} bg={isDark} />
                      <Field label="Insurance Number" value={doc?.insurance_number} bg={isDark} />
                      <Field label="Insurance Expiry" value={doc?.insurance_expiry} bg={isDark} />
                    </Box>
                  </Box>

                  {/* Primary ID */}
                  <Box>
                    <Box sx={{ fontSize: 12, fontWeight: 700, opacity: 0.7, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Primary Identification
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.25, fontSize: 13 }}>
                      <Field label="ID Type" value={prettyIdType(doc?.id_type)} bg={isDark} />
                      <Field
                        label={
                          doc?.id_type === 'national_id' ? 'National ID Number'
                            : doc?.id_type === 'passport' ? 'Passport Number'
                              : 'Iqama Number'
                        }
                        value={
                          doc?.id_type === 'national_id' ? doc?.national_id_number
                            : doc?.id_type === 'passport' ? doc?.passport_number
                              : doc?.iqama_number
                        }
                        bg={isDark}
                      />
                      {doc?.id_type !== 'national_id' && (
                        <Field
                          label={doc?.id_type === 'passport' ? 'Passport Expiry' : 'Iqama Expiry'}
                          value={doc?.id_type === 'passport' ? doc?.passport_expiry : doc?.iqama_expiry}
                          bg={isDark}
                        />
                      )}
                    </Box>

                    {/* Document preview */}
                    <Box sx={{ mt: 1.5 }}>
                      <Box sx={{ fontSize: 11, fontWeight: 600, opacity: 0.7, mb: 0.5 }}>UPLOADED DOCUMENT</Box>
                      {idDocSignedUrl ? (
                        <Box sx={{ border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', borderRadius: 2, overflow: 'hidden', bgcolor: isDark ? '#0B1220' : '#F8FAFC' }}>
                          {/\.(jpe?g|png)$/i.test(doc?.id_document_url || '') ? (
                            <img
                              src={idDocSignedUrl}
                              alt="ID document"
                              style={{ display: 'block', maxWidth: '100%', maxHeight: 320, margin: '0 auto' }}
                            />
                          ) : (
                            <Box sx={{ p: 2 }}>
                              <a href={idDocSignedUrl} target="_blank" rel="noreferrer" style={{ color: '#3B82F6', fontWeight: 600 }}>
                                Open uploaded document (PDF) ↗
                              </a>
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Box sx={{ fontSize: 12, opacity: 0.6, fontStyle: 'italic' }}>
                          {doc?.id_document_url ? 'Loading preview…' : 'No document uploaded.'}
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Other supplementary documents (only show if non-primary entries exist) */}
                  {doc && (doc.id_type !== 'iqama' && doc.iqama_number) && (
                    <Field label="Iqama (supplementary)" value={`${doc.iqama_number} · expires ${doc.iqama_expiry || '—'}`} bg={isDark} />
                  )}
                  {doc && (doc.id_type !== 'passport' && doc.passport_number) && (
                    <Field label="Passport (supplementary)" value={`${doc.passport_number} · expires ${doc.passport_expiry || '—'}`} bg={isDark} />
                  )}

                  {/* HR-controlled fields — pre-filled, editable */}
                  {dialog.mode !== 'reject' && (
                    <Box>
                      <Box sx={{ fontSize: 12, fontWeight: 700, opacity: 0.7, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        HR-controlled assignments {reg.hr_original_values && '(pre-filled from HR creation)'}
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
                      </Box>
                    </Box>
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
            <DialogActions
              sx={{
                p: 2,
                borderTop: '1px solid',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              }}
            >
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
