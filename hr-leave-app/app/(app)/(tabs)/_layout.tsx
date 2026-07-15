import { useEffect, useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Menu,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/hooks/use-auth';
import { useBalance } from '@/hooks/use-balance';
import { useAccess } from '@/hooks/use-access';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { NotificationBell } from '@/components/layout/notification-bell';
import { useNotificationStore } from '@/stores/notification-store';
import { useTaskStore } from '@/stores/task-store';
import { notificationService, leaveApprovalService } from '@/services';
import { formatHours } from '@/lib/utils';

const isWeb = Platform.OS === 'web';

// Lazy-load MUI (web-only) — this layout also runs on native, where
// importing @mui would crash the bundle. Matches the require-guard
// pattern used across the screen files (see dashboard.tsx).
let MuiDrawer: any;
if (isWeb) {
  MuiDrawer = require('@mui/material/Drawer').default;
}

// Real tab screens eligible for the mobile bottom bar, in priority
// order. We render the first 5 the current user can access; every
// nav item (including these) is always reachable via the Drawer, so
// the bottom bar is purely quick-access and nothing is ever lost.
const PRIMARY_TAB_ORDER = [
  'dashboard',
  'requests',
  'tasks',
  'timeclock',
  'timesheet-entry',
  'team',
  'calendar',
  'profile',
  'timesheet-management',
] as const;

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
  { name: 'timesheet-management', title: 'Timesheet Management', Icon: Briefcase },
  { name: 'notifications', title: 'Notifications', Icon: Bell, route: '/(app)/notifications' },
  { name: 'hr-policies-documents', title: 'HR Policies and Documents', Icon: Library, route: '/(app)/admin/hr-policies-documents' },
  { name: 'admin', title: 'HR Admin', Icon: Settings },
  { name: 'profile', title: 'Profile', Icon: User },
] as const;

function WebSidebar({ user, canAccess, isDark, pendingCount, unreadCount, onNavigate }: { user: any; canAccess: (key: string) => boolean; isDark: boolean; pendingCount: number; unreadCount: number; onNavigate?: () => void }) {
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
            onPress={() => {
              router.push(('route' in item && item.route ? item.route : `/(app)/(tabs)/${item.name}`) as any);
              onNavigate?.();
            }}
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

// ── Mobile-web chrome (only rendered below 1200px on web) ──────────
// Replaces the expo-router header. Shows the hamburger (opens the
// Drawer with the full nav), the active screen title, and the bell.
function MobileTopBar({ isDark, onMenu, onBell }: { isDark: boolean; onMenu: () => void; onBell: () => void }) {
  const pathname = usePathname();
  const title = NAV_ITEMS.find((item) => pathname.includes(`/${item.name}`))?.title ?? 'HR';

  return (
    <SafeAreaView
      edges={['top']}
      style={{
        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#334155' : '#E2E8F0',
      }}
    >
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
        <Pressable
          onPress={onMenu}
          accessibilityLabel="Open menu"
          hitSlop={8}
          style={{ padding: 8, borderRadius: 8, cursor: 'pointer' } as any}
        >
          <Menu size={24} color={isDark ? '#E2E8F0' : '#0F172A'} />
        </Pressable>
        <Text
          numberOfLines={1}
          style={{ flex: 1, marginLeft: 4, fontSize: 17, fontWeight: '600', color: isDark ? '#FFFFFF' : '#0F172A' }}
        >
          {title}
        </Text>
        <NotificationBell onPress={onBell} />
      </View>
    </SafeAreaView>
  );
}

// Bottom quick-access bar: first 5 accessible primary tabs.
function MobileBottomBar({ canAccess, isDark, pendingCount }: { canAccess: (key: string) => boolean; isDark: boolean; pendingCount: number }) {
  const router = useRouter();
  const pathname = usePathname();

  const items = PRIMARY_TAB_ORDER
    .filter((name) => canAccess(`nav:${name}`))
    .slice(0, 5)
    .map((name) => NAV_ITEMS.find((n) => n.name === name)!)
    .filter(Boolean);

  return (
    <SafeAreaView
      edges={['bottom']}
      style={{
        flexDirection: 'row',
        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: isDark ? '#334155' : '#E2E8F0',
      }}
    >
      {items.map((item) => {
        const isActive = pathname.includes(`/${item.name}`);
        const color = isActive ? '#2563EB' : isDark ? '#94A3B8' : '#64748B';
        return (
          <Pressable
            key={item.name}
            onPress={() => router.push(`/(app)/(tabs)/${item.name}` as any)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 2, cursor: 'pointer' } as any}
          >
            <View>
              <item.Icon size={22} color={color} />
              {item.name === 'tasks' && pendingCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    backgroundColor: '#DC2626',
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700', lineHeight: 16 }}>{pendingCount}</Text>
                </View>
              )}
            </View>
            <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: isActive ? '700' : '500', color }}>
              {item.title}
            </Text>
          </Pressable>
        );
      })}
    </SafeAreaView>
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

  // Below 1200px on web we render the mobile "app-like" chrome
  // (top bar + Drawer + bottom bar). At/above 1200px, and on native,
  // NOTHING here changes — the original layouts render verbatim.
  const { isMobile } = useBreakpoint();
  const isMobileWeb = isWeb && isMobile;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabs = (
    <Tabs
      tabBar={isWeb ? (isMobile ? () => <MobileBottomBar canAccess={canAccess} isDark={isDark} pendingCount={pendingCount} /> : () => null) : undefined}
      screenOptions={{
        // On mobile web the MobileTopBar replaces the router header
        // for every screen. `undefined` leaves desktop/native behavior
        // exactly as it was (per-screen options still win).
        headerShown: isMobileWeb ? false : undefined,
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
        name="timesheet-management"
        options={{
          title: 'Timesheet Management',
          ...(isWeb && { headerShown: false }),
          tabBarIcon: ({ color, size }) => <Briefcase size={size} color={color} />,
          href: canAccess('nav:timesheet-management') ? undefined : null,
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

  // ── Mobile web (< 1200px): top bar + slide-in Drawer + bottom bar ──
  if (isMobileWeb) {
    return (
      <View style={{ flex: 1 }}>
        <MobileTopBar
          isDark={isDark}
          onMenu={() => setDrawerOpen(true)}
          onBell={() => router.push('/(app)/notifications' as any)}
        />
        <View style={{ flex: 1 }}>{tabs}</View>
        <MuiDrawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{ sx: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', backgroundImage: 'none' } }}
        >
          <WebSidebar
            user={user}
            canAccess={canAccess}
            isDark={isDark}
            pendingCount={pendingCount}
            unreadCount={unreadCount}
            onNavigate={() => setDrawerOpen(false)}
          />
        </MuiDrawer>
      </View>
    );
  }

  // ── Desktop web (≥ 1200px): the original fixed-sidebar layout ──────
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
