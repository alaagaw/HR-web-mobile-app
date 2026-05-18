import { AccessGate } from '@/components/access/access-gate';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useViewState } from '@/hooks/use-view-state';
import { useColorScheme } from 'nativewind';
import { ScreenHeader } from '@/components/layout/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { documentService, userService, renewalTaskService } from '@/services';
import type { EmployeeDocument, Profile, RenewalTask } from '@/types/models';
import { Role, RenewalTaskStatus } from '@/types/enums';

const isWeb = Platform.OS === 'web';
const WIDE_SCREEN_BREAKPOINT = 1280; // px — below this, use mobile layout on web

function useWindowWidth() {
  const [width, setWidth] = useState(() => (isWeb ? window.innerWidth : 0));
  useEffect(() => {
    if (!isWeb) return;
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

// Lazy-load MUI components only on web
let DataGrid: any;
let MuiThemeProvider: any;
let Chip: any;
let Dialog: any;
let DialogTitle: any;
let DialogContent: any;
let DialogActions: any;
let MuiButton: any;
let Autocomplete: any;
let TextField: any;
let Snackbar: any;
let Alert: any;

if (isWeb) {
  const dg = require('@mui/x-data-grid');
  DataGrid = dg.DataGrid;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
  Chip = require('@mui/material/Chip').default;
  Dialog = require('@mui/material/Dialog').default;
  DialogTitle = require('@mui/material/DialogTitle').default;
  DialogContent = require('@mui/material/DialogContent').default;
  DialogActions = require('@mui/material/DialogActions').default;
  MuiButton = require('@mui/material/Button').default;
  Autocomplete = require('@mui/material/Autocomplete').default;
  TextField = require('@mui/material/TextField').default;
  Snackbar = require('@mui/material/Snackbar').default;
  Alert = require('@mui/material/Alert').default;
}

// ============================================================
// CONFIGURABLE DOCUMENT TYPES
// Add a new entry here + a DB column to track a new document type
// ============================================================

const DOCUMENT_TYPES = [
  { key: 'passport', label: 'Passport', expiryField: 'passport_expiry' as const, numberField: 'passport_number' as const },
  { key: 'iqama', label: 'Iqama', expiryField: 'iqama_expiry' as const, numberField: 'iqama_number' as const },
  { key: 'insurance', label: 'Insurance', expiryField: 'insurance_expiry' as const, numberField: 'insurance_number' as const },
];

// ============================================================
// RISK ENRICHMENT LOGIC
// ============================================================

type Risk = 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'OK' | 'MISSING';

interface EnrichedRow extends EmployeeDocument {
  risk: Risk;
  riskRank: number;
  nextExpiryDays: number | null;
  nextExpiryType: string;
  expiringSoonTypes: string[];
  expiredTypes: string[];
  passportDaysRemaining: number | null;
  iqamaDaysRemaining: number | null;
  insuranceDaysRemaining: number | null;
  // Renewal task tracking (most recent active or last task per document)
  activeTask: RenewalTask | null;
}

function daysRemaining(expiry?: string | null): number | null {
  if (!expiry) return null;
  const d = new Date(expiry);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - today.getTime()) / 86400000);
}

function enrichRows(rows: EmployeeDocument[], thresholdDays: number, tasks: RenewalTask[]): EnrichedRow[] {
  // Build a map: document_id → most relevant task (active first, then most recent)
  const taskByDoc = new Map<string, RenewalTask>();
  // Sort so active tasks (pending/in_progress) come last and overwrite
  const sorted = [...tasks].sort((a, b) => {
    const aActive = a.status === RenewalTaskStatus.Pending || a.status === RenewalTaskStatus.InProgress;
    const bActive = b.status === RenewalTaskStatus.Pending || b.status === RenewalTaskStatus.InProgress;
    if (aActive && !bActive) return 1; // a comes last → overwrites
    if (!aActive && bActive) return -1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  for (const t of sorted) {
    taskByDoc.set(t.document_id, t);
  }

  return rows.map((row) => {
    const docs = DOCUMENT_TYPES.map((doc) => ({
      ...doc,
      days: daysRemaining((row as any)[doc.expiryField]),
    }));

    const valid = docs.filter((d) => d.days !== null) as Array<(typeof docs)[number] & { days: number }>;
    const expired = valid.filter((d) => d.days < 0);
    const soon = valid.filter((d) => d.days >= 0 && d.days <= thresholdDays);
    const critical = valid.filter((d) => d.days >= 0 && d.days <= 7);

    let risk: Risk = 'OK';
    if (expired.length) risk = 'EXPIRED';
    else if (critical.length) risk = 'CRITICAL';
    else if (soon.length) risk = 'WARNING';
    else if (!valid.length) risk = 'MISSING';

    const riskRank = { EXPIRED: 0, CRITICAL: 1, WARNING: 2, MISSING: 3, OK: 4 }[risk];

    const next = valid.length ? valid.reduce((a, b) => (a.days <= b.days ? a : b)) : null;

    return {
      ...row,
      risk,
      riskRank,
      nextExpiryDays: next?.days ?? null,
      nextExpiryType: next?.label ?? '',
      expiringSoonTypes: soon.map((d) => d.label),
      expiredTypes: expired.map((d) => d.label),
      passportDaysRemaining: docs.find((d) => d.key === 'passport')?.days ?? null,
      iqamaDaysRemaining: docs.find((d) => d.key === 'iqama')?.days ?? null,
      insuranceDaysRemaining: docs.find((d) => d.key === 'insurance')?.days ?? null,
      activeTask: taskByDoc.get(row.id) ?? null,
    };
  });
}

// ============================================================
// RISK CHIP COLORS
// ============================================================

const RISK_CHIP: Record<Risk, { color: 'error' | 'warning' | 'success' | 'default' | 'info'; label: string }> = {
  EXPIRED: { color: 'error', label: 'Expired' },
  CRITICAL: { color: 'error', label: 'Critical' },
  WARNING: { color: 'warning', label: 'Warning' },
  OK: { color: 'success', label: 'OK' },
  MISSING: { color: 'default', label: 'Missing' },
};

// ============================================================
// THRESHOLD OPTIONS
// ============================================================

const THRESHOLD_OPTIONS = [7, 14, 30, 60, 90];

// ============================================================
// QUICK FILTER TYPE
// ============================================================

type QuickFilter = 'all' | 'expired' | 'critical' | 'warning' | 'missing' | 'assigned';

// ============================================================
// EXCEL IMPORT — parse uploaded file
// ============================================================

async function parseExcelFile(file: File): Promise<Array<Record<string, any>>> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { raw: false });
}

// Map Excel column headers to our fields (case-insensitive fuzzy match)
const COLUMN_MAP: Array<{ patterns: string[]; field: string }> = [
  { patterns: ['emp code', 'employee code', 'emp_code', 'empcode', 'code'], field: 'emp_code' },
  { patterns: ['name', 'full name', 'employee name', 'full_name'], field: 'name' },
  { patterns: ['passport', 'passport no', 'passport number', 'passport_number'], field: 'passport_number' },
  { patterns: ['passport expiry', 'passport exp', 'passport_expiry', 'passport expiration'], field: 'passport_expiry' },
  { patterns: ['iqama', 'iqama no', 'iqama number', 'iqama_number'], field: 'iqama_number' },
  { patterns: ['iqama expiry', 'iqama exp', 'iqama_expiry', 'iqama expiration'], field: 'iqama_expiry' },
  { patterns: ['insurance', 'insurance no', 'insurance number', 'insurance_number'], field: 'insurance_number' },
  { patterns: ['insurance expiry', 'insurance exp', 'insurance_expiry', 'insurance expiration'], field: 'insurance_expiry' },
  { patterns: ['occupation', 'job title', 'position'], field: 'occupation' },
  { patterns: ['birth date', 'dob', 'date of birth', 'birth_date', 'birthday'], field: 'birth_date' },
];

function mapColumns(raw: Record<string, any>[]): Array<Record<string, any>> {
  if (!raw.length) return [];

  const headers = Object.keys(raw[0]);
  const mapping: Record<string, string> = {};

  for (const col of COLUMN_MAP) {
    for (const header of headers) {
      const normalized = header.toLowerCase().trim();
      if (col.patterns.some((p) => normalized === p || normalized.includes(p))) {
        mapping[header] = col.field;
        break;
      }
    }
  }

  return raw.map((row) => {
    const mapped: Record<string, any> = {};
    for (const [excelHeader, ourField] of Object.entries(mapping)) {
      let value = row[excelHeader];
      // Normalize date values
      if (ourField.includes('expiry') || ourField === 'birth_date') {
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        } else if (typeof value === 'string' && value) {
          // Try to parse various date formats
          const d = new Date(value);
          if (!Number.isNaN(d.getTime())) {
            value = d.toISOString().split('T')[0];
          }
        }
      }
      // Convert numbers to strings for document numbers
      if (typeof value === 'number') {
        value = String(value);
      }
      mapped[ourField] = value || null;
    }
    return mapped;
  });
}

