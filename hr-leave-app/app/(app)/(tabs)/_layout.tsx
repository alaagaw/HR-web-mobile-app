import { useEffect } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Users,
  User,
  CalendarDays,
  Settings,
  Bell,
  Clock,
  ClipboardList,
  Library,
  Briefcase,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/hooks/use-auth';
import { useBalance } from '@/hooks/use-balance';
import { useAccess } from '@/hooks/use-access';
import { NotificationBell } from '@/components/layout/notification-bell';
import { useNotificationStore } from '@/stores/notification-store';
import { useTaskStore } from '@/stores/task-store';
import { notificationService, leaveApprovalService } from '@/services';
import { formatHours } from '@/lib/utils';

const isWeb = Platform.OS === 'web';

// Visibility is governed by access_policies (key `nav:<name>`),
// resolved via useAccess(). See lib/access/resources.ts for the
// registry + legacyDefault that reproduces the old hardcoded
// approver/HR gating until HR edits a policy.
const NAV_ITEMS = [
  { name: 'dashboard', title: 'Dashboard', Icon: LayoutDashboard },
  { name: 'requests', title: 'My Requests', Icon: FileText },
  { name: 'tasks', title: 'Tasks', Icon: CheckSquare },
  { name: 'team', title: 'Team', Icon: Users },
  { name: 'timeclock', title: 'Clock In/Out', Icon: Clock },
  { name: 'timesheet-entry', title: 'Timesheet', Icon: ClipboardList },
  { name: 'calendar', title: 'Calendar', Icon: CalendarDays },
  { name: 'timesheet-management', title: 'Timesheet Management', Icon: Briefcase, route: '/(app)/admin/timesheet-management' },
  { name: 'notifications', title: 'Notifications', Icon: Bell, route: '/(app)/notifications' },
  { name: 'hr-policies-documents', title: 'HR Policies and Documents', Icon: Library, route: '/(app)/admin/hr-policies-documents' },
  { name: 'admin', title: 'HR Admin', Icon: Settings },
  { name: 'profile', title: 'Profile', Icon: User },
] as const;

