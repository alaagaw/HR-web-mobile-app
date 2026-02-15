import { View, Text } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { Button } from './button';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700 items-center justify-center mb-4">
        <Inbox size={32} color="#94A3B8" />
      </View>
      <Text className="text-lg font-semibold text-text-primary dark:text-white text-center mb-1">{title}</Text>
      {description && (
        <Text className="text-sm text-text-muted dark:text-slate-400 text-center mb-6">{description}</Text>
      )}
      {actionLabel && onAction && (
        <Button variant="secondary" onPress={onAction}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