// ============================================================
// EXCEL EXPORT — download current data in import-compatible format
// ============================================================

async function exportToExcel(rows: EnrichedRow[]) {
  const XLSX = await import('xlsx');
  const exportData = rows.map((row) => ({
    'Emp Code': row.emp_code || '',
    'Name': row.employee?.full_name || '',
    'Dept': row.employee?.department || '',
    'Occupation': row.occupation || '',
    'Passport Number': row.passport_number || '',
    'Passport Expiry': row.passport_expiry || '',
    'Iqama Number': row.iqama_number || '',
    'Iqama Expiry': row.iqama_expiry || '',
    'Insurance Number': row.insurance_number || '',
    'Insurance Expiry': row.insurance_expiry || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Documents');

  // Auto-size columns
  const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...exportData.map((r) => String((r as any)[key] || '').length)) + 2,
  }));
  worksheet['!cols'] = colWidths;

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `document_expiry_${today}.xlsx`);
}

// ============================================================
// WEB: STATS STRIP
// ============================================================

function StatsStrip({
  data,
  isDark,
  activeFilter,
  onFilter,
}: {
  data: EnrichedRow[];
  isDark: boolean;
  activeFilter: QuickFilter;
  onFilter: (f: QuickFilter) => void;
}) {
  const counts = useMemo(() => {
    const expired = data.filter((r) => r.risk === 'EXPIRED').length;
    const critical = data.filter((r) => r.risk === 'CRITICAL').length;
    const warning = data.filter((r) => r.risk === 'WARNING').length;
    const missing = data.filter((r) => r.risk === 'MISSING').length;
    const assigned = data.filter((r) => r.activeTask && (r.activeTask.status === RenewalTaskStatus.Pending || r.activeTask.status === RenewalTaskStatus.InProgress)).length;
    return { expired, critical, warning, missing, assigned, total: data.length };
  }, [data]);

  const cards: Array<{ key: QuickFilter; label: string; count: number; color: string; bgColor: string }> = [
    { key: 'expired', label: 'Expired', count: counts.expired, color: '#EF4444', bgColor: 'rgba(239,68,68,0.1)' },
    { key: 'critical', label: 'Critical (≤7d)', count: counts.critical, color: '#F97316', bgColor: 'rgba(249,115,22,0.1)' },
    { key: 'warning', label: 'Warning (≤30d)', count: counts.warning, color: '#F59E0B', bgColor: 'rgba(245,158,11,0.1)' },
    { key: 'missing', label: 'Missing Dates', count: counts.missing, color: '#6B7280', bgColor: 'rgba(107,114,128,0.1)' },
    { key: 'assigned', label: 'Assigned', count: counts.assigned, color: '#8B5CF6', bgColor: 'rgba(139,92,246,0.1)' },
  ];

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto', flexShrink: 0 }}>
      {cards.map((card) => {
        const isActive = activeFilter === card.key;
        return (
          <div
            key={card.key}
            onClick={() => onFilter(isActive ? 'all' : card.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 10,
              border: `1.5px solid ${isActive ? card.color : isDark ? '#334155' : '#E2E8F0'}`,
              backgroundColor: isActive ? card.bgColor : isDark ? '#1E293B' : '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textAlign: 'center',
              minWidth: 80,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, color: card.color, lineHeight: 1.2 }}>{card.count}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B', marginTop: 1, whiteSpace: 'nowrap' }}>
              {card.label}
            </div>
          </div>
        );
      })}
      <div
        style={{
          padding: '6px 14px',
          borderRadius: 10,
          border: `1.5px solid ${activeFilter === 'all' ? '#2563EB' : isDark ? '#334155' : '#E2E8F0'}`,
          backgroundColor: activeFilter === 'all' ? 'rgba(37,99,235,0.08)' : isDark ? '#1E293B' : '#FFFFFF',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          textAlign: 'center',
          minWidth: 80,
        }}
        onClick={() => onFilter('all')}
      >
        <div style={{ fontSize: 20, fontWeight: 800, color: '#2563EB', lineHeight: 1.2 }}>{counts.total}</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B', marginTop: 1, whiteSpace: 'nowrap' }}>
          Total
        </div>
      </div>
    </div>
  );
}

// ============================================================
// WEB: ASSIGN DIALOG
// ============================================================

