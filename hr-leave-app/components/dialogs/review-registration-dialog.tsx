/**
 * ReviewRegistrationDialog
 *
 * Web-only MUI dialog used by HR to approve or reject a pending employee
 * registration. Mounted by both:
 *   - app/(app)/admin/registrations.tsx (the dedicated list page)
 *   - app/(app)/(tabs)/dashboard.tsx    (the Action Required card)
 *
 * Uses pure MUI theme tokens (`background.paper`, `text.primary`, `divider`)
 * so it inherits the surrounding `MuiThemeProvider` and matches the Edit
 * Employee dialog visually (no hand-rolled hex colors, no light-theme
 * dropdown menus inside a dark dialog, etc.).
 *
 * The yellow diff highlight (employee changed something HR originally
 * entered) is rendered as a faint background on the affected disabled
 * MuiTextField plus a `helperText` that shows the original value.
 */
import React, { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MuiTextField from '@mui/material/TextField';
import MuiButton from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import MuiAlert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

import { registrationService, userService } from '@/services';
import { supabase } from '@/services/supabase/client';
import { Role } from '@/types/enums';
import { getRoleLabel } from '@/lib/utils';
import type { PendingRegistration, Profile } from '@/types/models';

const ROLE_OPTIONS = [
  { value: Role.Employee, label: 'Employee' },
  { value: Role.Supervisor, label: 'Supervisor' },
  { value: Role.Manager, label: 'Manager' },
  { value: Role.HR, label: 'HR' },
  { value: Role.HRDirector, label: 'HR Director' },
];

function prettyIdType(t: string | null | undefined): string {
  if (t === 'national_id') return 'Saudi National ID';
  if (t === 'iqama')       return 'Iqama (Residence Permit)';
  if (t === 'passport')    return 'Passport';
  return '';
}

/**
 * Compute the diff helper text + background for a read-only field. If the
 * employee did not change the value (or HR didn't pre-fill it), we render
 * nothing.
 */
function diff(value: any, original: any): { changed: boolean; help?: string } {
  const hasOriginal =
    original !== undefined && original !== null && String(original) !== '';
  if (!hasOriginal) return { changed: false };
  const changed = String(value ?? '') !== String(original);
  return changed
    ? { changed: true, help: `Originally: ${original}` }
    : { changed: false };
}

const yellowSx = {
  '& .MuiInputBase-root': {
    bgcolor: 'rgba(245,158,11,0.12)',
  },
  '& .MuiFormHelperText-root': {
    color: 'warning.main',
    fontWeight: 600,
  },
};

interface Props {
  open: boolean;
  registration: PendingRegistration | null;
  currentUserId: string | undefined;
  onClose: () => void;
  onProcessed: () => void;
}

export function ReviewRegistrationDialog({
  open,
  registration,
  currentUserId,
  onClose,
  onProcessed,
}: Props) {
  const reg = registration;
  const doc = reg?.employee_documents;
  const orig = reg?.hr_original_values || {};

  const [employees, setEmployees] = useState<Profile[]>([]);
  const [idDocSignedUrl, setIdDocSignedUrl] = useState<string>('');

  const [mode, setMode] = useState<'review' | 'reject'>('review');
  const [empCode, setEmpCode] = useState('');
  const [role, setRole] = useState<Role>(Role.Employee);
  const [department, setDepartment] = useState('');
  const [supervisorId, setSupervisorId] = useState<string | null>(null);
  const [managerId, setManagerId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>(
    { open: false, message: '', severity: 'success' },
  );

  // Reset internal state + lazy-fetch employees / signed URL when a new
  // registration is opened.
  useEffect(() => {
    if (!open || !reg) return;

    setMode('review');
    setRejectReason('');
    setSubmitting(false);

    setEmpCode(
      reg.employee_documents?.emp_code?.startsWith('PENDING-')
        ? '' // self-registration placeholder → leave blank for HR
        : reg.employee_documents?.emp_code || '',
    );
    setRole((reg.role as Role) || Role.Employee);
    setDepartment(reg.department || '');
    setSupervisorId(reg.supervisor_id);
    setManagerId(reg.manager_id);

    setIdDocSignedUrl('');
    const path = reg.employee_documents?.id_document_url;
    if (path) {
      supabase.storage
        .from('employee-id-documents')
        .createSignedUrl(path, 60 * 10)
        .then(({ data }) => { if (data?.signedUrl) setIdDocSignedUrl(data.signedUrl); })
        .catch(() => { /* preview just won't show */ });
    }

    // Only fetch employees once per dialog session.
    if (employees.length === 0) {
      userService.getEmployees({ is_active: true })
        .then(setEmployees)
        .catch(() => { /* HR can still type role/dept manually */ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reg?.id]);

  const handleApprove = async () => {
    if (!reg || !currentUserId) return;
    if (!empCode.trim()) return;
    setSubmitting(true);
    try {
      await registrationService.approveRegistration(
        reg.id,
        {
          emp_code: empCode.trim(),
          role,
          department,
          supervisor_id: supervisorId,
          manager_id: managerId,
        },
        currentUserId,
      );
      setSnack({ open: true, message: 'Registration approved.', severity: 'success' });
      onProcessed();
      onClose();
    } catch (err: any) {
      setSnack({ open: true, message: err.message || 'Approval failed', severity: 'error' });
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!reg || !currentUserId || !rejectReason.trim()) return;
    setSubmitting(true);
    try {
      await registrationService.rejectRegistration(reg.id, rejectReason.trim(), currentUserId);
      setSnack({ open: true, message: 'Registration rejected.', severity: 'success' });
      onProcessed();
      onClose();
    } catch (err: any) {
      setSnack({ open: true, message: err.message || 'Rejection failed', severity: 'error' });
      setSubmitting(false);
    }
  };

  // --- Field metadata (computed once per render) ----------------------

  const fullNameDiff = useMemo(() => diff(reg?.full_name, orig.full_name), [reg?.full_name, orig.full_name]);
  const phoneDiff    = useMemo(() => diff(reg?.phone,     orig.phone),     [reg?.phone,     orig.phone]);

  const primaryIdNumber =
    doc?.id_type === 'national_id' ? doc?.national_id_number :
    doc?.id_type === 'passport'    ? doc?.passport_number    :
    doc?.id_type === 'iqama'       ? doc?.iqama_number       : '';

  const primaryIdLabel =
    doc?.id_type === 'national_id' ? 'National ID Number' :
    doc?.id_type === 'passport'    ? 'Passport Number'    :
    doc?.id_type === 'iqama'       ? 'Iqama Number'       : 'ID Number';

  const primaryIdExpiry =
    doc?.id_type === 'passport' ? doc?.passport_expiry :
    doc?.id_type === 'iqama'    ? doc?.iqama_expiry    : '';

  const primaryIdExpiryLabel =
    doc?.id_type === 'passport' ? 'Passport Expiry' :
    doc?.id_type === 'iqama'    ? 'Iqama Expiry'    : '';

  const isImage = /\.(jpe?g|png|webp)$/i.test(doc?.id_document_url || '');

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, backgroundImage: 'none' } }}
      >
        <DialogTitle
          sx={{
            pb: 1,
            pt: 3,
            px: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ fontSize: 18, fontWeight: 700 }}>Review Registration</Box>
          <Box sx={{ fontSize: 13, fontWeight: 400, opacity: 0.65, mt: 0.25 }}>
            {reg?.full_name || ''}
            {reg?.email && <> · {reg.email}</>}
          </Box>
          {reg?.hr_original_values && (
            <Box sx={{ fontSize: 12, fontWeight: 400, opacity: 0.55, mt: 0.5 }}>
              Yellow-tinted fields were changed by the employee from what HR originally entered.
            </Box>
          )}
        </DialogTitle>

        <DialogContent
          sx={{
            pt: '24px !important',
            pb: 1,
            px: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            overflow: 'visible',
          }}
        >
          {!reg ? null : (
            <>
              {/* Identity row */}
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <MuiTextField
                  label="Full Name"
                  value={reg.full_name || ''}
                  fullWidth size="small" disabled
                  sx={fullNameDiff.changed ? yellowSx : undefined}
                  helperText={fullNameDiff.help}
                />
                <MuiTextField
                  label="Email"
                  value={reg.email || ''}
                  fullWidth size="small" disabled
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <MuiTextField
                  label="Phone"
                  value={reg.phone || ''}
                  fullWidth size="small" disabled
                  sx={phoneDiff.changed ? yellowSx : undefined}
                  helperText={phoneDiff.help}
                />
                <MuiTextField
                  label="Submitted"
                  value={reg.created_at ? new Date(reg.created_at).toLocaleString() : ''}
                  fullWidth size="small" disabled
                />
              </Box>

              {/* Personal info */}
              <SectionLabel>Personal Info (employee-supplied)</SectionLabel>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <MuiTextField
                  label="Nationality"
                  value={reg.nationality || ''}
                  fullWidth size="small" disabled
                />
                <MuiTextField
                  label="Date of Birth"
                  value={doc?.birth_date || ''}
                  fullWidth size="small" disabled
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <MuiTextField
                  label="Insurance Number"
                  value={doc?.insurance_number || ''}
                  fullWidth size="small" disabled
                />
                <MuiTextField
                  label="Insurance Expiry"
                  value={doc?.insurance_expiry || ''}
                  fullWidth size="small" disabled
                />
              </Box>

              {/* Primary identification */}
              <SectionLabel>Primary Identification</SectionLabel>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <MuiTextField
                  label="ID Type"
                  value={prettyIdType(doc?.id_type)}
                  fullWidth size="small" disabled
                />
                <MuiTextField
                  label={primaryIdLabel}
                  value={primaryIdNumber || ''}
                  fullWidth size="small" disabled
                />
              </Box>
              {primaryIdExpiryLabel && (
                <MuiTextField
                  label={primaryIdExpiryLabel}
                  value={primaryIdExpiry || ''}
                  fullWidth size="small" disabled
                />
              )}

              {/* Document preview */}
              <Box>
                <Box sx={{ fontSize: 11, fontWeight: 700, opacity: 0.7, mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Uploaded Document
                </Box>
                {idDocSignedUrl ? (
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      overflow: 'hidden',
                      bgcolor: 'background.default',
                    }}
                  >
                    {isImage ? (
                      <img
                        src={idDocSignedUrl}
                        alt="ID document"
                        style={{ display: 'block', maxWidth: '100%', maxHeight: 320, margin: '0 auto' }}
                      />
                    ) : (
                      <Box sx={{ p: 2 }}>
                        <a href={idDocSignedUrl} target="_blank" rel="noreferrer" style={{ color: '#3B82F6', fontWeight: 600 }}>
                          Open uploaded document ↗
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

              {/* Supplementary documents */}
              {doc && doc.id_type !== 'iqama' && doc.iqama_number && (
                <MuiTextField
                  label="Iqama (supplementary)"
                  value={`${doc.iqama_number} · expires ${doc.iqama_expiry || '—'}`}
                  fullWidth size="small" disabled
                />
              )}
              {doc && doc.id_type !== 'passport' && doc.passport_number && (
                <MuiTextField
                  label="Passport (supplementary)"
                  value={`${doc.passport_number} · expires ${doc.passport_expiry || '—'}`}
                  fullWidth size="small" disabled
                />
              )}

              {/* HR-controlled assignments — hidden in reject mode */}
              {mode === 'review' && (
                <>
                  <SectionLabel>
                    HR-Controlled Assignments
                    {reg.hr_original_values && (
                      <Box component="span" sx={{ fontWeight: 400, opacity: 0.6, ml: 1 }}>
                        (pre-filled from HR creation)
                      </Box>
                    )}
                  </SectionLabel>

                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <MuiTextField
                      label="Employee Code"
                      value={empCode}
                      onChange={(e: any) => setEmpCode(e.target.value)}
                      fullWidth size="small" required
                      placeholder="e.g. 70150"
                    />
                    <MuiTextField
                      label="Role"
                      select
                      value={role}
                      onChange={(e: any) => setRole(e.target.value as Role)}
                      fullWidth size="small" required
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </MuiTextField>
                  </Box>

                  <MuiTextField
                    label="Department"
                    value={department}
                    onChange={(e: any) => setDepartment(e.target.value)}
                    fullWidth size="small" required
                    placeholder="e.g. Engineering"
                  />

                  <Autocomplete
                    options={employees}
                    getOptionLabel={(opt: Profile) => `${opt.full_name} (${getRoleLabel(opt.role)})`}
                    isOptionEqualToValue={(opt: Profile, val: Profile) => opt.id === val.id}
                    value={employees.find((e) => e.id === supervisorId) || null}
                    onChange={(_: any, val: Profile | null) => setSupervisorId(val?.id || null)}
                    renderInput={(params: any) => (
                      <MuiTextField {...params} label="Supervisor / Reports To" size="small" placeholder="Search by name..." />
                    )}
                    fullWidth size="small"
                  />

                  <Autocomplete
                    options={employees}
                    getOptionLabel={(opt: Profile) => `${opt.full_name} (${getRoleLabel(opt.role)})`}
                    isOptionEqualToValue={(opt: Profile, val: Profile) => opt.id === val.id}
                    value={employees.find((e) => e.id === managerId) || null}
                    onChange={(_: any, val: Profile | null) => setManagerId(val?.id || null)}
                    renderInput={(params: any) => (
                      <MuiTextField {...params} label="Manager" size="small" placeholder="Search by name..." />
                    )}
                    fullWidth size="small"
                  />
                </>
              )}

              {/* Rejection reason */}
              {mode === 'reject' && (
                <>
                  <SectionLabel>Rejection Reason</SectionLabel>
                  <MuiTextField
                    label="Why is this registration being rejected?"
                    value={rejectReason}
                    onChange={(e: any) => setRejectReason(e.target.value)}
                    fullWidth size="small" required
                    multiline rows={3}
                    placeholder="The employee will see this message in their notification..."
                    autoFocus
                  />
                </>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            gap: 1,
          }}
        >
          <MuiButton
            onClick={onClose}
            disabled={submitting}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </MuiButton>
          <Box sx={{ flex: 1 }} />
          {mode === 'reject' ? (
            <>
              <MuiButton
                onClick={() => setMode('review')}
                disabled={submitting}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Back
              </MuiButton>
              <MuiButton
                color="error"
                variant="contained"
                onClick={handleReject}
                disabled={submitting || !rejectReason.trim()}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
              >
                {submitting ? 'Rejecting…' : 'Confirm Rejection'}
              </MuiButton>
            </>
          ) : (
            <>
              <MuiButton
                color="error"
                onClick={() => setMode('reject')}
                disabled={submitting}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Reject
              </MuiButton>
              <MuiButton
                color="success"
                variant="contained"
                onClick={handleApprove}
                disabled={submitting || !empCode.trim() || !department.trim()}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
              >
                {submitting ? 'Approving…' : 'Approve'}
              </MuiButton>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert severity={snack.severity} variant="filled" sx={{ width: '100%' }}>
          {snack.message}
        </MuiAlert>
      </Snackbar>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        fontSize: 11,
        fontWeight: 700,
        opacity: 0.7,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        mt: 1,
      }}
    >
      {children}
    </Box>
  );
}
