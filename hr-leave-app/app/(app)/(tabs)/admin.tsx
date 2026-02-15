import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
  Users,
  Wallet,
  BookOpen,
  ClipboardList,
  ChevronRight,
  Settings,
} from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const isWeb = Platform.OS === 'web';

// ─── Web Components ──────────────────────────────────────────────────

function WebAdminCard({
  title,
  description,
  icon: Icon,
  iconColor,
  isDark,
  onClick,
}: {
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  isDark: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
        border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
        borderRadius: 16,
        padding: '28px 28px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}
      onMouseEnter={(e: any) => {
        e.currentTarget.style.borderColor = '#2563EB';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.12)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e: any) => {
        e.currentTarget.style.borderColor = isDark ? '#334155' : '#E2E8F0';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          backgroundColor: `${iconColor}14`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={26} color={iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', lineHeight: 1.4 }}>
          {description}
        </div>
      </div>
      <ChevronRight size={20} color={isDark ? '#64748B' : '#94A3B8'} />
    </div>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────

export default function AdminScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const adminPages = [
    {
      title: 'Manage Employees',
      description: 'View, search, and edit employee profiles, roles, departments, and organizational assignments.',
      icon: Users,
      iconColor: '#2563EB',
      path: '/(app)/admin/employees',
    },
    {
      title: 'Manage Balances',
      description: 'View PTO balances for all employees. Add or deduct hours with full audit trail.',
      icon: Wallet,
      iconColor: '#16A34A',
      path: '/(app)/admin/balances',
    },
    {
      title: 'Balance Ledger',
      description: 'Complete history of all balance adjustments across the organization.',
      icon: BookOpen,
      iconColor: '#F59E0B',
      path: '/(app)/admin/balance-ledger',
    },
    {
      title: 'Request History',
      description: 'Complete history of all leave requests. Search, filter by date range, and review all transactions.',
      icon: ClipboardList,
      iconColor: '#8B5CF6',
      path: '/(app)/admin/request-history',
    },
  ];

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
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Settings size={22} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A' }}>
                  HR Administration
                </div>
                <div style={{ fontSize: 14, color: isDark ? '#94A3B8' : '#64748B' }}>
                  Manage employees, balances, and organizational data
                </div>
              </div>
            </div>
          </div>

          {/* Admin cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {adminPages.map((page) => (
              <WebAdminCard
                key={page.path}
                title={page.title}
                description={page.description}
                icon={page.icon}
                iconColor={page.iconColor}
                isDark={isDark}
                onClick={() => router.push(page.path as any)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Mobile Layout ────────────────────────────────────────────────

  return (
    <ScrollView className="flex-1 bg-background dark:bg-slate-900" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-lg font-bold text-text-primary dark:text-white mb-1">
        HR Administration
      </Text>
      <Text className="text-sm text-text-muted dark:text-slate-400 mb-5">
        Manage employees, balances, and organizational data
      </Text>

      {adminPages.map((page) => (
        <Card key={page.path} className="mb-3">
          <Pressable
            onPress={() => router.push(page.path as any)}
            className="flex-row items-center py-2"
          >
            <View
              className="w-11 h-11 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: `${page.iconColor}18` }}
            >
              <page.icon size={22} color={page.iconColor} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-text-primary dark:text-white">
                {page.title}
              </Text>
              <Text className="text-xs text-text-muted dark:text-slate-400 mt-0.5" numberOfLines={2}>
                {page.description}
              </Text>
            </View>
          </Pressable>
        </Card>
      ))}
    </ScrollView>
  );
}
