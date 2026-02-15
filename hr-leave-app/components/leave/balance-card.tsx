import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { formatDaysHours } from '@/lib/utils';
import type { BalanceImpact } from '@/types/models';

interface BalanceCardProps {
  impact: BalanceImpact | null;
  workdayHours: number;
  showRequestColumn?: boolean;
}

export function BalanceCard({ impact, workdayHours, showRequestColumn = true }: BalanceCardProps) {
  const [showExplainer, setShowExplainer] = useState(false);

  if (!impact) return null;

  const availableColor = impact.available_hours <= 0 ? 'text-error' : 'text-text-primary dark:text-white';
  const remainingColor = impact.remaining_hours <= 0 ? 'text-error' : 'text-success';

  return (
    <Card className="mb-4">
      {/* Main stats row */}
      <View className="flex-row">
        <View className="flex-1 items-center py-2 border-r border-border dark:border-slate-700">
          <Text className="text-xs text-text-muted dark:text-slate-400 mb-1">Available</Text>
          <Text className={`text-xl font-bold ${availableColor}`}>
            {impact.available_hours.toFixed(2)}h
          </Text>
          <Text className={`text-xs ${impact.available_hours <= 0 ? 'text-error' : 'text-text-muted dark:text-slate-400'}`}>
            {formatDaysHours(impact.available_hours, workdayHours)}
          </Text>
        </View>

        {showRequestColumn && (
          <View className="flex-1 items-center py-2">
            <Text className="text-xs text-text-muted dark:text-slate-400 mb-1">Request Total</Text>
            <Text className="text-xl font-bold text-text-primary dark:text-white">
              {impact.requested_hours.toFixed(2)}h
            </Text>
            <Text className="text-xs text-text-muted dark:text-slate-400">
              {formatDaysHours(impact.requested_hours, workdayHours)}
            </Text>
          </View>
        )}
      </View>

      {/* Remaining after request */}
      {showRequestColumn && (
        <View className="border-t border-border dark:border-slate-700 mt-2 pt-2 px-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-text-muted dark:text-slate-400">Remaining After Request</Text>
            <View className="items-end">
              <Text className={`text-base font-bold ${remainingColor}`}>
                {impact.remaining_hours.toFixed(2)}h
              </Text>
              <Text className={`text-xs ${impact.remaining_hours <= 0 ? 'text-error' : 'text-text-muted dark:text-slate-400'}`}>
                {formatDaysHours(impact.remaining_hours, workdayHours)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* How is Available calculated? */}
      <Pressable
        onPress={() => setShowExplainer(!showExplainer)}
        className="flex-row items-center justify-center mt-2 gap-1"
      >
        <Text className="text-xs text-primary">How is Available calculated?</Text>
        {showExplainer ? (
          <ChevronUp size={14} color="#2563EB" />
        ) : (
          <ChevronDown size={14} color="#2563EB" />
        )}
      </Pressable>

      {showExplainer && (
        <View className="mt-2 bg-info-light dark:bg-slate-700 rounded-lg p-3">
          <Text className="text-xs text-text-muted dark:text-slate-400 leading-5">
            Available balance = Annual allocation - Used hours{'\n'}
            Used hours include all approved and pending leave requests.{'\n'}
            1 day = {workdayHours} hours based on your work schedule.
          </Text>
        </View>
      )}
    </Card>
  );
}
