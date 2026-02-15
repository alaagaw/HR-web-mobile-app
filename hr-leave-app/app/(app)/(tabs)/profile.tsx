import { useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
} from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useBalance } from '@/hooks/use-balance';
import { useThemeStore } from '@/stores/theme-store';
import { getRoleLabel, formatHours, formatDaysHours, getInitials } from '@/lib/utils';
import { DEFAULT_WORKDAY_HOURS } from '@/lib/constants';
import { Role } from '@/types/enums';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { balances, emergencyCount, fetchBalance, fetchEmergencyCount } = useBalance();
  const { theme, setTheme } = useThemeStore();

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
  const isHR = user.role === Role.HR || user.role === Role.HRDirector;

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

      {/* HR Admin links */}
      {isHR && (
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-text-primary dark:text-white mb-3">HR Admin</Text>
          <Button
            variant="secondary"
            onPress={() => router.push('/(app)/admin/employees' as any)}
            fullWidth
            className="mb-2"
          >
            Manage Employees
          </Button>
          <Button
            variant="secondary"
            onPress={() => router.push('/(app)/admin/balances' as any)}
            fullWidth
            className="mb-2"
          >
            Manage Balances
          </Button>
          <Button
            variant="secondary"
            onPress={() => router.push('/(app)/admin/balance-ledger' as any)}
            fullWidth
          >
            Balance Ledger
          </Button>
        </Card>
      )}

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
