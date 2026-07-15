import { View, Text, Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  /** Override the back action. Defaults to going back, or to the
   *  dashboard when there is no history to pop (e.g. on web when the
   *  screen was loaded/refreshed directly — `router.back()` is a no-op). */
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({ title, showBack = true, onBack, rightAction }: ScreenHeaderProps) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#E2E8F0' : '#0F172A';

  const handleBack =
    onBack ??
    (() => {
      if (router.canGoBack()) router.back();
      else router.replace('/(app)/(tabs)/dashboard' as any);
    });

  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-surface dark:bg-slate-900 border-b border-border dark:border-slate-700">
      {showBack ? (
        <Pressable onPress={handleBack} className="flex-row items-center gap-3 flex-1 active:opacity-70">
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
