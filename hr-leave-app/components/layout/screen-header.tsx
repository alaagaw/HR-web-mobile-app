import { View, Text, Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({ title, showBack = true, rightAction }: ScreenHeaderProps) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#E2E8F0' : '#0F172A';

  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-surface dark:bg-slate-900 border-b border-border dark:border-slate-700">
      {showBack ? (
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-3 flex-1 active:opacity-70">
          <View className="w-10 h-10 items-center justify-center rounded-full">
            <ArrowLeft size={22} color={iconColor} />
          </View>
          <Text className="text-lg font-semibold text-text-primary dark:text-white" numberOfLines={1}>
            {title}
          </Text>
        </Pressable>
      ) : (
        <View className="flex-row items-center gap-3 flex-1">
          <Text className="text-lg font-semibold text-text-primary dark:text-white" numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
      {rightAction && <View>{rightAction}</View>}
    </View>
  );
}