function AssignDialog({
  open,
  selectedRows,
  thresholdDays,
  isDark,
  onClose,
  onAssigned,
}: {
  open: boolean;
  selectedRows: EnrichedRow[];
  thresholdDays: number;
  isDark: boolean;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { user } = useAuth();
  const [hrEmployees, setHrEmployees] = useState<Profile[]>([]);
  const [selectedHR, setSelectedHR] = useState<Profile | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load HR employees when dialog opens
  useMemo(() => {
    if (!open) return;
    userService
      .getEmployees({ is_active: true })
      .then((emps) => {
        const hrOnly = emps.filter((e) => e.role === Role.HR || e.role === Role.HRDirector);
        setHrEmployees(hrOnly);
      })
      .catch(() => {});
  }, [open]);

  // Build list of tasks to create
  const tasksToCreate = useMemo(() => {
    const tasks: Array<{ row: EnrichedRow; docType: string; expiryDate: string }> = [];
    for (const row of selectedRows) {
      for (const doc of DOCUMENT_TYPES) {
        const days = daysRemaining((row as any)[doc.expiryField]);
        if (days !== null && days <= thresholdDays) {
          tasks.push({
            row,
            docType: doc.label,
            expiryDate: (row as any)[doc.expiryField],
          });
        }
      }
      // If no expiring docs found, still create one task for the nearest expiry
      if (!tasks.some((t) => t.row.id === row.id) && row.nextExpiryType) {
        const doc = DOCUMENT_TYPES.find((d) => d.label === row.nextExpiryType);
        if (doc) {
          tasks.push({
            row,
            docType: doc.label,
            expiryDate: (row as any)[doc.expiryField],
          });
        }
      }
    }
    return tasks;
  }, [selectedRows, thresholdDays]);

  const handleAssign = async () => {
    if (!selectedHR || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      const inputs = tasksToCreate.map((t) => ({
        employeeId: t.row.employee_id,
        documentId: t.row.id,
        documentType: t.docType.toLowerCase(),
        expiryDate: t.expiryDate,
        assignedToId: selectedHR.id,
        assignedById: user.id,
        notes: notes || undefined,
      }));
      await renewalTaskService.createBulkTasks(inputs);
      onAssigned();
      onClose();
      setSelectedHR(null);
      setNotes('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!Dialog) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        Assign Renewal Tasks
        <div style={{ fontSize: 14, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>
          {tasksToCreate.length} task{tasksToCreate.length !== 1 ? 's' : ''} for {selectedRows.length} employee{selectedRows.length !== 1 ? 's' : ''}
        </div>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Task preview */}
        <div
          style={{
            maxHeight: 180,
            overflowY: 'auto',
            borderRadius: 8,
            border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
            padding: 12,
            fontSize: 13,
          }}
        >
          {tasksToCreate.map((t, i) => (
            <div key={i} style={{ padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>{t.row.employee?.full_name || t.row.emp_code}</span>
              <span style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                {t.docType} — expires {t.expiryDate}
              </span>
            </div>
          ))}
        </div>

        {/* HR employee selector */}
        <Autocomplete
          options={hrEmployees}
          getOptionLabel={(opt: Profile) => `${opt.full_name} (${opt.role === Role.HRDirector ? 'HR Director' : 'HR'})`}
          value={selectedHR}
          onChange={(_: any, val: Profile | null) => setSelectedHR(val)}
          renderInput={(params: any) => (
            <TextField {...params} label="Assign to HR employee" placeholder="Search..." size="small" />
          )}
          sx={{ mt: 1 }}
        />

        {/* Notes */}
        <TextField
          label="Notes (optional)"
          multiline
          rows={2}
          value={notes}
          onChange={(e: any) => setNotes(e.target.value)}
          size="small"
        />

        {error && (
          <div style={{ color: '#EF4444', fontSize: 13 }}>{error}</div>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton onClick={onClose} disabled={submitting}>Cancel</MuiButton>
        <MuiButton
          variant="contained"
          onClick={handleAssign}
          disabled={!selectedHR || submitting || tasksToCreate.length === 0}
        >
          {submitting ? 'Assigning...' : `Assign ${tasksToCreate.length} Task${tasksToCreate.length !== 1 ? 's' : ''}`}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// WEB: EXCEL IMPORT DIALOG
// ============================================================

function ImportDialog({
  open,
  isDark,
  onClose,
  onImported,
}: {
  open: boolean;
  isDark: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, any>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setParseError(null);
    try {
      const raw = await parseExcelFile(f);
      const mapped = mapColumns(raw);
      setPreview(mapped);
    } catch (err: any) {
      setParseError(err.message);
      setPreview([]);
    }
  };

  const handleImport = async () => {
    if (!preview.length) return;
    setImporting(true);
    try {
      const rows = preview.map((r) => ({
        emp_code: r.emp_code || '',
        passport_number: r.passport_number || null,
        passport_expiry: r.passport_expiry || null,
        iqama_number: r.iqama_number || null,
        iqama_expiry: r.iqama_expiry || null,
        insurance_number: r.insurance_number || null,
        insurance_expiry: r.insurance_expiry || null,
        occupation: r.occupation || null,
        birth_date: r.birth_date || null,
      }));
      const res = await documentService.bulkUpsert(rows);
      setResult(res);
      if (res.success > 0) {
        onImported();
      }
    } catch (err: any) {
      setResult({ success: 0, errors: [err.message] });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    setParseError(null);
    onClose();
  };

  if (!Dialog) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Import from Excel
        <div style={{ fontSize: 14, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>
          Upload an Excel or CSV file with employee document data
        </div>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          style={{
            padding: 12,
            border: `2px dashed ${isDark ? '#334155' : '#CBD5E1'}`,
            borderRadius: 8,
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            cursor: 'pointer',
          }}
        />

        {parseError && (
          <div style={{ color: '#EF4444', fontSize: 13 }}>Parse error: {parseError}</div>
        )}

        {preview.length > 0 && !result && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B' }}>
              Preview: {preview.length} rows found
            </div>
            <div
              style={{
                maxHeight: 300,
                overflowY: 'auto',
                borderRadius: 8,
                border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                fontSize: 12,
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Emp Code', 'Passport #', 'Passport Exp', 'Iqama #', 'Iqama Exp', 'Insurance #', 'Insurance Exp', 'Occupation'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '8px 10px',
                          textAlign: 'left',
                          borderBottom: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                          fontWeight: 700,
                          position: 'sticky',
                          top: 0,
                          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${isDark ? '#1E293B' : '#F1F5F9'}` }}>
                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>{row.emp_code || '—'}</td>
                      <td style={{ padding: '6px 10px' }}>{row.passport_number || '—'}</td>
                      <td style={{ padding: '6px 10px' }}>{row.passport_expiry || '—'}</td>
                      <td style={{ padding: '6px 10px' }}>{row.iqama_number || '—'}</td>
                      <td style={{ padding: '6px 10px' }}>{row.iqama_expiry || '—'}</td>
                      <td style={{ padding: '6px 10px' }}>{row.insurance_number || '—'}</td>
                      <td style={{ padding: '6px 10px' }}>{row.insurance_expiry || '—'}</td>
                      <td style={{ padding: '6px 10px' }}>{row.occupation || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 20 && (
                <div style={{ padding: 8, textAlign: 'center', color: isDark ? '#64748B' : '#94A3B8' }}>
                  ...and {preview.length - 20} more rows
                </div>
              )}
            </div>
          </>
        )}

        {result && (
          <div style={{ padding: 16, borderRadius: 8, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: result.success > 0 ? '#16A34A' : '#EF4444' }}>
              {result.success > 0 ? `Successfully imported ${result.success} records` : 'Import failed'}
            </div>
            {result.errors.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', marginBottom: 4 }}>
                  {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}:
                </div>
                {result.errors.slice(0, 10).map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B' }}>
                    {e}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MuiButton onClick={handleClose}>{result ? 'Close' : 'Cancel'}</MuiButton>
        {!result && (
          <MuiButton
            variant="contained"
            onClick={handleImport}
            disabled={importing || preview.length === 0}
          >
            {importing ? 'Importing...' : `Import ${preview.length} Row${preview.length !== 1 ? 's' : ''}`}
          </MuiButton>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// WEB: RENEWAL PROGRESS CELL (Assigner → Assigned To → Done)
// ============================================================

type ProgressStepState = 'done' | 'active' | 'upcoming';

const PROGRESS_CIRCLE: Record<ProgressStepState, React.CSSProperties> = {
  done: { backgroundColor: '#16A34A', color: '#FFFFFF', border: '2px solid #16A34A' },
  active: { backgroundColor: '#F59E0B', color: '#FFFFFF', border: '2px solid #F59E0B' },
  upcoming: { backgroundColor: 'transparent', color: '#94A3B8', border: '2px dashed #94A3B8' },
};

const PROGRESS_LABEL_COLOR: Record<ProgressStepState, string> = {
  done: '#16A34A',
  active: '#F59E0B',
  upcoming: '#94A3B8',
};

function getProgressLineStyle(left: ProgressStepState, right: ProgressStepState): React.CSSProperties {
  if (left === 'done' && right === 'done') return { borderTop: '2px solid #16A34A' };
  if (left === 'done' && right === 'active') return { borderTop: '2px solid #F59E0B' };
  return { borderTop: '2px dashed #CBD5E1' };
}

function RenewalProgressCell({ task }: { task: RenewalTask | null }) {
  if (!task) return <span style={{ color: '#6B7280' }}>—</span>;

  const isCancelled = task.status === RenewalTaskStatus.Cancelled;
  const isCompleted = task.status === RenewalTaskStatus.Completed;

  // Assigner step: always done (they created the task)
  const assignerState: ProgressStepState = 'done';
  const assignerLabel = task.assigned_by?.full_name?.split(' ')[0] || 'Assigner';

  // Assigned To step: done if completed/cancelled, active if pending/in_progress
  const assignedToState: ProgressStepState = isCompleted || isCancelled ? 'done' : 'active';
  const assignedToLabel = task.assigned_to?.full_name?.split(' ')[0] || 'HR';

  // Completed step
  let completedState: ProgressStepState = 'upcoming';
  let completedLabel = 'Done';
  if (isCompleted) {
    completedState = 'done';
  } else if (isCancelled) {
    completedState = 'done';
    completedLabel = 'Cancelled';
  }

  const steps: Array<{ label: string; short: string; state: ProgressStepState }> = [
    { label: assignerLabel, short: assignerLabel.charAt(0), state: assignerState },
    { label: assignedToLabel, short: assignedToLabel.charAt(0), state: assignedToState },
    { label: completedLabel, short: isCompleted ? '✓' : isCancelled ? '✗' : '✓', state: completedState },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', width: '100%', padding: '6px 0' }}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const circleStyle = isCancelled && i === steps.length - 1
          ? { backgroundColor: '#EF4444', color: '#FFFFFF', border: '2px solid #EF4444' }
          : PROGRESS_CIRCLE[step.state];
        const labelColor = isCancelled && i === steps.length - 1 ? '#EF4444' : PROGRESS_LABEL_COLOR[step.state];

        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 34 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: step.short.length > 2 ? 9 : 11,
                  fontWeight: 700,
                  letterSpacing: '-0.3px',
                  flexShrink: 0,
                  ...circleStyle,
                }}
              >
                {step.short}
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, marginTop: 3, color: labelColor, whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                style={{
                  width: 18,
                  marginTop: 14,
                  marginLeft: -1,
                  marginRight: -1,
                  flexShrink: 0,
                  ...getProgressLineStyle(step.state, steps[i + 1].state),
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============================================================
// WEB: DATA GRID TABLE
// ============================================================

const DEFAULT_HIDDEN_COLUMNS: Record<string, boolean> = {
  department: false,
  occupation: false,
  passport_number: false,
  iqama_number: false,
  insurance_number: false,
  assigned_on: false,
  unassigned_on: false,
};

const ALL_VISIBLE_COLUMNS: Record<string, boolean> = {
  department: true,
  occupation: true,
  passport_number: true,
  iqama_number: true,
  insurance_number: true,
  assigned_on: true,
  unassigned_on: true,
};

function WebExpiryTable({
  data,
  isDark,
  selectedIds,
  onSelectionChange,
  globalSearch,
  showAllColumns,
  onUnassign,
}: {
  data: EnrichedRow[];
  isDark: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  globalSearch: string;
  showAllColumns: boolean;
  onUnassign: (taskId: string) => void;
}) {
  const [columnVisibilityModel, setColumnVisibilityModel] = useViewState<Record<string, boolean>>(
    'admin/document-expiry.columnVisibility',
    DEFAULT_HIDDEN_COLUMNS
  );
  const [unassignTarget, setUnassignTarget] = useState<{ taskId: string; assigneeName: string } | null>(null);

  // Sync with parent's showAllColumns toggle
  const effectiveVisibility = showAllColumns ? ALL_VISIBLE_COLUMNS : columnVisibilityModel;

  const [filters, setFilters] = useViewState('admin/document-expiry.columnFilters', {
    risk: '',
    empCode: '',
    name: '',
    department: '',
    occupation: '',
    passportNumber: '',
    passportExpiry: '',
    iqamaNumber: '',
    iqamaExpiry: '',
    insuranceNumber: '',
    insuranceExpiry: '',
    daysLeft: '',
    expiring: '',
    assignedTo: '',
    assignedBy: '',
    taskStatus: '',
  });

  const [paginationModel, setPaginationModel] = useViewState(
    'admin/document-expiry.pagination',
    { page: 0, pageSize: 25 }
  );
  const [sortModel, setSortModel] = useViewState<any[]>(
    'admin/document-expiry.sort',
    [{ field: 'nextExpiryDays', sort: 'asc' as const }]
  );

  // Pre-sort by riskRank ASC then nextExpiryDays ASC (MUI community only supports single-column sort)
  const sortedData = useMemo(
    () =>
      [...data].sort((a, b) => {
        if (a.riskRank !== b.riskRank) return a.riskRank - b.riskRank;
        return (a.nextExpiryDays ?? 9999) - (b.nextExpiryDays ?? 9999);
      }),
    [data]
  );

  // Memoized so the DataGrid `rows` reference stays stable across the
  // re-render a pagination/sort click triggers — otherwise MUI's
  // "rows changed → reset to page 0" fires and paging never sticks.
  const filteredData = useMemo(() => sortedData.filter((row) => {
    const empCode = (row.emp_code || '').toLowerCase();
    const name = (row.employee?.full_name || '').toLowerCase();
    const dept = (row.employee?.department || '').toLowerCase();
    const occ = (row.occupation || '').toLowerCase();
    const ppNo = (row.passport_number || '').toLowerCase();
    const ppExp = (row.passport_expiry || '').toLowerCase();
    const iqNo = (row.iqama_number || '').toLowerCase();
    const iqExp = (row.iqama_expiry || '').toLowerCase();
    const insNo = (row.insurance_number || '').toLowerCase();
    const insExp = (row.insurance_expiry || '').toLowerCase();

    // Global search — searches ALL fields including hidden columns
    if (globalSearch) {
      const q = globalSearch.toLowerCase();
      const haystack = [
        empCode, name, dept, occ,
        ppNo, ppExp, iqNo, iqExp, insNo, insExp,
        row.risk.toLowerCase(),
        row.nextExpiryDays !== null ? String(row.nextExpiryDays) : '',
        [...row.expiredTypes, ...row.expiringSoonTypes].join(' ').toLowerCase(),
        (row.activeTask?.assigned_to?.full_name || '').toLowerCase(),
        (row.activeTask?.assigned_by?.full_name || '').toLowerCase(),
        (row.activeTask?.status || '').toLowerCase(),
        (row.activeTask?.task_number || '').toLowerCase(),
      ].join(' ');
      if (!haystack.includes(q)) return false;
    }

    if (filters.risk && !row.risk.toLowerCase().includes(filters.risk.toLowerCase())) return false;
    if (filters.empCode && !empCode.includes(filters.empCode.toLowerCase())) return false;
    if (filters.name && !name.includes(filters.name.toLowerCase())) return false;
    if (filters.department && !dept.includes(filters.department.toLowerCase())) return false;
    if (filters.occupation && !occ.includes(filters.occupation.toLowerCase())) return false;
    if (filters.passportNumber && !ppNo.includes(filters.passportNumber.toLowerCase())) return false;
    if (filters.passportExpiry && !ppExp.includes(filters.passportExpiry.toLowerCase())) return false;
    if (filters.iqamaNumber && !iqNo.includes(filters.iqamaNumber.toLowerCase())) return false;
    if (filters.iqamaExpiry && !iqExp.includes(filters.iqamaExpiry.toLowerCase())) return false;
    if (filters.insuranceNumber && !insNo.includes(filters.insuranceNumber.toLowerCase())) return false;
    if (filters.insuranceExpiry && !insExp.includes(filters.insuranceExpiry.toLowerCase())) return false;
    if (filters.daysLeft) {
      const daysStr = row.nextExpiryDays !== null ? String(row.nextExpiryDays) : '';
      if (!daysStr.includes(filters.daysLeft)) return false;
    }
    if (filters.expiring) {
      const allDocs = [...row.expiredTypes, ...row.expiringSoonTypes].join(' ').toLowerCase();
      if (!allDocs.includes(filters.expiring.toLowerCase())) return false;
    }
    if (filters.assignedTo) {
      const assignee = (row.activeTask?.assigned_to?.full_name || '').toLowerCase();
      if (!assignee.includes(filters.assignedTo.toLowerCase())) return false;
    }
    if (filters.assignedBy) {
      const assigner = (row.activeTask?.assigned_by?.full_name || '').toLowerCase();
      if (!assigner.includes(filters.assignedBy.toLowerCase())) return false;
    }
    if (filters.taskStatus) {
      const status = (row.activeTask?.status || '').toLowerCase();
      if (!status.includes(filters.taskStatus.toLowerCase())) return false;
    }
    return true;
  }), [sortedData, globalSearch, filters]);

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
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const }}>{label}</span>
      <input
        placeholder="Filter..."
        value={filters[filterKey]}
        onChange={(e) => setFilters((f) => ({ ...f, [filterKey]: e.target.value }))}
        onClick={(e) => e.stopPropagation()}
        style={inputStyle}
      />
    </div>
  );

  const formatExpiry = (date: string | null, days: number | null) => {
    if (!date) return '—';
    const d = new Date(date);
    const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (days !== null && days <= 30) {
      return `${formatted} (${days}d)`;
    }
    return formatted;
  };

  const columns = [
    {
      field: 'risk',
      headerName: 'Risk',
      width: 100,
      sortable: false,
      renderHeader: renderHeader('Risk', 'risk'),
      renderCell: (params: any) => {
        const r = params.row as EnrichedRow;
        const chip = RISK_CHIP[r.risk];
        return (
          <Chip
            label={chip.label}
            size="small"
            color={chip.color}
            variant="filled"
            sx={{ fontWeight: 700, fontSize: 11, minWidth: 70 }}
          />
        );
      },
    },
    {
      field: 'emp_code',
      headerName: 'Emp Code',
      flex: 0.7,
      minWidth: 100,
      renderHeader: renderHeader('Emp Code', 'empCode'),
    },
    {
      field: 'employee_name',
      headerName: 'Name',
      flex: 1.2,
      minWidth: 150,
      renderHeader: renderHeader('Name', 'name'),
      valueGetter: (_value: any, row: EnrichedRow) => row.employee?.full_name || '—',
      renderCell: (params: any) => {
        const row = params.row as EnrichedRow;
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
              {row.employee?.full_name || '—'}
            </div>
          </div>
        );
      },
    },
    {
      field: 'department',
      headerName: 'Dept',
      flex: 0.8,
      minWidth: 100,
      renderHeader: renderHeader('Dept', 'department'),
      valueGetter: (_value: any, row: EnrichedRow) => row.employee?.department || '—',
    },
    {
      field: 'occupation',
      headerName: 'Occupation',
      flex: 0.9,
      minWidth: 110,
      renderHeader: renderHeader('Occupation', 'occupation'),
      valueGetter: (_value: any, row: EnrichedRow) => row.occupation || '—',
    },
    {
      field: 'passport_number',
      headerName: 'Passport #',
      flex: 0.9,
      minWidth: 110,
      renderHeader: renderHeader('Passport #', 'passportNumber'),
      valueGetter: (_value: any, row: EnrichedRow) => row.passport_number || '—',
    },
    {
      field: 'passport_expiry',
      headerName: 'Passport Exp',
      flex: 1,
      minWidth: 140,
      renderHeader: renderHeader('Passport Exp', 'passportExpiry'),
      renderCell: (params: any) => {
        const row = params.row as EnrichedRow;
        const days = row.passportDaysRemaining;
        const isUrgent = days !== null && days <= 30;
        return (
          <span style={{ color: isUrgent ? '#EF4444' : undefined, fontWeight: isUrgent ? 700 : 400 }}>
            {formatExpiry(row.passport_expiry, days)}
          </span>
        );
      },
      valueGetter: (_value: any, row: EnrichedRow) => row.passport_expiry || '',
    },
    {
      field: 'iqama_number',
      headerName: 'Iqama #',
      flex: 0.9,
      minWidth: 110,
      renderHeader: renderHeader('Iqama #', 'iqamaNumber'),
      valueGetter: (_value: any, row: EnrichedRow) => row.iqama_number || '—',
    },
    {
      field: 'iqama_expiry',
      headerName: 'Iqama Exp',
      flex: 1,
      minWidth: 140,
      renderHeader: renderHeader('Iqama Exp', 'iqamaExpiry'),
      renderCell: (params: any) => {
        const row = params.row as EnrichedRow;
        const days = row.iqamaDaysRemaining;
        const isUrgent = days !== null && days <= 30;
        return (
          <span style={{ color: isUrgent ? '#EF4444' : undefined, fontWeight: isUrgent ? 700 : 400 }}>
            {formatExpiry(row.iqama_expiry, days)}
          </span>
        );
      },
      valueGetter: (_value: any, row: EnrichedRow) => row.iqama_expiry || '',
    },
    {
      field: 'insurance_number',
      headerName: 'Insurance #',
      flex: 0.9,
      minWidth: 110,
      renderHeader: renderHeader('Insurance #', 'insuranceNumber'),
      valueGetter: (_value: any, row: EnrichedRow) => row.insurance_number || '—',
    },
    {
      field: 'insurance_expiry',
      headerName: 'Insurance Exp',
      flex: 1,
      minWidth: 140,
      renderHeader: renderHeader('Insurance Exp', 'insuranceExpiry'),
      renderCell: (params: any) => {
        const row = params.row as EnrichedRow;
        const days = row.insuranceDaysRemaining;
        const isUrgent = days !== null && days <= 30;
        return (
          <span style={{ color: isUrgent ? '#EF4444' : undefined, fontWeight: isUrgent ? 700 : 400 }}>
            {formatExpiry(row.insurance_expiry, days)}
          </span>
        );
      },
      valueGetter: (_value: any, row: EnrichedRow) => row.insurance_expiry || '',
    },
    {
      field: 'nextExpiryDays',
      headerName: 'Days Left',
      width: 100,
      type: 'number' as const,
      renderHeader: renderHeader('Days Left', 'daysLeft'),
      renderCell: (params: any) => {
        const row = params.row as EnrichedRow;
        if (row.nextExpiryDays === null) return <span style={{ color: '#6B7280' }}>—</span>;
        const isNegative = row.nextExpiryDays < 0;
        const isUrgent = row.nextExpiryDays <= 30;
        return (
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: isNegative ? '#EF4444' : isUrgent ? '#F59E0B' : '#16A34A',
            }}
          >
            {row.nextExpiryDays}
          </span>
        );
      },
    },
    {
      field: 'expiringDocs',
      headerName: 'Expiring',
      flex: 1.2,
      minWidth: 160,
      sortable: false,
      renderHeader: renderHeader('Expiring', 'expiring'),
      renderCell: (params: any) => {
        const row = params.row as EnrichedRow;
        const allDocs = [...row.expiredTypes, ...row.expiringSoonTypes];
        if (!allDocs.length) return <span style={{ color: '#6B7280' }}>—</span>;
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {row.expiredTypes.map((d) => (
              <Chip key={`exp-${d}`} label={d} size="small" color="error" variant="outlined" sx={{ fontSize: 11, fontWeight: 600 }} />
            ))}
            {row.expiringSoonTypes.map((d) => (
              <Chip key={`warn-${d}`} label={d} size="small" color="warning" variant="outlined" sx={{ fontSize: 11, fontWeight: 600 }} />
            ))}
          </div>
        );
      },
    },
    {
      field: 'assigned_to',
      headerName: 'Assigned To',
      flex: 1,
      minWidth: 130,
      renderHeader: renderHeader('Assigned To', 'assignedTo'),
      valueGetter: (_value: any, row: EnrichedRow) => row.activeTask?.assigned_to?.full_name || '',
      renderCell: (params: any) => {
        const row = params.row as EnrichedRow;
        if (!row.activeTask) return <span style={{ color: '#6B7280' }}>—</span>;
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
              {row.activeTask.assigned_to?.full_name || '—'}
            </div>
          </div>
        );
      },
    },
    {
      field: 'assigned_by',
      headerName: 'Assigned By',
      flex: 1,
      minWidth: 130,
      renderHeader: renderHeader('Assigned By', 'assignedBy'),
      valueGetter: (_value: any, row: EnrichedRow) => row.activeTask?.assigned_by?.full_name || '',
      renderCell: (params: any) => {
        const row = params.row as EnrichedRow;
        if (!row.activeTask) return <span style={{ color: '#6B7280' }}>—</span>;
        return (
          <div style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
            {row.activeTask.assigned_by?.full_name || '—'}
          </div>
        );
      },
    },
    {
      field: 'assigned_on',
      headerName: 'Assigned On',
      flex: 1,
      minWidth: 160,
      valueGetter: (_value: any, row: EnrichedRow) => row.activeTask?.assigned_at || '',
      renderCell: (params: any) => {
        const row = params.row as EnrichedRow;
        if (!row.activeTask?.assigned_at) return <span style={{ color: '#6B7280' }}>—</span>;
        const d = new Date(row.activeTask.assigned_at);
        return (
          <span style={{ fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
            {d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
    },
    {
      field: 'unassigned_on',
      headerName: 'Unassigned On',
      flex: 1,
      minWidth: 160,
      valueGetter: (_value: any, row: EnrichedRow) => row.activeTask?.unassigned_at || '',
      renderCell: (params: any) => {
        const row = params.row as EnrichedRow;
        if (!row.activeTask?.unassigned_at) return <span style={{ color: '#6B7280' }}>—</span>;
        const d = new Date(row.activeTask.unassigned_at);
        return (
          <span style={{ fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
            {d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params: any) => {
        const row = params.row as EnrichedRow;
        const isActive = row.activeTask &&
          (row.activeTask.status === RenewalTaskStatus.Pending || row.activeTask.status === RenewalTaskStatus.InProgress);
        if (!isActive) return null;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setUnassignTarget({
                taskId: row.activeTask!.id,
                assigneeName: row.activeTask?.assigned_to?.full_name || 'HR',
              });
            }}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: `1px solid ${isDark ? '#7F1D1D' : '#FECACA'}`,
              backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
              color: '#EF4444',
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
          >
            Unassign
          </button>
        );
      },
    },
    {
      field: 'task_status',
      headerName: 'Task Status',
      flex: 0.8,
      minWidth: 110,
      renderHeader: renderHeader('Task Status', 'taskStatus'),
      valueGetter: (_value: any, row: EnrichedRow) => row.activeTask?.status || '',
      renderCell: (params: any) => {
        const row = params.row as EnrichedRow;
        if (!row.activeTask) return <span style={{ color: '#6B7280' }}>—</span>;
        const statusMap: Record<string, { color: 'warning' | 'info' | 'success' | 'error'; label: string }> = {
          [RenewalTaskStatus.Pending]: { color: 'warning', label: 'Pending' },
          [RenewalTaskStatus.InProgress]: { color: 'info', label: 'In Progress' },
          [RenewalTaskStatus.Completed]: { color: 'success', label: 'Completed' },
          [RenewalTaskStatus.Cancelled]: { color: 'error', label: 'Cancelled' },
        };
        const s = statusMap[row.activeTask.status] || { color: 'default' as any, label: row.activeTask.status };
        return <Chip label={s.label} size="small" color={s.color} variant="filled" sx={{ fontWeight: 700, fontSize: 11 }} />;
      },
    },
    {
      field: 'pending_since',
      headerName: 'Pending Since',
      flex: 1,
      minWidth: 130,
      valueGetter: (_value: any, row: EnrichedRow) => row.activeTask?.assigned_at || '',
      renderCell: (params: any) => {
        const row = params.row as EnrichedRow;
        if (!row.activeTask) return <span style={{ color: '#6B7280' }}>—</span>;
        const assignedDate = new Date(row.activeTask.assigned_at);
        const formatted = assignedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - assignedDate.getTime()) / 86400000);
        const isActive = row.activeTask.status === RenewalTaskStatus.Pending || row.activeTask.status === RenewalTaskStatus.InProgress;
        return (
          <div>
            <div style={{ fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>{formatted}</div>
            {isActive && (
              <div style={{ fontSize: 11, fontWeight: 600, color: diffDays > 7 ? '#EF4444' : '#F59E0B' }}>
                {diffDays}d ago
              </div>
            )}
          </div>
        );
      },
    },
    {
      field: 'progress',
      headerName: 'Progress',
      flex: 1.4,
      minWidth: 180,
      sortable: false,
      filterable: false,
      renderCell: (params: any) => <RenewalProgressCell task={(params.row as EnrichedRow).activeTask} />,
    },
  ];

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <DataGrid
        rows={filteredData}
        columns={columns}
        getRowId={(row: any) => row.id}
        checkboxSelection
        isRowSelectable={(params: any) => {
          const row = params.row as EnrichedRow;
          const task = row.activeTask;
          return !task || (task.status !== RenewalTaskStatus.Pending && task.status !== RenewalTaskStatus.InProgress);
        }}
        disableColumnFilter
        columnHeaderHeight={70}
        columnVisibilityModel={effectiveVisibility}
        onColumnVisibilityModelChange={(model: any) => setColumnVisibilityModel(model)}
        rowSelectionModel={{ type: 'include' as const, ids: new Set(selectedIds) }}
        onRowSelectionModelChange={(model: any) => onSelectionChange(Array.from(model.ids ?? []) as string[])}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        pageSizeOptions={[10, 25, 50, 100]}
        rowHeight={56}
        getRowClassName={(params: any) => `risk-${params.row.risk}`}
        sx={{
          borderRadius: 3,
          '& .MuiDataGrid-cell': { whiteSpace: 'normal', lineHeight: 1.4, display: 'flex', alignItems: 'center' },
          '& .MuiDataGrid-columnHeader': { alignItems: 'flex-start' },
          '& .MuiDataGrid-columnHeaderTitleContainer': { overflow: 'visible' },
          // Row risk styling
          '& .risk-EXPIRED': {
            color: isDark ? '#FCA5A5' : '#DC2626',
            borderLeft: '4px solid #EF4444',
            backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.04)',
          },
          '& .risk-CRITICAL': {
            borderLeft: '4px solid #EF4444',
            backgroundColor: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.03)',
          },
          '& .risk-WARNING': {
            borderLeft: '4px solid #F59E0B',
            backgroundColor: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.03)',
          },
          '& .risk-MISSING': {
            borderLeft: '4px solid #6B7280',
            backgroundColor: isDark ? 'rgba(107,114,128,0.05)' : 'rgba(107,114,128,0.03)',
          },
          '& .risk-OK': {
            borderLeft: '4px solid transparent',
          },
        }}
      />

      {/* Unassign confirmation dialog */}
      {Dialog && (
        <Dialog
          open={!!unassignTarget}
          onClose={() => setUnassignTarget(null)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Unassign Renewal Task</DialogTitle>
          <DialogContent>
            <div style={{ fontSize: 14, color: isDark ? '#CBD5E1' : '#475569' }}>
              Are you sure you want to unassign this renewal task from{' '}
              <strong>{unassignTarget?.assigneeName}</strong>?
              The task will be cancelled and you can reassign it to someone else.
            </div>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <MuiButton onClick={() => setUnassignTarget(null)}>Cancel</MuiButton>
            <MuiButton
              variant="contained"
              color="error"
              onClick={() => {
                if (unassignTarget) {
                  onUnassign(unassignTarget.taskId);
                  setUnassignTarget(null);
                }
              }}
            >
              Unassign
            </MuiButton>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function DocumentExpiryScreen() {
  return (
    <AccessGate resourceKey="page:admin/document-expiry">
      <DocumentExpiryScreenInner />
    </AccessGate>
  );
}

function DocumentExpiryScreenInner() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const windowWidth = useWindowWidth();
  const isWideScreen = isWeb && windowWidth >= WIDE_SCREEN_BREAKPOINT;

  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [renewalTasks, setRenewalTasks] = useState<RenewalTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [thresholdDays, setThresholdDays] = useViewState('admin/document-expiry.thresholdDays', 30);
  const [quickFilter, setQuickFilter] = useViewState<QuickFilter>('admin/document-expiry.quickFilter', 'all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useViewState('admin/document-expiry.globalSearch', '');
  const [showAllColumns, setShowAllColumns] = useViewState('admin/document-expiry.showAllColumns', false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, tasks] = await Promise.all([
        documentService.getAllDocuments(),
        renewalTaskService.getAllTasks(),
      ]);
      setDocuments(data);
      setRenewalTasks(tasks);
    } finally {
      setLoading(false);
    }
  };

  const { invalidate } = useAutoRefresh(() => { loadData(); }, []);

  // Enrich rows with risk calculation + renewal task data
  const enrichedData = useMemo(() => enrichRows(documents, thresholdDays, renewalTasks), [documents, thresholdDays, renewalTasks]);

  // Apply quick filter
  const filteredData = useMemo(() => {
    switch (quickFilter) {
      case 'expired': return enrichedData.filter((r) => r.risk === 'EXPIRED');
      case 'critical': return enrichedData.filter((r) => r.risk === 'CRITICAL');
      case 'warning': return enrichedData.filter((r) => r.risk === 'WARNING');
      case 'missing': return enrichedData.filter((r) => r.risk === 'MISSING');
      case 'assigned': return enrichedData.filter((r) => r.activeTask && (r.activeTask.status === RenewalTaskStatus.Pending || r.activeTask.status === RenewalTaskStatus.InProgress));
      default: return enrichedData;
    }
  }, [enrichedData, quickFilter]);

  const selectedRows = filteredData.filter((r) => selectedIds.includes(r.id));

  const handleUnassign = async (taskId: string) => {
    if (!user) return;
    try {
      await renewalTaskService.unassignTask(taskId, user.id);
      invalidate();
      setSnackbar({ open: true, message: 'Task unassigned successfully. You can now reassign.', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to unassign task', severity: 'error' });
    }
  };

  // ─── Web render (wide screens only) ────────────────────
  if (isWideScreen) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
        {/* Page header with inline stats */}
        <div
          style={{
            padding: '16px 24px',
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
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A' }}>
              Document Expiry Monitor
            </div>
            <div style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', marginTop: 1 }}>
              Track passport, iqama & insurance expiry across all employees
            </div>
          </div>
          {/* Stat cards inline */}
          <StatsStrip
            data={enrichedData}
            isDark={isDark}
            activeFilter={quickFilter}
            onFilter={setQuickFilter}
          />
        </div>

        {/* Controls + DataGrid */}
        <View style={{ flex: 1, paddingHorizontal: 24 }}>

          {/* Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            {/* Global search */}
            <div style={{ position: 'relative', minWidth: 220 }}>
              <input
                placeholder="Search all fields..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 14px 7px 34px',
                  fontSize: 13,
                  border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
                  borderRadius: 8,
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                  outline: 'none',
                }}
              />
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isDark ? '#64748B' : '#94A3B8'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>

            <div style={{ width: 1, height: 28, backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />

            {/* Threshold selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B' }}>
                Threshold:
              </span>
              <select
                value={thresholdDays}
                onChange={(e) => setThresholdDays(Number(e.target.value))}
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
                  borderRadius: 8,
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {THRESHOLD_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
            </div>

            <div style={{ width: 1, height: 28, backgroundColor: isDark ? '#334155' : '#E2E8F0' }} />

            {/* Upload button */}
            <button
              onClick={() => setImportOpen(true)}
              style={{
                padding: '7px 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                color: isDark ? '#CBD5E1' : '#334155',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              Upload Excel
            </button>

            {/* Export button */}
            <button
              onClick={() => exportToExcel(filteredData)}
              disabled={filteredData.length === 0}
              style={{
                padding: '7px 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                color: isDark ? '#CBD5E1' : '#334155',
                cursor: filteredData.length === 0 ? 'not-allowed' : 'pointer',
                opacity: filteredData.length === 0 ? 0.5 : 1,
                transition: 'all 0.12s ease',
              }}
            >
              Export Excel
            </button>

            {/* Assign button (only when rows selected) */}
            {selectedIds.length > 0 && (
              <button
                onClick={() => setAssignOpen(true)}
                style={{
                  padding: '7px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
              >
                Assign Selected ({selectedIds.length})
              </button>
            )}
          </div>

          {/* Column visibility hint + Show All Columns button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingBottom: 12,
              fontSize: 12,
              color: isDark ? '#64748B' : '#94A3B8',
            }}
          >
            <span>Tip: Right-click any column header to show or hide columns.</span>
            <button
              onClick={() => setShowAllColumns((prev) => !prev)}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
                backgroundColor: showAllColumns
                  ? (isDark ? '#1E3A5F' : '#DBEAFE')
                  : (isDark ? '#1E293B' : '#FFFFFF'),
                color: showAllColumns ? '#2563EB' : (isDark ? '#CBD5E1' : '#334155'),
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              {showAllColumns ? 'Hide Extra Columns' : 'Show All Columns'}
            </button>
          </div>

          {/* DataGrid */}
          {filteredData.length > 0 || loading ? (
            <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              <MuiThemeProvider isDark={isDark}>
                <WebExpiryTable
                  data={filteredData}
                  isDark={isDark}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  globalSearch={globalSearch}
                  showAllColumns={showAllColumns}
                  onUnassign={handleUnassign}
                />
              </MuiThemeProvider>
            </View>
          ) : (
            <EmptyState
              title="No documents found"
              description="Upload an Excel file to import employee document data."
            />
          )}
        </View>

        {/* Dialogs */}
        {isWeb && (
          <MuiThemeProvider isDark={isDark}>
            <AssignDialog
              open={assignOpen}
              selectedRows={selectedRows}
              thresholdDays={thresholdDays}
              isDark={isDark}
              onClose={() => { setAssignOpen(false); setSelectedIds([]); }}
              onAssigned={() => {
                setSnackbar({ open: true, message: 'Renewal tasks assigned successfully!', severity: 'success' });
                setSelectedIds([]);
                invalidate();
              }}
            />
            <ImportDialog
              open={importOpen}
              isDark={isDark}
              onClose={() => setImportOpen(false)}
              onImported={() => {
                invalidate();
                setSnackbar({ open: true, message: 'Excel data imported successfully!', severity: 'success' });
              }}
            />
            {Snackbar && (
              <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((s: any) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              >
                <Alert
                  onClose={() => setSnackbar((s: any) => ({ ...s, open: false }))}
                  severity={snackbar.severity}
                  variant="filled"
                >
                  {snackbar.message}
                </Alert>
              </Snackbar>
            )}
          </MuiThemeProvider>
        )}
      </View>
    );
  }

  // ─── Mobile render ──────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-[#0F172A]" edges={['top']}>
      <ScreenHeader title="Document Expiry" />

      {/* Mobile stats */}
      <View className="px-4 pt-3 pb-2">
        <View className="flex-row flex-wrap gap-2 mb-3">
          {(['all', 'expired', 'critical', 'warning', 'missing', 'assigned'] as QuickFilter[]).map((f) => {
            const labels: Record<QuickFilter, string> = {
              all: 'All',
              expired: 'Expired',
              critical: 'Critical',
              warning: 'Warning',
              missing: 'Missing',
              assigned: 'Assigned',
            };
            const count =
              f === 'all'
                ? enrichedData.length
                : f === 'assigned'
                ? enrichedData.filter((r) => r.activeTask && (r.activeTask.status === RenewalTaskStatus.Pending || r.activeTask.status === RenewalTaskStatus.InProgress)).length
                : enrichedData.filter((r) => r.risk === f.toUpperCase()).length;
            return (
              <Pressable
                key={f}
                onPress={() => setQuickFilter(f)}
                className={`px-3 py-1.5 rounded-lg ${
                  quickFilter === f ? 'bg-primary' : 'bg-surface dark:bg-slate-800 border border-border dark:border-slate-700'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${quickFilter === f ? 'text-white' : 'text-text-muted dark:text-slate-400'}`}
                >
                  {labels[f]} ({count})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, flexGrow: 1 }}>
        {filteredData.length === 0 && !loading ? (
          <EmptyState
            title="No documents found"
            description="No employee documents have been uploaded yet."
          />
        ) : (
          filteredData.map((row) => (
            <View
              key={row.id}
              className={`mb-3 p-4 rounded-xl border ${
                row.risk === 'EXPIRED'
                  ? 'border-red-400 bg-red-50 dark:bg-red-950/20'
                  : row.risk === 'CRITICAL'
                  ? 'border-red-300 bg-red-50/50 dark:bg-red-950/10'
                  : row.risk === 'WARNING'
                  ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/10'
                  : 'border-border dark:border-slate-700 bg-surface dark:bg-slate-800'
              }`}
            >
              <View className="flex-row justify-between items-start mb-2">
                <View>
                  <Text className="text-base font-bold text-text-primary dark:text-white">
                    {row.employee?.full_name || row.emp_code}
                  </Text>
                  <Text className="text-xs text-text-muted dark:text-slate-400">
                    {row.employee?.department || '—'} · {row.occupation || '—'}
                  </Text>
                </View>
                <View
                  className={`px-2 py-1 rounded-md ${
                    row.risk === 'EXPIRED'
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : row.risk === 'CRITICAL'
                      ? 'bg-red-100 dark:bg-red-900/20'
                      : row.risk === 'WARNING'
                      ? 'bg-amber-100 dark:bg-amber-900/20'
                      : row.risk === 'MISSING'
                      ? 'bg-gray-100 dark:bg-gray-800'
                      : 'bg-green-100 dark:bg-green-900/20'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      row.risk === 'EXPIRED' || row.risk === 'CRITICAL'
                        ? 'text-red-600 dark:text-red-400'
                        : row.risk === 'WARNING'
                        ? 'text-amber-600 dark:text-amber-400'
                        : row.risk === 'MISSING'
                        ? 'text-gray-600 dark:text-gray-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {RISK_CHIP[row.risk].label}
                  </Text>
                </View>
              </View>

              {/* Document rows */}
              {DOCUMENT_TYPES.map((doc) => {
                const days = (row as any)[`${doc.key}DaysRemaining`] as number | null;
                const expiry = (row as any)[doc.expiryField] as string | null;
                const isUrgent = days !== null && days <= 30;
                return (
                  <View key={doc.key} className="flex-row justify-between items-center py-1">
                    <Text className="text-xs text-text-muted dark:text-slate-400 w-20">{doc.label}</Text>
                    <Text
                      className={`text-xs font-semibold ${
                        isUrgent ? 'text-red-500' : 'text-text-primary dark:text-slate-200'
                      }`}
                    >
                      {expiry || '—'}
                    </Text>
                    <Text
                      className={`text-xs font-bold ${
                        days !== null && days < 0
                          ? 'text-red-500'
                          : isUrgent
                          ? 'text-amber-500'
                          : 'text-green-500'
                      }`}
                    >
                      {days !== null ? `${days}d` : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
