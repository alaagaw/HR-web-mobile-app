import { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useViewState } from '@/hooks/use-view-state';
import { useColorScheme } from 'nativewind';
import { Search } from 'lucide-react-native';
import { ScreenHeader } from '@/components/layout/screen-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useAuth } from '@/hooks/use-auth';
import type { Supplier, SupplierDraft } from '@/types/models';

const isWeb = Platform.OS === 'web';
const WIDE_SCREEN_BREAKPOINT = 1280;

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
let TextField: any;
let Snackbar: any;
let Alert: any;
let MenuItem: any;

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
  TextField = require('@mui/material/TextField').default;
  Snackbar = require('@mui/material/Snackbar').default;
  Alert = require('@mui/material/Alert').default;
  MenuItem = require('@mui/material/MenuItem').default;
}

// ============================================================
// DESIGN TOKENS (dark enterprise)
// ============================================================

const DT = {
  bgMain: '#0b1220',
  cardBg: '#111a2e',
  border: '#1e293b',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

// ============================================================
// DIALOG STATE
// ============================================================

interface SupplierDialogState {
  open: boolean;
  mode: 'add' | 'edit';
  supplier: Supplier | null;
  name: string;
  code: string;
  contact_person: string;
  phone: string;
  email: string;
  is_active: boolean;
  submitting: boolean;
}

const INITIAL_DIALOG: SupplierDialogState = {
  open: false,
  mode: 'add',
  supplier: null,
  name: '',
  code: '',
  contact_person: '',
  phone: '',
  email: '',
  is_active: true,
  submitting: false,
};

// ============================================================
// WEB: SUPPLIERS DATA GRID TABLE
// ============================================================

function WebSuppliersTable({
  data,
  isDark,
  onEdit,
}: {
  data: Supplier[];
  isDark: boolean;
  onEdit: (supplier: Supplier) => void;
}) {
  const [filters, setFilters] = useViewState('admin/suppliers.columnFilters', {
    name: '',
    code: '',
    contact_person: '',
    phone: '',
    email: '',
    status: '',
  });

  const [paginationModel, setPaginationModel] = useViewState(
    'admin/suppliers.pagination',
    { page: 0, pageSize: 25 }
  );
  const [sortModel, setSortModel] = useViewState<any[]>('admin/suppliers.sort', []);

  const filteredData = data.filter((row) => {
    const name = (row.name || '').toLowerCase();
    const code = (row.code || '').toLowerCase();
    const contact = (row.contact_person || '').toLowerCase();
    const phone = (row.phone || '').toLowerCase();
    const email = (row.email || '').toLowerCase();
    const status = row.is_active ? 'active' : 'inactive';
    if (filters.name && !name.includes(filters.name.toLowerCase())) return false;
    if (filters.code && !code.includes(filters.code.toLowerCase())) return false;
    if (filters.contact_person && !contact.includes(filters.contact_person.toLowerCase())) return false;
    if (filters.phone && !phone.includes(filters.phone.toLowerCase())) return false;
    if (filters.email && !email.includes(filters.email.toLowerCase())) return false;
    if (filters.status && !status.includes(filters.status.toLowerCase())) return false;
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

  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1.2,
      minWidth: 160,
      renderHeader: renderHeader('Name', 'name'),
      renderCell: (params: any) => (
        <span style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
          {params.row.name}
        </span>
      ),
    },
    {
      field: 'code',
      headerName: 'Code',
      flex: 0.7,
      minWidth: 100,
      renderHeader: renderHeader('Code', 'code'),
      renderCell: (params: any) => (
        <span style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#475569' }}>
          {params.row.code || '\u2014'}
        </span>
      ),
    },
    {
      field: 'contact_person',
      headerName: 'Contact Person',
      flex: 1,
      minWidth: 150,
      renderHeader: renderHeader('Contact Person', 'contact_person'),
      renderCell: (params: any) => (
        <span style={{ fontSize: 13, color: isDark ? '#F8FAFC' : '#0F172A' }}>
          {params.row.contact_person || '\u2014'}
        </span>
      ),
    },
    {
      field: 'phone',
      headerName: 'Phone',
      flex: 0.8,
      minWidth: 130,
      renderHeader: renderHeader('Phone', 'phone'),
      renderCell: (params: any) => (
        <span style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#475569' }}>
          {params.row.phone || '\u2014'}
        </span>
      ),
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1.2,
      minWidth: 200,
      renderHeader: renderHeader('Email', 'email'),
      renderCell: (params: any) => (
        <span style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#475569' }}>
          {params.row.email || '\u2014'}
        </span>
      ),
    },
    {
      field: 'is_active',
      headerName: 'Active',
      flex: 0.6,
      minWidth: 90,
      renderHeader: renderHeader('Status', 'status'),
      valueGetter: (_value: any, row: Supplier) => (row.is_active ? 'Active' : 'Inactive'),
      renderCell: (params: any) => {
        const active = params.row.is_active;
        return (
          <Chip
            label={active ? 'Active' : 'Inactive'}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: 11,
              backgroundColor: active ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)',
              color: active ? '#22C55E' : '#94A3B8',
              border: 'none',
            }}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (params: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(params.row);
          }}
          style={{
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: `1px solid ${isDark ? '#334155' : '#CBD5E1'}`,
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            color: isDark ? '#CBD5E1' : '#334155',
            cursor: 'pointer',
            transition: 'all 0.12s ease',
          }}
        >
          Edit
        </button>
      ),
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
        pageSizeOptions={[10, 25, 50]}
        rowHeight={48}
        sx={{
          borderRadius: 3,
          '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
          '& .MuiDataGrid-columnHeader': { alignItems: 'flex-start' },
          '& .MuiDataGrid-columnHeaderTitleContainer': { overflow: 'visible' },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)',
          },
        }}
      />
    </div>
  );
}

