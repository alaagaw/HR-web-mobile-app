import { View, Text, Pressable, ScrollView } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Badge } from '@/components/ui/badge';
import { getStatusLabel, getStatusVariant, getLeaveTypeLabel, getLeaveTypeVariant } from '@/lib/state-machine';
import { formatDateRange, formatHours, formatPendingSince } from '@/lib/utils';
import { LeaveStatus } from '@/types/enums';
import type { LeaveRequest } from '@/types/models';

interface RequestTableProps {
  data: LeaveRequest[];
  onRowPress?: (request: LeaveRequest) => void;
  showEmployee?: boolean;
  /** Highlight rows assigned to this userId */
  highlightAssignee?: string;
}

// Column flex values for proportional sizing
const COL = {
  caseNum: { flex: 1.4, minWidth: 140 },
  employee: { flex: 1.6, minWidth: 160 },
  type: { flex: 0.9, minWidth: 100 },
  dates: { flex: 1.6, minWidth: 170 },
  hours: { flex: 0.7, minWidth: 80 },
  status: { flex: 1.4, minWidth: 150 },
  pending: { flex: 1.6, minWidth: 160 },
};

export function RequestTable({ data, onRowPress, showEmployee = false, highlightAssignee }: RequestTableProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="flex-row bg-gray-50 dark:bg-slate-800/80 border-b-2 border-border dark:border-slate-600 px-5 py-3">
        <View style={COL.caseNum}>
          <Text className="text-xs font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider">Case #</Text>
        </View>
        {showEmployee && (
          <View style={COL.employee}>
            <Text className="text-xs font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider">Employee</Text>
          </View>
        )}
        <View style={COL.type}>
          <Text className="text-xs font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider">Type</Text>
        </View>
        <View style={COL.dates}>
          <Text className="text-xs font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider">Dates</Text>
        </View>
        <View style={{ ...COL.hours, alignItems: 'flex-end' as const }}>
          <Text className="text-xs font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider">Hours</Text>
        </View>
        <View style={{ ...COL.status, alignItems: 'center' as const }}>
          <Text className="text-xs font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider">Status</Text>
        </View>
        <View style={COL.pending}>
          <Text className="text-xs font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider">Pending With</Text>
        </View>
      </View>

      {/* Rows */}
      {data.map((request, index) => {
        const isAssignedToMe = highlightAssignee && request.current_assignee_id === highlightAssignee;
        const isPending = [
          LeaveStatus.PendingSupervisor,
          LeaveStatus.PendingManager,
          LeaveStatus.PendingHR,
          LeaveStatus.PendingHRDirector,
        ].includes(request.status);

        return (
          <Pressable
            key={request.id}
            onPress={() => onRowPress?.(request)}
            className={`flex-row items-center px-5 py-3.5 border-b border-border/40 dark:border-slate-700/40 ${
              isAssignedToMe
                ? 'bg-blue-50 dark:bg-blue-900/20'
                : index % 2 === 0
                  ? 'bg-white dark:bg-slate-900'
                  : 'bg-gray-50/60 dark:bg-slate-800/40'
            }`}
            style={({ pressed }: { pressed: boolean }) => ({
              opacity: pressed ? 0.7 : 1,
              cursor: 'pointer',
            }) as any}
          >
            {/* Case # */}
            <View style={COL.caseNum}>
              <Text className="text-sm font-medium text-primary" numberOfLines={1}>
                {request.case_number}
              </Text>
            </View>

            {/* Employee */}
            {showEmployee && (
              <View style={COL.employee}>
                <Text className="text-sm text-text-primary dark:text-white" numberOfLines={1}>
                  {request.employee?.full_name || '—'}
                </Text>
                {request.employee?.department && (
                  <Text className="text-xs text-text-muted dark:text-slate-500 mt-0.5" numberOfLines={1}>
                    {request.employee.department}
                  </Text>
                )}
              </View>
            )}

            {/* Type */}
            <View style={COL.type}>
              <Badge variant={getLeaveTypeVariant(request.leave_type)}>
                {getLeaveTypeLabel(request.leave_type)}
              </Badge>
            </View>

            {/* Dates */}
            <View style={COL.dates}>
              <Text className="text-sm text-text-primary dark:text-white" numberOfLines={1}>
                {formatDateRange(request.start_date, request.end_date)}
              </Text>
            </View>

            {/* Hours */}
            <View style={{ ...COL.hours, alignItems: 'flex-end' as const }}>
              <Text className="text-sm font-medium text-text-primary dark:text-white">
                {formatHours(request.requested_hours)}
              </Text>
            </View>

            {/* Status */}
            <View style={{ ...COL.status, alignItems: 'center' as const }}>
              <Badge variant={getStatusVariant(request.status)}>
                {getStatusLabel(request.status)}
              </Badge>
            </View>

            {/* Pending With */}
            <View style={COL.pending}>
              {isPending ? (
                <>
                  <Text
                    className={`text-sm ${
                      isAssignedToMe ? 'text-primary font-semibold' : 'text-text-muted dark:text-slate-400'
                    }`}
                    numberOfLines={1}
                  >
                    {isAssignedToMe ? 'You' : request.current_assignee?.full_name || request.current_assignee_role || '—'}
                  </Text>
                  {request.pending_since && (
                    <Text className="text-xs text-text-light dark:text-slate-500 mt-0.5">
                      {formatPendingSince(request.pending_since)}
                    </Text>
                  )}
                </>
              ) : (
                <Text className="text-sm text-text-light dark:text-slate-500">—</Text>
              )}
            </View>
          </Pressable>
        );
      })}

      {/* Empty state */}
      {data.length === 0 && (
        <View className="py-16 items-center">
          <Text className="text-sm text-text-muted dark:text-slate-400">No requests found</Text>
        </View>
      )}
    </ScrollView>
  );
}
