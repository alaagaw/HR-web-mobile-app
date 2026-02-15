import { View, FlatList, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, CheckCheck, Clock, XCircle, ArrowRight, Shield } from 'lucide-react-native';
import { ScreenHeader } from '@/components/layout/screen-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationType } from '@/types/enums';
import { AppNotification } from '@/types/models';
import { formatDate } from '@/lib/utils';

function getNotificationIcon(type: string) {
  switch (type) {
    case NotificationType.RequestApproved:
      return <CheckCheck size={20} color="#16A34A" />;
    case NotificationType.RequestRejected:
      return <XCircle size={20} color="#DC2626" />;
    case NotificationType.ApprovalNeeded:
      return <Clock size={20} color="#F59E0B" />;
    case NotificationType.EmergencyAutoApproved:
      return <Shield size={20} color="#0EA5E9" />;
    case NotificationType.RequestBypassed:
      return <ArrowRight size={20} color="#8B5CF6" />;
    default:
      return <Bell size={20} color="#64748B" />;
  }
}

function getNotificationBg(type: string, isRead: boolean) {
  if (isRead) return 'bg-surface';
  switch (type) {
    case NotificationType.ApprovalNeeded:
      return 'bg-warning/5';
    case NotificationType.RequestRejected:
      return 'bg-error/5';
    default:
      return 'bg-primary-light';
  }
}

function NotificationItem({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const bgClass = getNotificationBg(notification.type, notification.is_read);

  return (
    <Pressable onPress={onPress} className="mb-2">
      <Card className={`${bgClass} ${!notification.is_read ? 'border-l-4 border-l-primary' : ''}`}>
        <View className="flex-row items-start gap-3 p-3">
          <View className="mt-0.5">{getNotificationIcon(notification.type)}</View>
          <View className="flex-1">
            <Text
              className={`text-sm ${!notification.is_read ? 'font-semibold text-text-primary' : 'font-medium text-text-muted'}`}
            >
              {notification.title}
            </Text>
            {notification.body ? (
              <Text className="text-xs text-text-muted mt-1" numberOfLines={2}>
                {notification.body}
              </Text>
            ) : null}
            <Text className="text-[10px] text-text-muted mt-1.5">
              {formatDate(notification.created_at)}
            </Text>
          </View>
          {!notification.is_read && (
            <View className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5" />
          )}
        </View>
      </Card>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { notifications, loading, markAsRead, markAllAsRead, fetchNotifications } =
    useNotifications(user?.id);

  const handlePress = async (notification: AppNotification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.reference_id) {
      router.push(`/(app)/requests/${notification.reference_id}` as any);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Notifications"
        rightAction={
          unreadCount > 0 ? (
            <Button variant="ghost" size="sm" onPress={markAllAsRead}>
              Mark all read
            </Button>
          ) : undefined
        }
      />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        onRefresh={fetchNotifications}
        refreshing={loading}
        renderItem={({ item }) => (
          <NotificationItem notification={item} onPress={() => handlePress(item)} />
        )}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="No notifications"
              description="You're all caught up! Notifications will appear here when there's activity on your requests."
            />
          ) : null
        }
      />
    </View>
  );
}
