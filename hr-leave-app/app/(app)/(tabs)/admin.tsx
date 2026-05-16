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
  ShieldAlert,
  UserPlus,
  FileText,
  RefreshCw,
  FolderOpen,
  Building2,
  UserCheck,
  DollarSign,
  Calculator,
  Activity,
} from 'lucide-react-native';
import { Card } from '@/components/ui/card';

const isWeb = Platform.OS === 'web';

// ─── Types ───────────────────────────────────────────────────────────

interface AdminPage {
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  path: string;
}

interface AdminGroup {
  label: string;
  description: string;
  items: AdminPage[];
}

// ─── Data ────────────────────────────────────────────────────────────

const ADMIN_GROUPS: AdminGroup[] = [
  {
    label: 'Management',
    description: 'Employee records, balances, registrations, and documents',
    items: [
      {
        title: 'Document Expiry',
        description: 'Monitor passport, iqama & insurance expiry. Assign renewal tasks to HR staff.',
        icon: ShieldAlert,
        iconColor: '#EF4444',
        path: '/(app)/admin/document-expiry',
      },
      {
        title: 'Pending Registrations',
        description: 'Review and approve employee self-registrations. Assign roles, departments, and employee codes.',
        icon: UserPlus,
        iconColor: '#F97316',
        path: '/(app)/admin/registrations',
      },
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
        title: 'Compensation',
        description: 'Track BASIC + HRA + Transportation + other allowances. Effective-dated rows preserve history through raises.',
        icon: DollarSign,
        iconColor: '#16A34A',
        path: '/(app)/admin/compensation',
      },
      {
        title: 'Leave Payouts',
        description: 'Calculate per-month leave payouts for any year/month. Auto-fills basic/HRA/transport based on compensation in effect.',
        icon: Calculator,
        iconColor: '#0891B2',
        path: '/(app)/admin/leave-payouts',
      },
    ],
  },
  {
    label: 'History & Reports',
    description: 'Audit trails, ledgers, and transaction history',
    items: [
      {
        title: 'Leave Request History',
        description: 'Complete history of all leave requests. Search, filter by date range, and review all transactions.',
        icon: ClipboardList,
        iconColor: '#8B5CF6',
        path: '/(app)/admin/request-history',
      },
      {
        title: 'Document Renewal History',
        description: 'History of all document renewal tasks. Track who renewed what, when, and the old/new expiry dates.',
        icon: RefreshCw,
        iconColor: '#0EA5E9',
        path: '/(app)/admin/renewal-history',
      },
      {
        title: 'Balance Ledger',
        description: 'Complete history of all balance adjustments across the organization.',
        icon: BookOpen,
        iconColor: '#F59E0B',
        path: '/(app)/admin/balance-ledger',
      },
      {
        title: 'User Activity',
        description: 'See who is actually using the system and who is not. Search by name or emp code; sorted by last active.',
        icon: Activity,
        iconColor: '#14B8A6',
        path: '/(app)/admin/user-activity',
      },
    ],
  },
  {
    label: 'Timesheet Management',
    description: 'Projects, suppliers, timesheets, and timesheet assignments',
    items: [
      {
        title: 'Projects',
        description: 'Manage projects, clients, and locations for timesheet tracking.',
        icon: FolderOpen,
        iconColor: '#0891B2',
        path: '/(app)/admin/projects',
      },
      {
        title: 'Suppliers',
        description: 'Manage vendor/subcontractor companies that provide workers.',
        icon: Building2,
        iconColor: '#7C3AED',
        path: '/(app)/admin/suppliers',
      },
      {
        title: 'Monthly Consolidated',
        description: 'View consolidated monthly hours with regular/overtime breakdown.',
        icon: ClipboardList,
        iconColor: '#059669',
        path: '/(app)/admin/timesheets',
      },
      {
        title: 'Timesheet Assignments',
        description: 'Assign timesheet keepers to projects and sites.',
        icon: UserCheck,
        iconColor: '#D97706',
        path: '/(app)/admin/timesheet-assignments',
      },
      {
        title: 'Hours Change Requests',
        description: 'Review and approve project regular-hours change requests.',
        icon: ClipboardList,
        iconColor: '#F59E0B',
        path: '/(app)/admin/project-hours-requests',
      },
      {
        title: 'Month Closures',
        description: 'Close and reopen calendar months for payroll. Blocks retroactive change requests against closed months.',
        icon: ClipboardList,
        iconColor: '#22C55E',
        path: '/(app)/admin/month-closures',
      },
      {
        title: 'Employee × Project Breakdown',
        description: 'For a chosen month, see each employee\'s hours per project plus their total OT across all projects.',
        icon: ClipboardList,
        iconColor: '#3B82F6',
        path: '/(app)/admin/employee-project-breakdown',
      },
    ],
  },
];

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
        borderRadius: 14,
        padding: '20px 24px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
      }}
      onMouseEnter={(e: any) => {
        e.currentTarget.style.borderColor = iconColor;
        e.currentTarget.style.boxShadow = `0 4px 16px ${iconColor}18`;
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
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: `${iconColor}14`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={24} color={iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: isDark ? '#FFFFFF' : '#0F172A', marginBottom: 3 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', lineHeight: 1.4 }}>
          {description}
        </div>
      </div>
      <ChevronRight size={18} color={isDark ? '#64748B' : '#94A3B8'} />
    </div>
  );
}

function WebGroupSection({
  group,
  isDark,
  onNavigate,
}: {
  group: AdminGroup;
  isDark: boolean;
  onNavigate: (path: string) => void;
}) {
  return (
    <div style={{ marginBottom: 36 }}>
      {/* Group header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: isDark ? '#F1F5F9' : '#0F172A' }}>
          {group.label}
        </div>
        <div style={{ fontSize: 13, color: isDark ? '#64748B' : '#94A3B8', marginTop: 2 }}>
          {group.description}
        </div>
      </div>

      {/* Cards grid — 2 columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 14,
        }}
      >
        {group.items.map((page) => (
          <WebAdminCard
            key={page.path}
            title={page.title}
            description={page.description}
            icon={page.icon}
            iconColor={page.iconColor}
            isDark={isDark}
            onClick={() => onNavigate(page.path)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────

export default function AdminScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleNavigate = (path: string) => router.push(path as any);

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
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
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

          {/* Admin groups */}
          {ADMIN_GROUPS.map((group) => (
            <WebGroupSection
              key={group.label}
              group={group}
              isDark={isDark}
              onNavigate={handleNavigate}
            />
          ))}
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

      {ADMIN_GROUPS.map((group) => (
        <View key={group.label} style={{ marginBottom: 20 }}>
          {/* Group header */}
          <Text className="text-sm font-bold text-text-primary dark:text-slate-200 mb-0.5">
            {group.label}
          </Text>
          <Text className="text-xs text-text-muted dark:text-slate-500 mb-3">
            {group.description}
          </Text>

          {group.items.map((page) => (
            <Card key={page.path} className="mb-3">
              <Pressable
                onPress={() => handleNavigate(page.path)}
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
        </View>
      ))}
    </ScrollView>
  );
}
