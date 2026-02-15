import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useColorScheme } from 'nativewind';
import {
  Mail,
  Phone,
  Building,
  Shield,
  CalendarDays,
  Zap,
  Sun,
  Moon,
  Monitor,
  Clock,
  Users,
  LogOut,
  Pencil,
} from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useBalance } from '@/hooks/use-balance';
import { useThemeStore } from '@/stores/theme-store';
import { getRoleLabel, formatHours, formatDaysHours, getInitials } from '@/lib/utils';
import { DEFAULT_WORKDAY_HOURS } from '@/lib/constants';
import { userService } from '@/services';

const isWeb = Platform.OS === 'web';

let MuiButton: any;
let Dialog: any;
let DialogTitle: any;
let DialogContent: any;
let DialogActions: any;
let MuiTextField: any;
let MenuItem: any;
let Autocomplete: any;
let MuiThemeProvider: any;
if (isWeb) {
  MuiButton = require('@mui/material/Button').default;
  Dialog = require('@mui/material/Dialog').default;
  DialogTitle = require('@mui/material/DialogTitle').default;
  DialogContent = require('@mui/material/DialogContent').default;
  DialogActions = require('@mui/material/DialogActions').default;
  MuiTextField = require('@mui/material/TextField').default;
  MenuItem = require('@mui/material/MenuItem').default;
  Autocomplete = require('@mui/material/Autocomplete').default;
  MuiThemeProvider = require('@/components/web/mui-theme-provider').MuiThemeProvider;
}

// ─── Web Components ──────────────────────────────────────────────────

function WebProfileCard({
  user,
  isDark,
  onEdit,
}: {
  user: any;
  isDark: boolean;
  onEdit: () => void;
}) {
  const fields = [
    { icon: Mail, label: 'Email', value: user.email },
    { icon: Phone, label: 'Phone', value: user.phone || 'Not set' },
    { icon: Building, label: 'Department', value: user.department || 'Not set' },
    { icon: Shield, label: 'Role', value: getRoleLabel(user.role) },
    { icon: Clock, label: 'Workday Hours', value: `${user.workday_hours || DEFAULT_WORKDAY_HOURS}h` },
    {
      icon: Users,
      label: 'Status',
      value: user.is_active !== false ? 'Active' : 'Inactive',
      color: user.is_active !== false ? '#16A34A' : '#DC2626',
    },
  ];

  return (
    <div
      style={{
        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
        border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      {/* Banner header — avatar + name + role + edit */}
      <div
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
            : 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
          padding: '28px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
          }}
        >
          <span style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF' }}>
            {getInitials(user.full_name)}
          </span>
        </div>

        {/* Name + role + department */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 4 }}>
            {user.full_name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: '#2563EB',
                borderRadius: 6,
                padding: '3px 10px',
              }}
            >
              {getRoleLabel(user.role)}
            </span>
            {user.department && (
              <span style={{ fontSize: 14, color: isDark ? '#94A3B8' : '#64748B' }}>
                {user.department}
              </span>
            )}
          </div>
        </div>

        {/* Edit button */}
        <MuiButton
          variant="outlined"
          size="small"
          startIcon={<Pencil size={14} />}
          onClick={onEdit}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            fontSize: 13,
            borderRadius: '10px',
            borderColor: isDark ? '#475569' : '#CBD5E1',
            color: isDark ? '#CBD5E1' : '#475569',
            '&:hover': { borderColor: '#2563EB', color: '#2563EB', backgroundColor: 'rgba(37,99,235,0.06)' },
          }}
        >
          Edit
        </MuiButton>
      </div>

      {/* Info grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
        }}
      >
        {fields.map((field, i) => (
          <div
            key={field.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 24px',
              borderTop: `1px solid ${isDark ? '#334155' : '#F1F5F9'}`,
              borderRight: i % 2 === 0 ? `1px solid ${isDark ? '#334155' : '#F1F5F9'}` : 'none',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: isDark ? 'rgba(37,99,235,0.1)' : '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <field.icon size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.04em', fontWeight: 600, marginBottom: 2 }}>
                {field.label}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: (field as any).color || (isDark ? '#E2E8F0' : '#0F172A'),
                }}
              >
                {field.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WebLeaveCard({
  ptoBalance,
  emergencyCount,
  workdayHours,
  isDark,
}: {
  ptoBalance: any;
  emergencyCount: number;
  workdayHours: number;
  isDark: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
        border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '18px 24px 14px' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A' }}>
          Leave Summary
        </span>
      </div>
      <div style={{ display: 'flex', gap: 12, padding: '0 24px 20px' }}>
        {/* PTO */}
        <div
          style={{
            flex: 1,
            borderRadius: 14,
            padding: '18px 16px',
            textAlign: 'center' as const,
            backgroundColor: ptoBalance && ptoBalance.balance_hours <= 0
              ? (isDark ? 'rgba(220,38,38,0.12)' : '#FEF2F2')
              : (isDark ? 'rgba(37,99,235,0.1)' : '#EFF6FF'),
            border: `1px solid ${ptoBalance && ptoBalance.balance_hours <= 0
              ? (isDark ? 'rgba(220,38,38,0.25)' : '#FECACA')
              : (isDark ? 'rgba(37,99,235,0.2)' : '#BFDBFE')}`,
          }}
        >
          <CalendarDays
            size={22}
            color={ptoBalance && ptoBalance.balance_hours <= 0 ? '#DC2626' : '#2563EB'}
            style={{ marginBottom: 6, alignSelf: 'center' } as any}
          />
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: ptoBalance && ptoBalance.balance_hours <= 0 ? '#DC2626' : (isDark ? '#60A5FA' : '#2563EB'),
            }}
          >
            {ptoBalance ? formatHours(ptoBalance.balance_hours) : '--'}
          </div>
          {ptoBalance && (
            <div style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', marginTop: 2 }}>
              {formatDaysHours(ptoBalance.balance_hours, workdayHours)}
            </div>
          )}
          <div style={{ fontSize: 11, color: isDark ? '#64748B' : '#94A3B8', marginTop: 4, fontWeight: 600, textTransform: 'uppercase' as const }}>
            PTO Available
          </div>
        </div>

        {/* Emergency */}
        <div
          style={{
            flex: 1,
            borderRadius: 14,
            padding: '18px 16px',
            textAlign: 'center' as const,
            backgroundColor: isDark ? 'rgba(220,38,38,0.1)' : '#FEF2F2',
            border: `1px solid ${isDark ? 'rgba(220,38,38,0.2)' : '#FECACA'}`,
          }}
        >
          <Zap
            size={22}
            color="#DC2626"
            style={{ marginBottom: 6, alignSelf: 'center' } as any}
          />
          <div style={{ fontSize: 22, fontWeight: 700, color: '#DC2626' }}>
            {emergencyCount}/3
          </div>
          <div style={{ fontSize: 11, color: isDark ? '#64748B' : '#94A3B8', marginTop: 6, fontWeight: 600, textTransform: 'uppercase' as const }}>
            Emergency / Month
          </div>
        </div>
      </div>
    </div>
  );
}