function WebSidebar({ user, canAccess, isDark, pendingCount, unreadCount }: { user: any; canAccess: (key: string) => boolean; isDark: boolean; pendingCount: number; unreadCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const { balances, fetchBalance } = useBalance();

  useEffect(() => {
    if (user?.id) fetchBalance(user.id);
  }, [user?.id]);

  const ptoBalance = balances.find((b) => b.leave_type === 'pto');

  const activeTab = NAV_ITEMS.find((item) => pathname.includes(`/${item.name}`))?.name ?? 'dashboard';

  const visibleItems = NAV_ITEMS.filter((item) => canAccess(`nav:${item.name}`));

  return (
    <View
      style={{
        width: 230,
        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
        borderRightWidth: 1,
        borderRightColor: isDark ? '#334155' : '#E2E8F0',
        paddingTop: 20,
      }}
    >
      {/* Branding */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#1E293B' : '#F1F5F9', marginBottom: 8 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#2563EB' }}>HR</Text>
        <Text style={{ fontSize: 12, color: isDark ? '#64748B' : '#94A3B8', marginTop: 2 }}>Management System</Text>

        {/* Logged-in user */}
        {user && (
          <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#E2E8F0' : '#0F172A' }} numberOfLines={1}>
              {user.full_name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: user.is_active !== false ? '#16A34A' : '#DC2626',
                }}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '500',
                  color: user.is_active !== false ? '#16A34A' : '#DC2626',
                }}
              >
                {user.is_active !== false ? 'Active' : 'Inactive'}
              </Text>
            </View>
            {/* PTO Balance */}
            {ptoBalance && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 10,
                  backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF',
                  borderRadius: 8,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  gap: 6,
                }}
              >
                <CalendarDays size={14} color={isDark ? '#93C5FD' : '#2563EB'} />
                <Text style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B', fontWeight: '500' }}>PTO</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#93C5FD' : '#2563EB' }}>
                  {formatHours(ptoBalance.balance_hours)}
                </Text>
              </View>
            )}

          </View>
        )}
      </View>

      {/* Nav items */}
      {visibleItems.map((item) => {
        const isActive = activeTab === item.name;
        const iconColor = isActive ? '#2563EB' : isDark ? '#94A3B8' : '#64748B';

        return (
          <Pressable
            key={item.name}
            onPress={() => router.push(('route' in item && item.route ? item.route : `/(app)/(tabs)/${item.name}`) as any)}
            style={({ pressed }: { pressed: boolean }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 11,
              marginHorizontal: 10,
              marginVertical: 2,
              borderRadius: 10,
              backgroundColor: isActive
                ? isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF'
                : pressed
                  ? isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC'
                  : 'transparent',
              cursor: 'pointer',
            }) as any}
          >
            <item.Icon size={20} color={iconColor} />
            <Text
              style={{
                marginLeft: 12,
                fontSize: 14,
                fontWeight: isActive ? '600' : '500',
                color: isActive ? '#2563EB' : isDark ? '#CBD5E1' : '#334155',
                flex: 1,
              }}
            >
              {item.title}
            </Text>
            {item.name === 'notifications' && unreadCount > 0 && (
              <View
                style={{
                  backgroundColor: '#DC2626',
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  paddingHorizontal: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700', lineHeight: 20, textAlign: 'center' }}>
                  {unreadCount}
                </Text>
              </View>
            )}
            {item.name === 'tasks' && pendingCount > 0 && (
              <View
                style={{
                  backgroundColor: '#DC2626',
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  paddingHorizontal: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700', lineHeight: 20, textAlign: 'center' }}>
                  {pendingCount}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const pendingCount = useTaskStore((s) => s.pendingCount);
  const setPendingCount = useTaskStore((s) => s.setPendingCount);

  // Fetch unread count on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      notificationService.getUnreadCount(user.id).then(setUnreadCount);
      leaveApprovalService.getMyPendingApprovals(user.id, user.role).then((data) => setPendingCount(data.length));
    }
  }, [user?.id]);

  // Nav visibility is now policy-driven (HR-configurable). Until
  // policies load, canAccess falls back to each item's registry
  // legacyDefault, which reproduces the previous hardcoded
  // approver/HR behavior — so there is no regression or flash.
  const { canAccess } = useAccess();

  const tabs = (
    <Tabs
      tabBar={isWeb ? () => null : undefined}
      screenOptions={{
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: isDark ? '#64748B' : '#94A3B8',
        tabBarStyle: isWeb
          ? { display: 'none' as const }
          : {
              borderTopColor: isDark ? '#334155' : '#E2E8F0',
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              paddingTop: 4,
            },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
        },
        headerStyle: {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          shadowColor: 'transparent',
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#334155' : '#E2E8F0',
        },
        headerTitleStyle: {
          fontWeight: '600' as const,
          fontSize: 18,
          color: isDark ? '#FFFFFF' : '#0F172A',
        },
        headerRight: () => (
          <NotificationBell onPress={() => router.push('/(app)/notifications' as any)} />
        ),
        headerRightContainerStyle: { paddingRight: 12 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          ...(isWeb && { headerShown: false }),
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'My Requests',
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => <CheckSquare size={size} color={color} />,
          tabBarBadge: canAccess('nav:tasks') && pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#DC2626', fontSize: 10, fontWeight: '700' },
          href: canAccess('nav:tasks') ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
          href: canAccess('nav:team') ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="timeclock"
        options={{
          title: 'Clock In/Out',
          ...(isWeb && { headerShown: false }),
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="timesheet-entry"
        options={{
          title: 'Timesheet',
          ...(isWeb && { headerShown: false }),
          tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'HR Admin',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          href: canAccess('nav:admin') ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );

  if (isWeb) {
    return (
      <View style={{ flexDirection: 'row', flex: 1 }}>
        <WebSidebar user={user} canAccess={canAccess} isDark={isDark} pendingCount={pendingCount} unreadCount={unreadCount} />
        <View style={{ flex: 1 }}>{tabs}</View>
      </View>
    );
  }

  return tabs;
}
