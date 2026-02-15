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
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/hooks/use-auth';
import { Role } from '@/types/enums';
import { NotificationBell } from '@/components/layout/notification-bell';
import { useNotificationStore } from '@/stores/notification-store';
import { useApprovalStore } from '@/stores/approval-store';
import { notificationService, approvalService } from '@/services';

const isWeb = Platform.OS === 'web';

const NAV_ITEMS = [
  { name: 'dashboard', title: 'Dashboard', Icon: LayoutDashboard, approverOnly: false },
  { name: 'requests', title: 'My Requests', Icon: FileText, approverOnly: false },
  { name: 'approvals', title: 'Approvals', Icon: CheckSquare, approverOnly: true },
  { name: 'team', title: 'Team', Icon: Users, approverOnly: true },
  { name: 'calendar', title: 'Calendar', Icon: CalendarDays, approverOnly: false },
  { name: 'profile', title: 'Profile', Icon: User, approverOnly: false },
] as const;

function WebSidebar({ isApprover, isDark, pendingCount }: { isApprover: boolean; isDark: boolean; pendingCount: number }) {
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = NAV_ITEMS.find((item) => pathname.includes(`/${item.name}`))?.name ?? 'dashboard';

  const visibleItems = NAV_ITEMS.filter((item) => !item.approverOnly || isApprover);

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
      <View style={{ paddingHorizontal: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: isDark ? '#1E293B' : '#F1F5F9', marginBottom: 8 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#2563EB' }}>HR Leave</Text>
        <Text style={{ fontSize: 12, color: isDark ? '#64748B' : '#94A3B8', marginTop: 2 }}>Management System</Text>
      </View>

      {/* Nav items */}
      {visibleItems.map((item) => {
        const isActive = activeTab === item.name;
        const iconColor = isActive ? '#2563EB' : isDark ? '#94A3B8' : '#64748B';

        return (
          <Pressable
            key={item.name}
            onPress={() => router.push(`/(app)/(tabs)/${item.name}` as any)}
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
            {item.name === 'approvals' && pendingCount > 0 && (
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
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
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
  const role = user?.role;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const pendingCount = useApprovalStore((s) => s.pendingCount);
  const setPendingCount = useApprovalStore((s) => s.setPendingCount);

  // Fetch unread count on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      notificationService.getUnreadCount(user.id).then(setUnreadCount);
      approvalService.getMyPendingApprovals(user.id).then((data) => setPendingCount(data.length));
    }
  }, [user?.id]);

  const isApprover =
    role === Role.Supervisor ||
    role === Role.Manager ||
    role === Role.HR ||
    role === Role.HRDirector;

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
        name="approvals"
        options={{
          title: 'Approvals',
          tabBarIcon: ({ color, size }) => <CheckSquare size={size} color={color} />,
          tabBarBadge: isApprover && pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#DC2626', fontSize: 10, fontWeight: '700' },
          href: isApprover ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
          href: isApprover ? undefined : null,
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
        <WebSidebar isApprover={isApprover} isDark={isDark} pendingCount={pendingCount} />
        <View style={{ flex: 1 }}>{tabs}</View>
      </View>
    );
  }

  return tabs;
}