function WebThemeCard({
  theme,
  setTheme,
  isDark,
}: {
  theme: string;
  setTheme: (t: 'light' | 'dark' | 'system') => void;
  isDark: boolean;
}) {
  const options = [
    { value: 'light' as const, label: 'Light', Icon: Sun },
    { value: 'dark' as const, label: 'Dark', Icon: Moon },
    { value: 'system' as const, label: 'System', Icon: Monitor },
  ];

  return (
    <div
      style={{
        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
        border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
        borderRadius: 16,
        padding: '18px 24px 20px',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 14 }}>
        Appearance
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {options.map(({ value, label, Icon }) => {
          const isActive = theme === value;
          return (
            <div
              key={value}
              onClick={() => setTheme(value)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '14px 12px',
                borderRadius: 12,
                cursor: 'pointer',
                border: `1.5px solid ${isActive ? '#2563EB' : (isDark ? '#334155' : '#E2E8F0')}`,
                backgroundColor: isActive
                  ? (isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF')
                  : (isDark ? '#0F172A' : '#F8FAFC'),
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={20} color={isActive ? '#2563EB' : (isDark ? '#64748B' : '#94A3B8')} />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : (isDark ? '#94A3B8' : '#64748B'),
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Edit Profile Dialog */
function EditProfileDialog({
  open,
  user,
  departments,
  onClose,
  onSave,
}: {
  open: boolean;
  user: any;
  departments: string[];
  onClose: () => void;
  onSave: (data: Record<string, string>) => void;
}) {
  const isHR = user.role === 'hr' || user.role === 'hr_director';
  const [fullName, setFullName] = useState(user.full_name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [email, setEmail] = useState(user.email || '');
  const [department, setDepartment] = useState(user.department || '');
  const [role, setRole] = useState(user.role || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, string> = { full_name: fullName, phone, email };
      if (isHR) {
        data.department = department;
        data.role = role;
      }
      await onSave(data);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    fullName !== (user.full_name || '') ||
    phone !== (user.phone || '') ||
    email !== (user.email || '') ||
    (isHR && department !== (user.department || '')) ||
    (isHR && role !== (user.role || ''));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
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
          fontWeight: 700,
          fontSize: 18,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        Edit Profile
      </DialogTitle>
      <DialogContent sx={{ pt: '24px !important', pb: 1, px: 3, overflow: 'visible', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <MuiTextField
          label="Full Name"
          value={fullName}
          onChange={(e: any) => setFullName(e.target.value)}
          fullWidth
          size="small"
        />
        <MuiTextField
          label="Phone"
          value={phone}
          onChange={(e: any) => setPhone(e.target.value)}
          fullWidth
          size="small"
          placeholder="e.g. +971 50 123 4567"
        />
        <MuiTextField
          label="Email"
          value={email}
          onChange={(e: any) => setEmail(e.target.value)}
          fullWidth
          size="small"
          type="email"
        />
        {isHR ? (
          <Autocomplete
            freeSolo
            forcePopupIcon
            options={departments}
            value={department}
            onChange={(_: any, val: string | null) => setDepartment(val || '')}
            onInputChange={(_: any, val: string) => setDepartment(val)}
            renderInput={(params: any) => (
              <MuiTextField {...params} label="Department" size="small" placeholder="Search or type..." />
            )}
            fullWidth
            size="small"
          />
        ) : (
          <MuiTextField
            label="Department"
            value={user.department || ''}
            fullWidth
            size="small"
            disabled
            helperText="Managed by HR admin"
          />
        )}
        <MuiTextField
          label="Role"
          value={isHR ? role : getRoleLabel(user.role)}
          onChange={isHR ? (e: any) => setRole(e.target.value) : undefined}
          fullWidth
          size="small"
          disabled={!isHR}
          helperText={!isHR ? 'Managed by HR admin' : undefined}
          {...(isHR ? { select: true } : {})}
        >
          {isHR && [
            { value: 'employee', label: 'Employee' },
            { value: 'supervisor', label: 'Supervisor' },
            { value: 'manager', label: 'Manager' },
            { value: 'hr', label: 'HR' },
            { value: 'hr_director', label: 'HR Director' },
          ].map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </MuiTextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <MuiButton
          onClick={onClose}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Cancel
        </MuiButton>
        <MuiButton
          variant="contained"
          onClick={handleSave}
          disabled={!hasChanges || !fullName.trim() || saving}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const setUser = require('@/stores/auth-store').useAuthStore.getState().setUser;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { balances, emergencyCount, fetchBalance, fetchEmergencyCount } = useBalance();
  const { theme, setTheme } = useThemeStore();
  const [editOpen, setEditOpen] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);

  const isHR = user?.role === 'hr' || user?.role === 'hr_director';

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchBalance(user.id);
        fetchEmergencyCount(user.id);
      }
    }, [user?.id])
  );

  if (!user) return null;

  const ptoBalance = balances.find((b) => b.leave_type === 'pto');

  const handleEditOpen = async () => {
    setEditOpen(true);
    if (isHR) {
      try {
        const employees = await userService.getEmployees();
        const depts = [...new Set(employees.map((e: any) => e.department).filter(Boolean) as string[])];
        setDepartments(depts);
      } catch {}
    }
  };

  const handleSaveProfile = async (data: Record<string, string>) => {
    const updated = await userService.updateProfile(user.id, data);
    setUser(updated);
    setEditOpen(false);
  };

  // ─── Web Layout ──────────────────────────────────────────────────

  if (isWeb) {
    return (
      <div
        style={{
          padding: 28,
          overflowY: 'auto' as const,
          height: '100%',
          backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24, alignItems: 'stretch' }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <WebProfileCard user={user} isDark={isDark} onEdit={handleEditOpen} />
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <WebLeaveCard
                ptoBalance={ptoBalance}
                emergencyCount={emergencyCount}
                workdayHours={user.workday_hours || DEFAULT_WORKDAY_HOURS}
                isDark={isDark}
              />
              <WebThemeCard theme={theme} setTheme={setTheme} isDark={isDark} />
              {/* Sign Out */}
              <div
                onClick={signOut}
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '14px 24px',
                  borderRadius: 14,
                  cursor: 'pointer',
                  border: `1px solid ${isDark ? 'rgba(220,38,38,0.3)' : '#FECACA'}`,
                  backgroundColor: isDark ? 'rgba(220,38,38,0.08)' : '#FEF2F2',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e: any) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(220,38,38,0.15)' : '#FEE2E2'; }}
                onMouseLeave={(e: any) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(220,38,38,0.08)' : '#FEF2F2'; }}
              >
                <LogOut size={18} color="#DC2626" />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#DC2626' }}>
                  Sign Out
                </span>
              </div>
            </div>
          </div>

          {/* Edit Profile Dialog (outside grid — it's a portal/modal) */}
          {editOpen && (
            <MuiThemeProvider isDark={isDark}>
              <EditProfileDialog
                open={editOpen}
                user={user}
                departments={departments}
                onClose={() => setEditOpen(false)}
                onSave={handleSaveProfile}
              />
            </MuiThemeProvider>
          )}
        </div>
      </div>
    );
  }

  // ─── Mobile Layout (unchanged) ────────────────────────────────────

  return (
    <ScrollView className="flex-1 bg-background dark:bg-slate-900" contentContainerStyle={{ padding: 16 }}>
      {/* Profile card */}
      <Card className="items-center py-6 mb-4">
        <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-3">
          <Text className="text-2xl font-bold text-white">{getInitials(user.full_name)}</Text>
        </View>
        <Text className="text-xl font-bold text-text-primary dark:text-white">{user.full_name}</Text>
        <Badge variant="info" className="mt-2">{getRoleLabel(user.role)}</Badge>
      </Card>

      {/* Info rows */}
      <Card className="mb-4">
        <InfoRow icon={Mail} label="Email" value={user.email} />
        <InfoRow icon={Phone} label="Phone" value={user.phone || 'Not set'} />
        <InfoRow icon={Building} label="Department" value={user.department || 'Not set'} />
        <InfoRow icon={Shield} label="Role" value={getRoleLabel(user.role)} isLast />
      </Card>

      {/* Balance summary */}
      <Card className="mb-4">
        <Text className="text-sm font-semibold text-text-primary dark:text-white mb-3">Leave Summary</Text>
        <View className="flex-row gap-3">
          <View className={`flex-1 ${ptoBalance && ptoBalance.balance_hours <= 0 ? 'bg-error-light' : 'bg-primary-light'} rounded-xl p-3 items-center`}>
            <CalendarDays size={20} color={ptoBalance && ptoBalance.balance_hours <= 0 ? '#DC2626' : '#2563EB'} />
            <Text className={`text-lg font-bold mt-1 ${ptoBalance && ptoBalance.balance_hours <= 0 ? 'text-error' : 'text-primary'}`}>
              {ptoBalance ? formatHours(ptoBalance.balance_hours) : '--'}
            </Text>
            {ptoBalance && (
              <Text className={`text-xs ${ptoBalance.balance_hours <= 0 ? 'text-error' : 'text-text-muted dark:text-slate-400'}`}>
                {formatDaysHours(ptoBalance.balance_hours, user.workday_hours || DEFAULT_WORKDAY_HOURS)}
              </Text>
            )}
            <Text className="text-xs text-text-muted dark:text-slate-400">PTO Available</Text>
          </View>
          <View className="flex-1 bg-error-light rounded-xl p-3 items-center">
            <Zap size={20} color="#DC2626" />
            <Text className="text-lg font-bold text-error mt-1">{emergencyCount}/3</Text>
            <Text className="text-xs text-text-muted dark:text-slate-400">Emergency/Month</Text>
          </View>
        </View>
      </Card>

      {/* Theme toggle */}
      <Card className="mb-4">
        <Text className="text-sm font-semibold text-text-primary dark:text-white mb-3">Appearance</Text>
        <View className="flex-row gap-2">
          {([
            { value: 'light' as const, label: 'Light', Icon: Sun },
            { value: 'dark' as const, label: 'Dark', Icon: Moon },
            { value: 'system' as const, label: 'System', Icon: Monitor },
          ]).map(({ value, label, Icon }) => (
            <Pressable
              key={value}
              onPress={() => setTheme(value)}
              className={`flex-1 items-center py-3 rounded-xl border ${
                theme === value
                  ? 'bg-primary border-primary'
                  : 'bg-background dark:bg-slate-800 border-border dark:border-slate-600'
              }`}
            >
              <Icon size={20} color={theme === value ? '#FFFFFF' : '#64748B'} />
              <Text
                className={`text-xs mt-1 ${
                  theme === value ? 'text-white font-semibold' : 'text-text-muted dark:text-slate-400'
                }`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* Sign out */}
      <Button variant="destructive" onPress={signOut} fullWidth>
        Sign Out
      </Button>
    </ScrollView>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  isLast = false,
}: {
  icon: any;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View className={`flex-row items-center py-3 ${!isLast ? 'border-b border-border dark:border-slate-700' : ''}`}>
      <Icon size={18} color="#64748B" style={{ marginRight: 12 }} />
      <View className="flex-1">
        <Text className="text-xs text-text-muted dark:text-slate-400">{label}</Text>
        <Text className="text-sm text-text-primary dark:text-white">{value}</Text>
      </View>
    </View>
  );
}