// ============================================================
// WEB: SUPPLIER DIALOG (Add / Edit)
// ============================================================

function SupplierDialog({
  state,
  onClose,
  onChange,
  onSubmit,
  existingSuppliers,
}: {
  state: SupplierDialogState;
  onClose: () => void;
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
  existingSuppliers: Supplier[];
}) {
  const isEdit = state.mode === 'edit';
  const trimmedName = state.name.trim().toLowerCase();
  const isDuplicate =
    trimmedName.length > 0 &&
    existingSuppliers.some(
      (s) =>
        s.name.toLowerCase() === trimmedName &&
        (!isEdit || s.id !== state.supplier?.id),
    );
  const isValid = state.name.trim().length > 0 && !isDuplicate;

  return (
    <Dialog
      open={state.open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backgroundImage: 'none',
        },
      }}
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
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {isEdit ? 'Edit Supplier' : 'Add Supplier'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.6, marginTop: 2 }}>
            {isEdit
              ? `${state.supplier?.name || ''} \u00B7 ${state.supplier?.code || 'No code'}`
              : 'Create a new supplier/vendor record'}
          </div>
        </div>
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
        <div style={{ display: 'flex', gap: 12 }}>
          <TextField
            label="Name"
            value={state.name}
            onChange={(e: any) => onChange('name', e.target.value)}
            fullWidth
            size="small"
            required
            error={isDuplicate}
            helperText={isDuplicate ? 'A supplier with this name already exists' : undefined}
          />
          <TextField
            label="Code"
            value={state.code}
            onChange={(e: any) => onChange('code', e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g. SUP-001"
          />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <TextField
            label="Contact Person"
            value={state.contact_person}
            onChange={(e: any) => onChange('contact_person', e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Phone"
            value={state.phone}
            onChange={(e: any) => onChange('phone', e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g. +971 50 123 4567"
          />
        </div>
        <TextField
          label="Email"
          value={state.email}
          onChange={(e: any) => onChange('email', e.target.value)}
          fullWidth
          size="small"
          type="email"
          placeholder="supplier@example.com"
        />
        <TextField
          label="Status"
          value={state.is_active ? 'active' : 'inactive'}
          onChange={(e: any) => onChange('is_active', e.target.value === 'active')}
          fullWidth
          size="small"
          select
        >
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <MuiButton
          onClick={onClose}
          disabled={state.submitting}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Cancel
        </MuiButton>
        <MuiButton
          variant="contained"
          onClick={onSubmit}
          disabled={!isValid || state.submitting}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            px: 3,
          }}
        >
          {state.submitting
            ? 'Saving...'
            : isEdit
            ? 'Save Changes'
            : 'Add Supplier'}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function SuppliersScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const windowWidth = useWindowWidth();
  const isWideScreen = isWeb && windowWidth >= WIDE_SCREEN_BREAKPOINT;
  const { user } = useAuth();

  const { suppliers, loading, fetchAll, create, update } = useSuppliers();
  const [search, setSearch] = useViewState('admin/suppliers.search', '');
  const [dialog, setDialog] = useState<SupplierDialogState>(INITIAL_DIALOG);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // Auto-refresh on mount
  const { invalidate } = useAutoRefresh(() => {
    fetchAll();
  }, []);

  // --- Filtered data (for mobile search) ---
  const filteredSuppliers = suppliers.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.code || '').toLowerCase().includes(q) ||
      (s.contact_person || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  });

  // --- Dialog handlers ---
  const handleOpenAdd = () => {
    setDialog({ ...INITIAL_DIALOG, open: true, mode: 'add' });
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setDialog({
      open: true,
      mode: 'edit',
      supplier,
      name: supplier.name,
      code: supplier.code || '',
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      is_active: supplier.is_active,
      submitting: false,
    });
  };

  const handleCloseDialog = () => {
    if (!dialog.submitting) setDialog(INITIAL_DIALOG);
  };

  const handleChange = (field: string, value: any) => {
    setDialog((s) => ({ ...s, [field]: value }));
  };

  const handleSubmit = async () => {
    setDialog((s) => ({ ...s, submitting: true }));
    try {
      const draft: SupplierDraft = {
        name: dialog.name.trim(),
        code: dialog.code.trim() || null,
        contact_person: dialog.contact_person.trim() || null,
        phone: dialog.phone.trim() || null,
        email: dialog.email.trim() || null,
      };

      if (dialog.mode === 'edit' && dialog.supplier) {
        await update(dialog.supplier.id, { ...draft, is_active: dialog.is_active } as any);
        setSnackbar({ open: true, message: `${dialog.name} updated successfully`, severity: 'success' });
      } else {
        await create(draft);
        setSnackbar({ open: true, message: `${dialog.name} added successfully`, severity: 'success' });
      }
      setDialog(INITIAL_DIALOG);
      invalidate();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Operation failed', severity: 'error' });
      setDialog((s) => ({ ...s, submitting: false }));
    }
  };

  // ─── Web render (wide screens only) ────────────────────
  if (isWideScreen) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? DT.bgMain : '#F8FAFC' }}>
        {/* Page header with back button */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: `1px solid ${isDark ? DT.border : '#E2E8F0'}`,
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
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isDark ? '#E2E8F0' : '#0F172A'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: isDark ? DT.textPrimary : '#0F172A',
              }}
            >
              Suppliers / Vendors
            </div>
            <div
              style={{
                fontSize: 13,
                color: isDark ? DT.textSecondary : '#64748B',
                marginTop: 2,
              }}
            >
              Manage supplier and vendor records
            </div>
          </div>

          {/* Global search */}
          <div style={{ position: 'relative', minWidth: 240 }}>
            <input
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px 8px 34px',
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
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>

          {/* Add Supplier button */}
          <button
            onClick={handleOpenAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Supplier
          </button>
        </div>

        {/* DataGrid */}
        <View style={{ flex: 1, padding: 16 }}>
          {suppliers.length > 0 || loading ? (
            <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
              <MuiThemeProvider isDark={isDark}>
                <WebSuppliersTable
                  data={search
                    ? suppliers.filter((s) => {
                        const q = search.toLowerCase();
                        return (
                          s.name.toLowerCase().includes(q) ||
                          (s.code || '').toLowerCase().includes(q) ||
                          (s.contact_person || '').toLowerCase().includes(q) ||
                          (s.phone || '').toLowerCase().includes(q) ||
                          (s.email || '').toLowerCase().includes(q)
                        );
                      })
                    : suppliers}
                  isDark={isDark}
                  onEdit={handleOpenEdit}
                />
              </MuiThemeProvider>
            </View>
          ) : (
            <EmptyState
              title="No suppliers found"
              description="Add a new supplier to get started."
            />
          )}
        </View>

        {/* Dialog & Snackbar — always rendered so they work even when list is empty */}
        <MuiThemeProvider isDark={isDark}>
          <SupplierDialog
            state={dialog}
            onClose={handleCloseDialog}
            onChange={handleChange}
            onSubmit={handleSubmit}
            existingSuppliers={suppliers}
          />
          <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert
              onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
              severity={snackbar.severity}
              variant="filled"
              sx={{ fontWeight: 600 }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </MuiThemeProvider>
      </View>
    );
  }

  // ─── Mobile render ──────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-[#0F172A]" edges={['top']}>
      <ScreenHeader title="Suppliers" />

      {/* Search */}
      <View className="px-4 py-3">
        <View className="flex-row items-center bg-surface dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl px-4 py-2.5">
          <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, code, contact..."
            className="flex-1 text-base text-text-primary dark:text-white"
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      {/* Add button (mobile) */}
      <View className="px-4 pb-3">
        <Pressable
          onPress={handleOpenAdd}
          className="bg-primary rounded-xl py-3 items-center"
        >
          <Text className="text-white font-semibold text-sm">Add Supplier</Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredSuppliers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0, flexGrow: 1 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => handleOpenEdit(item)}>
            <Card className="mb-3">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-primary-light dark:bg-blue-900/40 items-center justify-center mr-3">
                  <Text className="text-sm font-bold text-primary dark:text-blue-400">
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text-primary dark:text-white">
                    {item.name}
                  </Text>
                  {item.code ? (
                    <Text className="text-xs text-text-muted dark:text-slate-400">
                      Code: {item.code}
                    </Text>
                  ) : null}
                  {item.contact_person ? (
                    <Text className="text-xs text-text-muted dark:text-slate-400">
                      {item.contact_person}
                    </Text>
                  ) : null}
                  {item.phone ? (
                    <Text className="text-xs text-text-muted dark:text-slate-400">
                      {item.phone}
                    </Text>
                  ) : null}
                </View>
                <View
                  className={`px-2 py-1 rounded-md ${
                    item.is_active
                      ? 'bg-green-100 dark:bg-green-900/20'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      item.is_active
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {item.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="No suppliers found"
              description="Add a new supplier to get started."
            />
          ) : null
        }
      />

      {/* Mobile Add/Edit Dialog (using simple modal approach for web-only Dialog component) */}
      {isWeb && (
        <MuiThemeProvider isDark={isDark}>
          <SupplierDialog
            state={dialog}
            onClose={handleCloseDialog}
            onChange={handleChange}
            onSubmit={handleSubmit}
            existingSuppliers={suppliers}
          />
          <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert
              onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
              severity={snackbar.severity}
              variant="filled"
              sx={{ fontWeight: 600 }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </MuiThemeProvider>
      )}
    </SafeAreaView>
  );
}
