/**
 * ReviewRegistrationDialog
 *
 * Web-only MUI dialog used by HR to approve or reject a pending employee
 * registration. Mounted by both:
 *   - app/(app)/admin/registrations.tsx (the dedicated list page)
 *   - app/(app)/(tabs)/dashboard.tsx    (the Action Required card)
 *
 * Three stages:
 *   1. review   — read-only by default. Identity + ID fields shown as
 *                 disabled MuiTextFields. HR can click "Edit" in the
 *                 title bar to unlock those fields.
 *   2. edit     — same view as `review` but the employee-supplied
 *                 inputs are enabled, the document slot turns into a
 *                 re-upload zone, and a slim "Editing" banner appears.
 *   3. confirm  — shown when HR clicks Approve with at least one edit.
 *                 Lists every changed field (old → new) and asks for
 *                 one final confirmation before persisting. Back goes
 *                 to edit mode without losing the entered values.
 *
 * Save path (in this order, on Confirm & Approve):
 *   1. If email changed   → registrationService.updateRegistrationEmail
 *      (edge function `update-employee-email`)
 *   2. If new file picked → upload to employee-id-documents/<userId>/
 *   3. If any field diff  → registrationService.updateRegistrationFields
 *      (RPC hr_update_pending_profile, which also writes audit rows)
 *   4. Finally            → registrationService.approveRegistration
 *
 * Audit:
 *   Every field-level change from step 3 lands as a row in
 *   profile_audit_log with context='registration_review'.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { rotateImageBlob } from '@/lib/image-rotation';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';
import type {
  Attachment,
  PendingRegistration,
  Profile,
  RegistrationFieldEdits,
  IdType,
} from '@/types/models';

const ROLE_OPTIONS = [
  { value: Role.Employee, label: 'Employee' },
  { value: Role.Supervisor, label: 'Supervisor' },
  { value: Role.Manager, label: 'Manager' },
  { value: Role.HR, label: 'HR' },
  { value: Role.HRDirector, label: 'HR Director' },
];

const ID_TYPE_OPTIONS: { value: IdType; label: string }[] = [
  { value: 'national_id', label: 'Saudi National ID' },
  { value: 'iqama',       label: 'Iqama (Residence Permit)' },
  { value: 'passport',    label: 'Passport' },
];

function prettyIdType(t: string | null | undefined): string {
  if (t === 'national_id') return 'Saudi National ID';
  if (t === 'iqama')       return 'Iqama (Residence Permit)';
  if (t === 'passport')    return 'Passport';
  return '';
}

/**
 * Compute the diff helper text + background for the original yellow
 * highlight (employee changed something HR pre-filled). Unrelated to
 * the new HR-edit feature; kept for the existing pre-fill case.
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

interface EditValues {
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  id_type: IdType | '';
  national_id_number: string;
  iqama_number: string;
  iqama_expiry: string;
  passport_number: string;
  passport_expiry: string;
}

interface DiffItem {
  label: string;
  oldValue: string;
  newValue: string;
}

interface Props {
  open: boolean;
  registration: PendingRegistration | null;
  currentUserId: string | undefined;
  onClose: () => void;
  onProcessed: () => void;
}

const EMPTY_EDIT: EditValues = {
  full_name: '',
  email: '',
  phone: '',
  nationality: '',
  id_type: '',
  national_id_number: '',
  iqama_number: '',
  iqama_expiry: '',
  passport_number: '',
  passport_expiry: '',
};

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [docRotation, setDocRotation] = useState<number>(0);
  const [rotatingSaving, setRotatingSaving] = useState(false);

  const [mode, setMode] = useState<'review' | 'reject'>('review');
  const [stage, setStage] = useState<'review' | 'confirm'>('review');
  const [editMode, setEditMode] = useState(false);

  const [editValues, setEditValues] = useState<EditValues>(EMPTY_EDIT);
  const [pendingDoc, setPendingDoc] = useState<File | null>(null);
  const [pendingDocPreviewUrl, setPendingDocPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Reset everything when a new registration is opened.
  useEffect(() => {
    if (!open || !reg) return;

    setMode('review');
    setStage('review');
    setEditMode(false);
    setRejectReason('');
    setSubmitting(false);
    setPendingDoc(null);
    setPendingDocPreviewUrl('');

    setEditValues({
      full_name:          reg.full_name || '',
      email:              reg.email || '',
      phone:              reg.phone || '',
      nationality:        reg.nationality || '',
      id_type:            (reg.employee_documents?.id_type as IdType | undefined) || '',
      national_id_number: reg.employee_documents?.national_id_number || '',
      iqama_number:       reg.employee_documents?.iqama_number || '',
      iqama_expiry:       reg.employee_documents?.iqama_expiry || '',
      passport_number:    reg.employee_documents?.passport_number || '',
      passport_expiry:    reg.employee_documents?.passport_expiry || '',
    });

    setEmpCode(
      reg.employee_documents?.emp_code?.startsWith('PENDING-')
        ? ''
        : reg.employee_documents?.emp_code || '',
    );
    setRole((reg.role as Role) || Role.Employee);
    setDepartment(reg.department || '');
    setSupervisorId(reg.supervisor_id);
    setManagerId(reg.manager_id);

    setIdDocSignedUrl('');
    setPreviewOpen(false);
    setDocRotation(0);
    setRotatingSaving(false);
    const path = reg.employee_documents?.id_document_url;
    if (path) {
      supabase.storage
        .from('employee-id-documents')
        .createSignedUrl(path, 60 * 10)
        .then(({ data }) => { if (data?.signedUrl) setIdDocSignedUrl(data.signedUrl); })
        .catch(() => { /* preview just won't show */ });
    }

    if (employees.length === 0) {
      userService.getEmployees({ is_active: true })
        .then(setEmployees)
        .catch(() => { /* HR can still type role/dept manually */ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reg?.id]);

  // Revoke the object URL we create for the pending-doc preview, so we
  // don't leak blob URLs across registrations.
  useEffect(() => {
    return () => {
      if (pendingDocPreviewUrl) URL.revokeObjectURL(pendingDocPreviewUrl);
    };
  }, [pendingDocPreviewUrl]);

  // ── Helpers ────────────────────────────────────────────────────

  const setField = <K extends keyof EditValues>(key: K, value: EditValues[K]) =>
    setEditValues((prev) => ({ ...prev, [key]: value }));

  const onFilePicked = (file: File | null) => {
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setSnack({ open: true, message: 'Only PDF, JPG, or PNG files are accepted.', severity: 'error' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSnack({ open: true, message: 'File is larger than 5 MB.', severity: 'error' });
      return;
    }
    if (pendingDocPreviewUrl) URL.revokeObjectURL(pendingDocPreviewUrl);
    setPendingDoc(file);
    setPendingDocPreviewUrl(URL.createObjectURL(file));
  };

  const clearPendingDoc = () => {
    if (pendingDocPreviewUrl) URL.revokeObjectURL(pendingDocPreviewUrl);
    setPendingDoc(null);
    setPendingDocPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /**
   * Persist the currently-displayed rotation back to Storage. Same
   * pattern as the registration form: fetch via signed URL, rotate
   * pixels on a canvas, upload over the same Storage path. The image
   * tag's signed URL is refreshed so the dialog re-renders the new
   * bytes. Only available for the existing on-file image (not the
   * pending re-upload, which HR will replace anyway).
   */
  const handleSaveRotation = async () => {
    const path = reg?.employee_documents?.id_document_url;
    if (!path || docRotation === 0 || pendingDoc) return;
    setRotatingSaving(true);
    try {
      const resp = await fetch(idDocSignedUrl);
      if (!resp.ok) throw new Error('Could not fetch current file');
      const blob = await resp.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error('Rotation is only supported for image files');
      }
      const rotated = await rotateImageBlob(blob, docRotation);
      const { error: upErr } = await supabase.storage
        .from('employee-id-documents')
        .upload(path, rotated, { upsert: true, contentType: blob.type });
      if (upErr) throw new Error(upErr.message);
      const { data: signed } = await supabase.storage
        .from('employee-id-documents')
        .createSignedUrl(path, 60 * 10);
      if (signed?.signedUrl) setIdDocSignedUrl(signed.signedUrl);
      setDocRotation(0);
      setSnack({ open: true, message: 'Rotation saved.', severity: 'success' });
    } catch (err: any) {
      setSnack({ open: true, message: err.message || 'Rotation save failed', severity: 'error' });
    } finally {
      setRotatingSaving(false);
    }
  };

  const enterEditMode = () => {
    setEditMode(true);
  };

  const cancelEditMode = () => {
    if (!reg) return;
    // Revert edit values to whatever's currently in the DB.
    setEditValues({
      full_name:          reg.full_name || '',
      email:              reg.email || '',
      phone:              reg.phone || '',
      nationality:        reg.nationality || '',
      id_type:            (reg.employee_documents?.id_type as IdType | undefined) || '',
      national_id_number: reg.employee_documents?.national_id_number || '',
      iqama_number:       reg.employee_documents?.iqama_number || '',
      iqama_expiry:       reg.employee_documents?.iqama_expiry || '',
      passport_number:    reg.employee_documents?.passport_number || '',
      passport_expiry:    reg.employee_documents?.passport_expiry || '',
    });
    clearPendingDoc();
    setEditMode(false);
  };

  // ── Diff computation ───────────────────────────────────────────

  const diffs: DiffItem[] = useMemo(() => {
    if (!reg) return [];
    const items: DiffItem[] = [];

    const push = (label: string, oldRaw: any, newRaw: any) => {
      const ov = oldRaw === null || oldRaw === undefined ? '' : String(oldRaw);
      const nv = newRaw === null || newRaw === undefined ? '' : String(newRaw);
      if (ov !== nv) items.push({ label, oldValue: ov, newValue: nv });
    };

    push('Full Name',     reg.full_name,                  editValues.full_name);
    push('Email',         reg.email,                      editValues.email);
    push('Phone',         reg.phone,                      editValues.phone);
    push('Nationality',   reg.nationality,                editValues.nationality);
    push('ID Type',       prettyIdType(doc?.id_type),     prettyIdType(editValues.id_type || null));
    push('National ID #', doc?.national_id_number,        editValues.national_id_number);
    push('Iqama #',       doc?.iqama_number,              editValues.iqama_number);
    push('Iqama Expiry',  doc?.iqama_expiry,              editValues.iqama_expiry);
    push('Passport #',    doc?.passport_number,           editValues.passport_number);
    push('Passport Expiry', doc?.passport_expiry,         editValues.passport_expiry);

    if (pendingDoc) {
      items.push({
        label: 'Document',
        oldValue: doc?.id_document_url ? (doc.id_document_url.split('/').pop() || '(existing)') : '(none)',
        newValue: pendingDoc.name,
      });
    }

    return items;
  }, [reg, doc, editValues, pendingDoc]);

  const hasEdits = diffs.length > 0;

  // ── Submit handlers ────────────────────────────────────────────

  const handleApproveClick = () => {
    if (!editMode || !hasEdits) {
      // No edits → straight to approval (existing behaviour).
      void runApprove();
      return;
    }
    setStage('confirm');
  };

  const persistEdits = async (): Promise<void> => {
    if (!reg) return;

    // 1. Email change first — has to go through the edge function so
    //    auth.users.email stays in sync with profiles.email.
    if (editValues.email.trim() !== (reg.email || '')) {
      await registrationService.updateRegistrationEmail(
        reg.id,
        editValues.email.trim(),
      );
    }

    // 2. New ID document upload, if HR picked one.
    let newDocPath: string | undefined;
    if (pendingDoc) {
      const ext = pendingDoc.name.split('.').pop() || 'pdf';
      const path = `${reg.id}/hr-id-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('employee-id-documents')
        .upload(path, pendingDoc, { upsert: false, contentType: pendingDoc.type });
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);
      newDocPath = path;
    }

    // 3. Profile + employee_documents field edits via the audit-logged RPC.
    //    Build a payload that only sends fields actually different from
    //    the current DB row (so the RPC's IS DISTINCT FROM checks are
    //    no-ops for unchanged fields and we don't double-log emails).
    const edits: RegistrationFieldEdits = {};
    if (editValues.full_name !== (reg.full_name || ''))            edits.full_name = editValues.full_name;
    if (editValues.phone !== (reg.phone || ''))                    edits.phone = editValues.phone;
    if (editValues.nationality !== (reg.nationality || ''))        edits.nationality = editValues.nationality;
    if ((editValues.id_type || '') !== (doc?.id_type || ''))       edits.id_type = editValues.id_type;
    if (editValues.national_id_number !== (doc?.national_id_number || '')) edits.national_id_number = editValues.national_id_number;
    if (editValues.iqama_number !== (doc?.iqama_number || ''))     edits.iqama_number = editValues.iqama_number;
    if (editValues.iqama_expiry !== (doc?.iqama_expiry || ''))     edits.iqama_expiry = editValues.iqama_expiry;
    if (editValues.passport_number !== (doc?.passport_number || ''))    edits.passport_number = editValues.passport_number;
    if (editValues.passport_expiry !== (doc?.passport_expiry || ''))    edits.passport_expiry = editValues.passport_expiry;
    if (newDocPath)                                                 edits.id_document_url = newDocPath;

    if (Object.keys(edits).length > 0) {
      await registrationService.updateRegistrationFields(reg.id, edits);
    }
  };

  const runApprove = async () => {
    if (!reg || !currentUserId) return;
    if (!empCode.trim()) return;
    setSubmitting(true);
    try {
      await persistEdits();
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
      // Stay on the confirm stage so HR can read the error and try again
      // (or click Back to keep editing).
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

  // ── Static field metadata ──────────────────────────────────────

  const fullNameDiff = useMemo(() => diff(reg?.full_name, orig.full_name), [reg?.full_name, orig.full_name]);
  const phoneDiff    = useMemo(() => diff(reg?.phone,     orig.phone),     [reg?.phone,     orig.phone]);

  const primaryIdLabel =
    editValues.id_type === 'national_id' ? 'National ID Number' :
    editValues.id_type === 'passport'    ? 'Passport Number'    :
    editValues.id_type === 'iqama'       ? 'Iqama Number'       : 'ID Number';

  const primaryIdValue =
    editValues.id_type === 'national_id' ? editValues.national_id_number :
    editValues.id_type === 'passport'    ? editValues.passport_number    :
    editValues.id_type === 'iqama'       ? editValues.iqama_number       : '';

  const setPrimaryIdValue = (v: string) => {
    if (editValues.id_type === 'national_id') setField('national_id_number', v);
    else if (editValues.id_type === 'passport') setField('passport_number', v);
    else if (editValues.id_type === 'iqama') setField('iqama_number', v);
  };

  const primaryIdExpiryLabel =
    editValues.id_type === 'passport' ? 'Passport Expiry' :
    editValues.id_type === 'iqama'    ? 'Iqama Expiry'    : '';

  const primaryIdExpiryValue =
    editValues.id_type === 'passport' ? editValues.passport_expiry :
    editValues.id_type === 'iqama'    ? editValues.iqama_expiry    : '';

  const setPrimaryIdExpiry = (v: string) => {
    if (editValues.id_type === 'passport') setField('passport_expiry', v);
    else if (editValues.id_type === 'iqama') setField('iqama_expiry', v);
  };

  // For the document preview (existing or pending).
  const showPending = !!pendingDoc;
  const docPath = doc?.id_document_url || '';
  const isImageExisting = /\.(jpe?g|png|webp)$/i.test(docPath);
  const isPdfExisting   = /\.pdf$/i.test(docPath);
  const isImagePending  = pendingDoc ? /^image\//.test(pendingDoc.type) : false;

  const docFileName = showPending
    ? pendingDoc!.name
    : docPath ? (docPath.split('/').pop() || 'ID document') : '';
  const docFileType = showPending
    ? pendingDoc!.type
    : isPdfExisting ? 'application/pdf'
    : /\.(jpe?g)$/i.test(docPath) ? 'image/jpeg'
    : /\.png$/i.test(docPath)     ? 'image/png'
    : /\.webp$/i.test(docPath)    ? 'image/webp'
    : '';

  const previewSrc = showPending ? pendingDocPreviewUrl : idDocSignedUrl;

  const docAttachment: Attachment | null = previewSrc
    ? {
        id: 0,
        request_id: reg?.id || '',
        file_name: docFileName,
        file_url: previewSrc,
        file_size: 0,
        file_type: docFileType,
        uploaded_by: reg?.id || '',
        uploaded_at: reg?.created_at || '',
      }
    : null;

  // ── Render helpers ─────────────────────────────────────────────

  const renderEditableField = (
    label: string,
    key: keyof EditValues,
    extra?: {
      type?: string;
      diff?: { changed: boolean; help?: string };
      placeholder?: string;
    },
  ) => (
    <MuiTextField
      label={label}
      value={editValues[key] || ''}
      onChange={(e: any) => setField(key, e.target.value)}
      fullWidth
      size="small"
      disabled={!editMode}
      type={extra?.type}
      InputLabelProps={extra?.type === 'date' ? { shrink: true } : undefined}
      sx={extra?.diff?.changed ? yellowSx : undefined}
      helperText={extra?.diff?.help}
      placeholder={extra?.placeholder}
    />
  );

  // ── Render: confirm stage ──────────────────────────────────────

  const renderConfirmStage = () => (
    <>
      <DialogContent
        sx={{
          pt: '24px !important',
          pb: 1,
          px: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          overflow: 'visible',
        }}
      >
        <Box sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>
          You're changing {diffs.length} {diffs.length === 1 ? 'field' : 'fields'} on{' '}
          {reg?.full_name || 'this registration'} before approval:
        </Box>
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {diffs.map((d, i) => (
            <Box
              key={d.label}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                px: 2,
                py: 1.25,
                bgcolor: i % 2 === 0 ? 'action.hover' : 'transparent',
              }}
            >
              <Box sx={{ width: 140, flexShrink: 0, fontSize: 12, fontWeight: 600, opacity: 0.75 }}>
                {d.label}
              </Box>
              <Box sx={{ flex: 1, fontSize: 13, color: 'error.main', textDecoration: 'line-through', wordBreak: 'break-word' }}>
                {d.oldValue || <em style={{ opacity: 0.55 }}>(empty)</em>}
              </Box>
              <Box sx={{ fontSize: 13, opacity: 0.55 }}>→</Box>
              <Box sx={{ flex: 1, fontSize: 13, color: 'success.main', fontWeight: 600, wordBreak: 'break-word' }}>
                {d.newValue || <em style={{ opacity: 0.55 }}>(empty)</em>}
              </Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ fontSize: 12, opacity: 0.65, mt: 1 }}>
          Every change above will be saved to the employee's record and logged
          in the audit trail. After saving, the registration will be approved
          with Employee Code <b>{empCode || '—'}</b>, Role <b>{getRoleLabel(role)}</b>,
          Department <b>{department || '—'}</b>.
        </Box>
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
          onClick={() => setStage('review')}
          disabled={submitting}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          ← Back to edit
        </MuiButton>
        <Box sx={{ flex: 1 }} />
        <MuiButton
          color="success"
          variant="contained"
          onClick={runApprove}
          disabled={submitting}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
        >
          {submitting ? 'Saving + approving…' : 'Confirm & Approve'}
        </MuiButton>
      </DialogActions>
    </>
  );

  // ── Render: main review stage ──────────────────────────────────

  const renderReviewStage = () => (
    <>
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
            {editMode && (
              <Box
                sx={{
                  px: 1.5, py: 1,
                  bgcolor: 'rgba(245,158,11,0.12)',
                  border: '1px solid',
                  borderColor: 'warning.main',
                  borderRadius: 1,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'warning.dark',
                }}
              >
                Editing mode — you're modifying the employee's submitted data.
                Click Cancel edit to discard changes; Approve will show a
                confirmation step.
              </Box>
            )}

            {/* Identity row */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              {renderEditableField('Full Name', 'full_name', { diff: editMode ? undefined : fullNameDiff })}
              {renderEditableField('Email', 'email', editMode ? { placeholder: 'employee@example.com' } : undefined)}
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              {renderEditableField('Phone', 'phone', { diff: editMode ? undefined : phoneDiff })}
              <MuiTextField
                label="Submitted"
                value={(reg.registration_submitted_at ?? reg.created_at) ? new Date(reg.registration_submitted_at ?? reg.created_at).toLocaleString() : ''}
                fullWidth size="small" disabled
              />
            </Box>

            {/* Personal info */}
            <SectionLabel>Personal Info (employee-supplied)</SectionLabel>
            {renderEditableField('Nationality', 'nationality')}

            {/* Primary identification */}
            <SectionLabel>Primary Identification</SectionLabel>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <MuiTextField
                label="ID Type"
                select
                value={editValues.id_type}
                onChange={(e: any) => setField('id_type', e.target.value as IdType | '')}
                fullWidth size="small"
                disabled={!editMode}
              >
                <MenuItem value="">
                  <em>—</em>
                </MenuItem>
                {ID_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </MuiTextField>
              <MuiTextField
                label={primaryIdLabel}
                value={primaryIdValue || ''}
                onChange={(e: any) => setPrimaryIdValue(e.target.value)}
                fullWidth size="small" disabled={!editMode || !editValues.id_type}
              />
            </Box>
            {primaryIdExpiryLabel && (
              <MuiTextField
                label={primaryIdExpiryLabel}
                type="date"
                InputLabelProps={{ shrink: true }}
                value={primaryIdExpiryValue || ''}
                onChange={(e: any) => setPrimaryIdExpiry(e.target.value)}
                fullWidth size="small" disabled={!editMode}
              />
            )}

            {/* Document preview / re-upload */}
            <Box>
              <Box sx={{ fontSize: 11, fontWeight: 700, opacity: 0.7, mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Uploaded Document
                {pendingDoc && (
                  <Box component="span" sx={{ color: 'success.main', fontWeight: 700, ml: 1 }}>
                    (new upload pending)
                  </Box>
                )}
              </Box>
              {docAttachment ? (
                <Box
                  onClick={() => setPreviewOpen(true)}
                  sx={{
                    border: '1px solid',
                    borderColor: pendingDoc ? 'success.main' : 'divider',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'background.default',
                    cursor: 'pointer',
                    transition: 'border-color 120ms',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  {(showPending ? isImagePending : isImageExisting) ? (
                    <img
                      src={previewSrc}
                      alt="ID document"
                      style={{
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: 320,
                        margin: '0 auto',
                        transform: `rotate(${docRotation}deg)`,
                        transition: 'transform 200ms',
                      }}
                    />
                  ) : (
                    <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ fontSize: 24 }}>📄</Box>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ fontSize: 13, fontWeight: 600, color: 'primary.main' }}>
                          {docFileName}
                        </Box>
                        <Box sx={{ fontSize: 11, opacity: 0.6 }}>Click to preview</Box>
                      </Box>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ fontSize: 12, opacity: 0.6, fontStyle: 'italic' }}>
                  {doc?.id_document_url ? 'Loading preview…' : 'No document uploaded.'}
                </Box>
              )}

              {editMode && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    style={{ display: 'none' }}
                    onChange={(e) => onFilePicked(e.target.files?.[0] || null)}
                  />
                  <MuiButton
                    size="small"
                    variant="outlined"
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ textTransform: 'none' }}
                  >
                    {pendingDoc || docAttachment ? 'Replace file…' : 'Upload file…'}
                  </MuiButton>
                  {pendingDoc && (
                    <MuiButton
                      size="small"
                      color="inherit"
                      onClick={clearPendingDoc}
                      sx={{ textTransform: 'none' }}
                    >
                      Cancel upload
                    </MuiButton>
                  )}
                  <Box sx={{ fontSize: 11, opacity: 0.6 }}>
                    PDF / JPG / PNG, up to 5 MB.
                  </Box>
                </Box>
              )}

              {/* Rotate controls — image-only, only when we're showing
                  the on-file image (not the pending new upload, which
                  HR will replace anyway). */}
              {!pendingDoc && isImageExisting && !!idDocSignedUrl && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MuiButton
                    size="small"
                    variant="outlined"
                    onClick={(e) => { e.stopPropagation(); setDocRotation((r) => (r + 90) % 360); }}
                    disabled={rotatingSaving}
                    sx={{ textTransform: 'none' }}
                    title="Rotate 90° clockwise — click Save rotation to persist"
                  >
                    ⟲ Rotate 90°
                  </MuiButton>
                  {docRotation !== 0 && (
                    <>
                      <MuiButton
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={(e) => { e.stopPropagation(); void handleSaveRotation(); }}
                        disabled={rotatingSaving}
                        sx={{ textTransform: 'none' }}
                      >
                        {rotatingSaving ? 'Saving…' : 'Save rotation'}
                      </MuiButton>
                      <MuiButton
                        size="small"
                        color="inherit"
                        onClick={(e) => { e.stopPropagation(); setDocRotation(0); }}
                        disabled={rotatingSaving}
                        sx={{ textTransform: 'none' }}
                      >
                        Reset
                      </MuiButton>
                    </>
                  )}
                </Box>
              )}
            </Box>

            {/* Supplementary documents — only show in read-only view; edit
                mode lets HR change the primary ID type instead. */}
            {!editMode && doc && doc.id_type !== 'iqama' && doc.iqama_number && (
              <MuiTextField
                label="Iqama (supplementary)"
                value={`${doc.iqama_number} · expires ${doc.iqama_expiry || '—'}`}
                fullWidth size="small" disabled
              />
            )}
            {!editMode && doc && doc.id_type !== 'passport' && doc.passport_number && (
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

            {/* Reason for sending back */}
            {mode === 'reject' && (
              <>
                <SectionLabel>What does the employee need to change?</SectionLabel>
                <MuiTextField
                  label="Tell them what to fix"
                  value={rejectReason}
                  onChange={(e: any) => setRejectReason(e.target.value)}
                  fullWidth size="small" required
                  multiline rows={3}
                  placeholder="e.g. The ID number doesn't match the document you uploaded — please re-check and resubmit."
                  helperText="This message goes to the employee verbatim, via in-app notification and email. They can keep using the system; the registration goes back to them for a one-time fix."
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
              variant="contained"
              onClick={handleReject}
              disabled={submitting || !rejectReason.trim()}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
                backgroundColor: '#D97706',
                '&:hover': { backgroundColor: '#B45309' },
              }}
            >
              {submitting ? 'Sending…' : 'Send back to employee'}
            </MuiButton>
          </>
        ) : (
          <>
            <MuiButton
              onClick={() => setMode('reject')}
              disabled={submitting}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                color: '#D97706',
                '&:hover': { backgroundColor: 'rgba(217,119,6,0.08)' },
              }}
            >
              Send back for changes
            </MuiButton>
            <MuiButton
              color="success"
              variant="contained"
              onClick={handleApproveClick}
              disabled={submitting || !empCode.trim() || !department.trim()}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
            >
              {hasEdits && editMode ? 'Review changes →' : (submitting ? 'Approving…' : 'Approve')}
            </MuiButton>
          </>
        )}
      </DialogActions>
    </>
  );

  // ── Render: shell ──────────────────────────────────────────────

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
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ fontSize: 18, fontWeight: 700 }}>
              {stage === 'confirm' ? 'Confirm changes' : 'Review Registration'}
            </Box>
            <Box sx={{ fontSize: 13, fontWeight: 400, opacity: 0.65, mt: 0.25 }}>
              {reg?.full_name || ''}
              {reg?.email && <> · {reg.email}</>}
            </Box>
            {stage === 'review' && reg?.hr_original_values && !editMode && (
              <Box sx={{ fontSize: 12, fontWeight: 400, opacity: 0.55, mt: 0.5 }}>
                Yellow-tinted fields were changed by the employee from what HR originally entered.
              </Box>
            )}
          </Box>
          {stage === 'review' && mode === 'review' && reg && (
            editMode ? (
              <MuiButton
                size="small"
                color="inherit"
                onClick={cancelEditMode}
                disabled={submitting}
                sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
              >
                Cancel edit
              </MuiButton>
            ) : (
              <MuiButton
                size="small"
                variant="outlined"
                onClick={enterEditMode}
                disabled={submitting}
                sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
              >
                Edit fields
              </MuiButton>
            )
          )}
        </DialogTitle>

        {stage === 'confirm' ? renderConfirmStage() : renderReviewStage()}
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

      <FilePreviewModal
        visible={previewOpen && !!docAttachment}
        attachment={docAttachment}
        onClose={() => setPreviewOpen(false)}
      />
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
