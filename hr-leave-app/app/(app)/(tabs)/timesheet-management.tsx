import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import {
  Briefcase,
  FolderOpen,
  Building2,
  ClipboardList,
  UserCheck,
} from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { AccessGate } from '@/components/access/access-gate';
import { WebAdminCard, type AdminPage } from './admin';

const isWeb = Platform.OS === 'web';

// Moved out of HR Admin into its own top-level tab so access can be
// granted independently (governed by access_policies key
// `nav:timesheet-management`). It's a (tabs) screen so it renders
// inside the app shell (sidebar) and lives at /timesheet-management,
// exactly like HR Admin.
const ITEMS: AdminPage[] = [
  { title: 'Projects', description: 'Manage projects, clients, and locations for timesheet tracking.', icon: FolderOpen, iconColor: '#0891B2', path: '/(app)/timesheet/projects' },
  { title: 'Suppliers', description: 'Manage vendor/subcontractor companies that provide workers.', icon: Building2, iconColor: '#7C3AED', path: '/(app)/timesheet/suppliers' },
  { title: 'Monthly Consolidated', description: 'View consolidated monthly hours with regular/overtime breakdown.', icon: ClipboardList, iconColor: '#059669', path: '/(app)/timesheet/timesheets' },
  { title: 'Timesheet Assignments', description: 'Assign timesheet keepers to projects and sites.', icon: UserCheck, iconColor: '#D97706', path: '/(app)/timesheet/timesheet-assignments' },
  { title: 'Hours Change Requests', description: 'Review and approve project regular-hours change requests.', icon: ClipboardList, iconColor: '#F59E0B', path: '/(app)/timesheet/project-hours-requests' },
  { title: 'Month Closures', description: 'Close and reopen calendar months for payroll. Blocks retroactive change requests against closed months.', icon: ClipboardList, iconColor: '#22C55E', path: '/(app)/timesheet/month-closures' },
  { title: 'Employee × Project Breakdown', description: "For a chosen month, see each employee's hours per project plus their total OT across all projects.", icon: ClipboardList, iconColor: '#3B82F6', path: '/(app)/timesheet/employee-project-breakdown' },
];

const SUBTITLE = 'Projects, suppliers, timesheets, and timesheet assignments';

function TimesheetManagementInner() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isMobile } = useBreakpoint();
  const go = (path: string) => router.push(path as any);

  // ─── Web (mirrors HR Admin: header + 2-col card grid) ──────────
  if (isWeb && !isMobile) {
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
                <Briefcase size={22} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: isDark ? '#FFFFFF' : '#0F172A' }}>
                  Timesheet Management
                </div>
                <div style={{ fontSize: 14, color: isDark ? '#94A3B8' : '#64748B' }}>
                  {SUBTITLE}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {ITEMS.map((page) => (
              <WebAdminCard
                key={page.path}
                title={page.title}
                description={page.description}
                icon={page.icon}
                iconColor={page.iconColor}
                isDark={isDark}
                onClick={() => go(page.path)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Mobile (mirrors HR Admin mobile) ──────────────────────────
  return (
    <ScrollView className="flex-1 bg-background dark:bg-slate-900" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-lg font-bold text-text-primary dark:text-white mb-1">
        Timesheet Management
      </Text>
      <Text className="text-sm text-text-muted dark:text-slate-400 mb-5">{SUBTITLE}</Text>
      {ITEMS.map((page) => (
        <Card key={page.path} className="mb-3">
          <Pressable onPress={() => go(page.path)} className="flex-row items-center py-2">
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

export default function TimesheetManagementScreen() {
  // Same key the sidebar uses → one Access Control policy governs
  // both the menu entry and direct access to this hub.
  return (
    <AccessGate resourceKey="nav:timesheet-management">
      <TimesheetManagementInner />
    </AccessGate>
  );
}
