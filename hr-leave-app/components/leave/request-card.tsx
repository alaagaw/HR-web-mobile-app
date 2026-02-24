import { View, Text, Pressable } from 'react-native';
import { Clock, ChevronRight, CheckCircle, ArrowRight } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getStatusLabel, getStatusVariant, getRemainingApprovalSteps, getLeaveTypeLabel, getLeaveTypeVariant } from '@/lib/state-machine';
import { formatDateRange, formatPendingSince, formatHours } from '@/lib/utils';
import type { LeaveRequest } from '@/types/models';
import { LeaveStatus, LeaveType } from '@/types/enums';

interface RequestCardProps {
  request: LeaveRequest;
  onPress?: () => void;
  showEmployee?: boolean;
  /** When set, highlights "Waiting for you" if assignee matches this userId */
  highlightAssignee?: string;
}

export function RequestCard({ request, onPress, showEmployee = false, highlightAssignee }: RequestCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const isPending = [
    LeaveStatus.PendingSupervisor,
    LeaveStatus.PendingManager,
    LeaveStatus.PendingHR,
    LeaveStatus.PendingHRDirector,
  ].includes(request.status);

  const isAssignedToMe = highlightAssignee && request.current_assignee_id === highlightAssignee;
  const isApproved = request.status === LeaveStatus.Approved;
  const isRejected = request.status === LeaveStatus.Rejected;

  // Get remaining approval steps
  const remainingSteps = isPending
    ? getRemainingApprovalSteps(request.status, request.leave_type as LeaveType, request.emergency_number)
    : [];

  return (
    <Pressable onPress={onPress}>
      <Card className={`mb-3 ${isAssignedToMe ? 'border-primary' : ''}`}>
        {/* Top row: case number + badge */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-text-primary dark:text-white">{request.case_number}</Text>
            <Badge variant={getLeaveTypeVariant(request.leave_type)}>
              {getLeaveTypeLabel(request.leave_type)}
            </Badge>
          </View>
          <Badge variant={getStatusVariant(request.status)}>
            {getStatusLabel(request.status)}
          </Badge>
        </View>

        {/* Employee name (for approver views) */}
        {showEmployee && request.employee && (
          <Text className="text-sm text-text-muted dark:text-slate-400 mb-1">
            {request.employee.full_name} {request.employee.department ? `- ${request.employee.department}` : ''}
          </Text>
        )}

        {/* Dates + hours */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm text-text-primary dark:text-white">
            {formatDateRange(request.start_date, request.end_date)}
          </Text>
          <Text className="text-sm font-medium text-text-primary dark:text-white">
            {formatHours(request.requested_hours)}
          </Text>
        </View>

        {/* Excess warning */}
        {request.has_excess && (
          <View className="bg-warning-light rounded-lg px-3 py-1.5 mb-2">
            <Text className="text-xs text-yellow-800">
              Excess: {formatHours(request.excess_hours)} pending HR determination
            </Text>
          </View>
        )}

        {/* Pending info */}
        {isPending && (
          <View className="flex-row items-center gap-1.5 mt-1">
            <Clock size={14} color={isAssignedToMe ? '#2563EB' : '#64748B'} />
            <Text className={`text-xs ${isAssignedToMe ? 'text-primary font-semibold' : 'text-text-muted dark:text-slate-400'}`}>
              {isAssignedToMe
                ? 'Waiting for you'
                : `Waiting for ${request.current_assignee?.full_name || request.current_assignee_role}`}
              {request.pending_since ? ` - ${formatPendingSince(request.pending_since)}` : ''}
            </Text>
          </View>
        )}

        {/* Remaining approval chain */}
        {isPending && remainingSteps.length > 1 && (
          <View className="flex-row items-center gap-1 mt-1.5 ml-5">
            <ArrowRight size={10} color="#94A3B8" />
            <Text className="text-xs text-text-muted dark:text-slate-500">
              {remainingSteps.length === 1
                ? 'Last step'
                : `${remainingSteps.length - 1} more step${remainingSteps.length - 1 > 1 ? 's' : ''}: ${remainingSteps.slice(1).join(' → ')}`}
            </Text>
          </View>
        )}

        {isPending && remainingSteps.length === 1 && (
          <View className="flex-row items-center gap-1 mt-1.5 ml-5">
            <CheckCircle size={10} color="#16A34A" />
            <Text className="text-xs text-success">Last approval step</Text>
          </View>
        )}

        {/* Approved/Rejected info for chain view */}
        {isApproved && highlightAssignee && (
          <View className="flex-row items-center gap-1.5 mt-1">
            <CheckCircle size={14} color="#16A34A" />
            <Text className="text-xs text-success font-medium">Approved</Text>
          </View>
        )}
        {isRejected && highlightAssignee && (
          <View className="flex-row items-center gap-1.5 mt-1">
            <Clock size={14} color="#DC2626" />
            <Text className="text-xs text-error font-medium">Rejected</Text>
          </View>
        )}

        {/* Chevron for navigation hint */}
        {onPress && (
          <View className="absolute right-4 top-1/2">
            <ChevronRight size={18} color={isDark ? '#64748B' : '#94A3B8'} />
          </View>
        )}
      </Card>
    </Pressable>
  );
}
