import { useCallback, useState } from 'react';
import { View, Text, FlatList, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useColorScheme } from 'nativewind';
import { format, subDays, startOfMonth, startOfYear, subMonths } from 'date-fns';
import { ScreenHeader } from '@/components/layout/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { renewalTaskService } from '@/services';
import type { RenewalTaskHistory, RenewalTask } from '@/types/models';

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

// ─── Labels ──────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  passport: 'Passport',
  iqama: 'Iqama',
  insurance: 'Insurance',
};

// ─── Date Range helpers ──────────────────────────────────────────────

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

// ─── Extended history row type ───────────────────────────────────────

type HistoryRow = RenewalTaskHistory & {
  task?: RenewalTask & {
    employee?: { id: string; full_name: string; role: string; department: string | null };
    assigned_to?: { id: string; full_name: string };
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────

function isRowConfirmed(row: HistoryRow): boolean {
  return !!row.completed_at || row.to_status === 'completed';
}

/** Merge old multi-row history data into one record per task */
function deduplicateHistory(rawData: HistoryRow[]): HistoryRow[] {
  const taskMap = new Map<string, HistoryRow>();
  for (const row of rawData) {
    const key = row.task_id;
    const prev = taskMap.get(key);
    if (!prev) {
      taskMap.set(key, { ...row });
      continue;
    }
    // Figure out which is the "created" (base) row and which is the "completed" row
    const isRowCreation = row.action === 'created' || row.from_status === null;
    const [base, other] = isRowCreation ? [row, prev] : [prev, row];
    const otherDone = other.to_status === 'completed' || other.action === 'completed';

    taskMap.set(key, {
      ...base, // keep creator info + created_at
      to_status: otherDone ? 'completed' : base.to_status,
      completed_at: base.completed_at || (otherDone ? (other.completed_at || other.created_at) : null),
      comment: base.comment || other.comment,
      metadata: {
        ...(base.metadata || {}),
        ...(other.metadata || {}),
        ...(otherDone && other.performer?.full_name
          ? { confirmed_by_name: other.performer.full_name, confirmed_by_role: other.performer_role }
          : {}),
      } as any,
    });
  }
  return Array.from(taskMap.values());
}

// ─── Progress Stepper (Web) ─────────────────────────────────────────

function fmtShortDate(d: string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ProgressStepper({ row, isDark }: { row: HistoryRow; isDark: boolean }) {
  const meta = row.metadata as any;
  const confirmed = isRowConfirmed(row);
  const creatorName = row.performer?.full_name || '—';
  const creatorInitial = creatorName !== '—' ? creatorName.charAt(0).toUpperCase() : '?';

  // Step 2: if confirmed, show confirmer; otherwise show assignee
  const step2Name = confirmed
    ? (meta?.confirmed_by_name || row.task?.assigned_to?.full_name || '—')
    : (row.task?.assigned_to?.full_name || '—');
  const step2Initial = step2Name !== '—' ? step2Name.charAt(0).toUpperCase() : '?';

  const green = '#16A34A';
  const yellow = '#F59E0B';
  const grey = isDark ? '#475569' : '#94A3B8';
  const textPrimary = isDark ? '#E2E8F0' : '#0F172A';
  const textMuted = isDark ? '#64748B' : '#94A3B8';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '4px 0' }}>
      {/* Step 1: Created */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 68 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 15,
          backgroundColor: green,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{creatorInitial}</span>
        </div>
        <span style={{
          fontSize: 10, color: textPrimary, marginTop: 2,
          maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {creatorName.split(' ')[0]}
        </span>
      </div>

      {/* Line 1: always solid green */}
      <div style={{ width: 20, height: 2, backgroundColor: green, flexShrink: 0 }} />

      {/* Step 2: Confirmer / Assignee */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 68 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 15,
          backgroundColor: confirmed ? green : 'transparent',
          border: confirmed ? 'none' : `2.5px solid ${yellow}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: confirmed ? '#fff' : yellow, fontSize: 13, fontWeight: 700 }}>
            {step2Initial}
          </span>
        </div>
        <span style={{
          fontSize: 10, color: confirmed ? green : yellow, marginTop: 2,
          maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {step2Name.split(' ')[0]}
        </span>
      </div>

      {/* Line 2 */}
      <div style={{
        width: 20, height: 0,
        borderTop: confirmed ? `2px solid ${green}` : `2px dashed ${grey}`,
        flexShrink: 0,
      }} />

      {/* Step 3: Done */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 15,
          backgroundColor: confirmed ? green : 'transparent',
          border: confirmed ? 'none' : `2.5px dashed ${grey}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {confirmed && <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>✓</span>}
        </div>
        <span style={{ fontSize: 10, color: confirmed ? green : grey, marginTop: 2 }}>
          Done
        </span>
      </div>
    </div>
  );
}

// ─── Web DataGrid Table ──────────────────────────────────────────────

function WebRenewalHistoryTable({
  data,
  isDark,
}: {
  data: HistoryRow[];
  isDark: boolean;
}) {
  const [filters, setFilters] = useState({
    taskNumber: '',
    employee: '',
    docType: '',
    status: '',
    oldExpiry: '',
    newExpiry: '',
  });

  const filteredData = data.filter((row) => {
    const taskNum = (row.task?.task_number || '').toLowerCase();
    const emp = `${row.task?.employee?.full_name || ''} ${row.task?.employee?.department || ''}`.toLowerCase();
    const docType = (DOC_TYPE_LABELS[row.task?.document_type || ''] || row.task?.document_type || '').toLowerCase();
    const statusText = isRowConfirmed(row) ? 'confirmed' : 'pending';
    const meta = row.metadata as any;
    const curExpiry = (meta?.old_expiry || row.task?.expiry_date || '').toLowerCase();
    const nExpiry = (meta?.new_expiry || '').toLowerCase();

    if (filters.taskNumber && !taskNum.includes(filters.taskNumber.toLowerCase())) return false;
    if (filters.employee && !emp.includes(filters.employee.toLowerCase())) return false;
    if (filters.docType && !docType.includes(filters.docType.toLowerCase())) return false;
    if (filters.status && !statusText.includes(filters.status.toLowerCase())) return false;
    if (filters.oldExpiry && !curExpiry.includes(filters.oldExpiry.toLowerCase())) return false;
    if (filters.newExpiry && !nExpiry.includes(filters.newExpiry.toLowerCase())) return false;
    return true;
  });

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
      field: 'task_number',
      headerName: 'Task #',
      flex: 0.8,
      minWidth: 130,
      renderHeader: renderHeader('Task #', 'taskNumber'),
      valueGetter: (_v: any, row: HistoryRow) => row.task?.task_number || '—',
    },
    {
      field: 'employee_name',
      headerName: 'Employee',
      flex: 1.1,
      minWidth: 155,
      renderHeader: renderHeader('Employee', 'employee'),
      valueGetter: (_v: any, row: HistoryRow) =>
        `${row.task?.employee?.full_name || ''} ${row.task?.employee?.department || ''}`.trim(),
      renderCell: (params: any) => {
        const row = params.row as HistoryRow;
        return (
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.task?.employee?.full_name || '—'}
            </div>
            <div style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B' }}>
              {row.task?.employee?.department || '—'}
            </div>
          </div>
        );
      },
    },
    {
      field: 'document_type',
      headerName: 'Document',
      flex: 0.6,
      minWidth: 100,
      renderHeader: renderHeader('Document', 'docType'),
      valueGetter: (_v: any, row: HistoryRow) =>
        DOC_TYPE_LABELS[row.task?.document_type || ''] || row.task?.document_type || '—',
      renderCell: (params: any) => {
        const row = params.row as HistoryRow;
        const docType = row.task?.document_type || '';
        const colorMap: Record<string, 'warning' | 'info' | 'error'> = {
          passport: 'info',
          iqama: 'warning',
          insurance: 'error',
        };
        return (
          <Chip
            label={DOC_TYPE_LABELS[docType] || docType}
            size="small"
            color={colorMap[docType] || 'default'}
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: 12 }}
          />
        );
      },
    },
    {
      field: 'progress',
      headerName: 'Progress',
      flex: 2,
      minWidth: 310,
      sortable: false,
      renderHeader: renderHeader('Progress', 'status'),
      renderCell: (params: any) => {
        const row = params.row as HistoryRow;
        return <ProgressStepper row={row} isDark={isDark} />;
      },
      valueGetter: (_v: any, row: HistoryRow) => isRowConfirmed(row) ? 'Confirmed' : 'Pending',
    },
    {
      field: 'assigned_date',
      headerName: 'Assigned Date',
      flex: 0.8,
      minWidth: 140,
      valueGetter: (_v: any, row: HistoryRow) => {
        const d = (row.task as any)?.assigned_at || row.created_at;
        return d ? new Date(d).getTime() : 0;
      },
      renderCell: (params: any) => {
        const row = params.row as HistoryRow;
        const d = (row.task as any)?.assigned_at || row.created_at;
        if (!d) return <span style={{ color: isDark ? '#64748B' : '#94A3B8' }}>—</span>;
        const dt = new Date(d);
        return (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#F8FAFC' : '#0F172A' }}>
              {dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B' }}>
              {dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      },
    },
    {
      field: 'completed_date',
      headerName: 'Completed Date',
      flex: 0.8,
      minWidth: 140,
      valueGetter: (_v: any, row: HistoryRow) => {
        const d = row.completed_at || (row.task as any)?.completed_at;
        return d ? new Date(d).getTime() : 0;
      },
      renderCell: (params: any) => {
        const row = params.row as HistoryRow;
        const d = row.completed_at || (row.task as any)?.completed_at;
        if (!d) return <span style={{ color: isDark ? '#64748B' : '#94A3B8' }}>—</span>;
        const dt = new Date(d);
        return (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#16A34A' }}>
              {dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B' }}>
              {dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      },
    },
    {
      field: 'old_expiry',
      headerName: 'Old Expiry',
      flex: 0.7,
      minWidth: 115,
      renderHeader: renderHeader('Old Expiry', 'oldExpiry'),
      valueGetter: (_v: any, row: HistoryRow) => {
        const meta = row.metadata as any;
        return meta?.old_expiry || row.task?.expiry_date || '—';
      },
      renderCell: (params: any) => {
        const row = params.row as HistoryRow;
        const meta = row.metadata as any;
        const expiry = meta?.old_expiry || row.task?.expiry_date;
        if (!expiry) return <span style={{ color: isDark ? '#64748B' : '#94A3B8' }}>—</span>;
        return (
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#EF4444',
            padding: '3px 10px',
            borderRadius: 6,
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
          }}>
            {expiry}
          </span>
        );
      },
    },
    {
      field: 'new_expiry',
      headerName: 'New Expiry',
      flex: 0.7,
      minWidth: 115,
      renderHeader: renderHeader('New Expiry', 'newExpiry'),
      valueGetter: (_v: any, row: HistoryRow) => {
        const meta = row.metadata as any;
        return meta?.new_expiry || '—';
      },
      renderCell: (params: any) => {
        const row = params.row as HistoryRow;
        const meta = row.metadata as any;
        const expiry = meta?.new_expiry;
        if (!expiry) return <span style={{ color: isDark ? '#64748B' : '#94A3B8' }}>—</span>;
        return (
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#16A34A',
            padding: '3px 10px',
            borderRadius: 6,
            backgroundColor: 'rgba(22, 163, 74, 0.08)',
          }}>
            {expiry}
          </span>
        );
      },
    },
    {
      field: 'comment',
      headerName: 'Comment',
      flex: 0.7,
      minWidth: 100,
      valueGetter: (_v: any, row: HistoryRow) => row.comment || '—',
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
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        rowHeight={80}
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

// ─── Date Filter Bar (Web) ───────────────────────────────────────────

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
                  ? '#0EA5E9'
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

// ─── Mobile Card ─────────────────────────────────────────────────────

function MobileHistoryCard({ entry }: { entry: HistoryRow }) {
  const meta = entry.metadata as any;
  const confirmed = isRowConfirmed(entry);
  const color = confirmed ? '#16A34A' : '#F59E0B';
  const currentExpiry = meta?.old_expiry || entry.task?.expiry_date;
  const newExpiry = meta?.new_expiry;

  const creatorName = entry.performer?.full_name || '—';
  const creatorInitial = creatorName !== '—' ? creatorName.charAt(0).toUpperCase() : '?';
  const step2Name = confirmed
    ? (meta?.confirmed_by_name || entry.task?.assigned_to?.full_name || '—')
    : (entry.task?.assigned_to?.full_name || '—');
  const step2Initial = step2Name !== '—' ? step2Name.charAt(0).toUpperCase() : '?';

  const green = '#16A34A';
  const yellow = '#F59E0B';
  const grey = '#64748B';
  const muted = '#94A3B8';

  const assignedDate = (entry.task as any)?.assigned_at || entry.created_at;
  const completedDate = entry.completed_at || (entry.task as any)?.completed_at;

  return (
    <View
      className="bg-surface dark:bg-slate-800 rounded-xl mb-3 p-4"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-sm font-bold text-text-primary dark:text-white">
            {entry.task?.employee?.full_name || 'Unknown'}
          </Text>
          <Text className="text-xs text-text-muted dark:text-slate-400">
            {DOC_TYPE_LABELS[entry.task?.document_type || ''] || entry.task?.document_type} — {entry.task?.task_number}
          </Text>
        </View>
        <View
          className="px-2 py-1 rounded-md"
          style={{ backgroundColor: `${color}18` }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color }}>
            {confirmed ? 'Confirmed' : 'Pending'}
          </Text>
        </View>
      </View>

      {/* Progress Stepper */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        {/* Step 1: Creator */}
        <View style={{ alignItems: 'center', minWidth: 60 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: green, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{creatorInitial}</Text>
          </View>
          <Text style={{ fontSize: 9, color: '#E2E8F0', marginTop: 2 }} numberOfLines={1}>
            {creatorName.split(' ')[0]}
          </Text>
        </View>

        <View style={{ width: 18, height: 2, backgroundColor: green }} />

        {/* Step 2: Confirmer */}
        <View style={{ alignItems: 'center', minWidth: 60 }}>
          <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: confirmed ? green : 'transparent',
            borderWidth: confirmed ? 0 : 2.5,
            borderColor: yellow,
            borderStyle: 'solid',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: confirmed ? '#fff' : yellow, fontSize: 12, fontWeight: '700' }}>{step2Initial}</Text>
          </View>
          <Text style={{ fontSize: 9, color: confirmed ? green : yellow, marginTop: 2 }} numberOfLines={1}>
            {step2Name.split(' ')[0]}
          </Text>
        </View>

        <View style={{ width: 18, height: 0, borderTopWidth: 2, borderStyle: confirmed ? 'solid' : 'dashed', borderColor: confirmed ? green : grey }} />

        {/* Step 3: Done */}
        <View style={{ alignItems: 'center', minWidth: 36 }}>
          <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: confirmed ? green : 'transparent',
            borderWidth: confirmed ? 0 : 2.5,
            borderColor: grey,
            borderStyle: 'dashed',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {confirmed && <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓</Text>}
          </View>
          <Text style={{ fontSize: 9, color: confirmed ? green : grey, marginTop: 2 }}>Done</Text>
        </View>
      </View>

      {/* Dates */}
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
        <View>
          <Text style={{ fontSize: 9, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
            Assigned
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#E2E8F0' }}>
            {assignedDate ? fmtShortDate(assignedDate) : '—'}
          </Text>
        </View>
        <View>
          <Text style={{ fontSize: 9, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
            Completed
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: confirmed ? green : muted }}>
            {confirmed && completedDate ? fmtShortDate(completedDate) : '—'}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-3" style={{ flexWrap: 'wrap' }}>
        {currentExpiry && (
          <View>
            <Text style={{ fontSize: 9, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
              Old Expiry
            </Text>
            <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '600' }}>
                {currentExpiry}
              </Text>
            </View>
          </View>
        )}
        {newExpiry && (
          <View>
            <Text style={{ fontSize: 9, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
              New Expiry
            </Text>
            <View style={{ backgroundColor: 'rgba(22, 163, 74, 0.08)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '600' }}>
                {newExpiry}
              </Text>
            </View>
          </View>
        )}
      </View>

      {entry.comment && (
        <Text className="text-xs text-text-muted dark:text-slate-400 mt-2" numberOfLines={2}>
          {entry.comment}
        </Text>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────

export default function RenewalHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const defaultRange = getDateRange('last30');
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [activeRange, setActiveRange] = useState<QuickRange | null>('last30');
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async (from: string, to: string) => {
    setLoading(true);
    try {
      const rawData = await renewalTaskService.getAllHistory(
        `${from}T00:00:00.000Z`,
        `${to}T23:59:59.999Z`,
      );
      setHistory(deduplicateHistory(rawData));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(dateFrom, dateTo); }, []));

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

  // ─── Web render ────────────────────────────────────────────────────

  if (isWeb) {
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
              Document Renewal History
            </div>
            <div style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
              Audit trail of all document renewal actions across the organization
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
            {history.length} entr{history.length !== 1 ? 'ies' : 'y'}
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

          {history.length > 0 || loading ? (
            <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
              <MuiThemeProvider isDark={isDark}>
                <WebRenewalHistoryTable data={history} isDark={isDark} />
              </MuiThemeProvider>
            </View>
          ) : (
            <EmptyState
              title="No renewal history found"
              description="No document renewal actions found for the selected date range."
            />
          )}
        </View>
      </View>
    );
  }

  // ─── Mobile render ─────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-[#0F172A]" edges={['top']}>
      <ScreenHeader title="Renewal History" />

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
          {history.length} entr{history.length !== 1 ? 'ies' : 'y'}
        </Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 0, flexGrow: 1 }}
        renderItem={({ item }) => <MobileHistoryCard entry={item} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="No renewal history found"
              description="No document renewal actions found for the selected date range."
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
