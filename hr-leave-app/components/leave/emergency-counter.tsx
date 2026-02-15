import { View, Text } from 'react-native';
import { Zap } from 'lucide-react-native';
import { MAX_EMERGENCIES_PER_MONTH } from '@/lib/constants';

interface EmergencyCounterProps {
  count: number;
}

export function EmergencyCounter({ count }: EmergencyCounterProps) {
  const remaining = MAX_EMERGENCIES_PER_MONTH - count;
  const isBlocked = remaining <= 0;

  return (
    <View
      className={`rounded-xl px-4 py-3 flex-row items-center mb-4 ${
        isBlocked ? 'bg-error-light border border-red-200' : 'bg-info-light border border-blue-200'
      }`}
    >
      <Zap size={18} color={isBlocked ? '#DC2626' : '#0EA5E9'} style={{ marginRight: 10 }} />
      <View className="flex-1">
        {isBlocked ? (
          <Text className="text-sm font-medium text-red-800">
            Emergency limit reached ({count}/{MAX_EMERGENCIES_PER_MONTH} this month)
          </Text>
        ) : (
          <Text className="text-sm font-medium text-blue-800">
            Emergency leave {count}/{MAX_EMERGENCIES_PER_MONTH} used this month
          </Text>
        )}
        <Text className="text-xs text-text-muted mt-0.5">
          {isBlocked
            ? 'You cannot submit another emergency leave request this month.'
            : count === 0
            ? 'First emergency will be auto-approved.'
            : count === 1
            ? 'Next emergency requires manager approval.'
            : 'Next emergency requires manager + HR Director approval.'}
        </Text>
      </View>
    </View>
  );
}
