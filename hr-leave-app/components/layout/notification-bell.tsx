import { Pressable, View, Text } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useNotificationStore } from '@/stores/notification-store';

interface NotificationBellProps {
  onPress?: () => void;
}

export function NotificationBell({ onPress }: NotificationBellProps) {
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <Pressable onPress={onPress} className="w-10 h-10 items-center justify-center">
      <Bell size={22} color="#0F172A" />
      {unreadCount > 0 && (
        <View className="absolute -top-0.5 -right-0.5 bg-error rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
          <Text className="text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
