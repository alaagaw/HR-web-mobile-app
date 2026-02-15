import { View, Text } from 'react-native';
import { Card } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react-native';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  valueClassName?: string;
  subtitleClassName?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = '#2563EB',
  iconBg = 'bg-primary-light',
  valueClassName,
  subtitleClassName,
}: StatsCardProps) {
  return (
    <Card className="flex-1">
      <View className="flex-row items-center gap-3">
        <View className={`w-10 h-10 rounded-xl ${iconBg} items-center justify-center`}>
          <Icon size={20} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-xs text-text-muted dark:text-slate-400">{title}</Text>
          <Text className={`text-xl font-bold ${valueClassName || 'text-text-primary dark:text-white'}`}>{value}</Text>
          {subtitle && <Text className={`text-xs ${subtitleClassName || 'text-text-muted dark:text-slate-400'}`}>{subtitle}</Text>}
        </View>
      </View>
    </Card>
  );
}
