import { View, Text } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { formatHours, formatDaysHours } from '@/lib/utils';
import { DEFAULT_WORKDAY_HOURS } from '@/lib/constants';

interface ExcessBannerProps {
  excessHours: number;
  excessDays: number;
}

export function ExcessBanner({ excessHours, excessDays }: ExcessBannerProps) {
  if (excessHours <= 0) return null;

  return (
    <View className="bg-warning-light border border-yellow-200 rounded-xl px-4 py-3 flex-row items-start mb-4">
      <AlertTriangle size={20} color="#92400E" style={{ marginTop: 2, marginRight: 10 }} />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-yellow-800">
          Excess: {formatHours(excessHours)} ({formatDaysHours(excessHours, DEFAULT_WORKDAY_HOURS)})
        </Text>
        <Text className="text-xs text-yellow-700 mt-1">
          This request will exceed your balance. HR will determine the excess status
          (unpaid by default) after the approval chain completes.
        </Text>
      </View>
    </View>
  );
}
