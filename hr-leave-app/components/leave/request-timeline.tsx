import { View, Text } from 'react-native';
import { Check, X, Clock, ArrowRight, Zap, AlertTriangle } from 'lucide-react-native';
import type { HistoryEntry } from '@/types/models';
import { HistoryAction } from '@/types/enums';
import { formatDate, formatPendingSince, getRoleLabel } from '@/lib/utils';
import { Role } from '@/types/enums';

interface RequestTimelineProps {
  history: HistoryEntry[];
  pendingSince?: string | null;
  currentAssigneeName?: string;
  /** Remaining approval steps after the current one, e.g. ['HR'] */
  remainingSteps?: string[];
}

function getActionIcon(action: HistoryAction) {
  switch (action) {
    case HistoryAction.Approved:
    case HistoryAction.AutoApproved:
      return { Icon: Check, color: '#16A34A', bg: 'bg-success-light' };
    case HistoryAction.Rejected:
      return { Icon: X, color: '#DC2626', bg: 'bg-error-light' };
    case HistoryAction.Submitted:
    case HistoryAction.Created:
      return { Icon: ArrowRight, color: '#2563EB', bg: 'bg-primary-light' };
    case HistoryAction.Bypassed:
      return { Icon: Zap, color: '#F59E0B', bg: 'bg-warning-light' };
    case HistoryAction.Cancelled:
      return { Icon: X, color: '#64748B', bg: 'bg-gray-100' };
    default:
      return { Icon: Clock, color: '#64748B', bg: 'bg-gray-100' };
  }
}

function getActionLabel(action: HistoryAction): string {
  const labels: Record<string, string> = {
    [HistoryAction.Created]: 'Request Created',
    [HistoryAction.Submitted]: 'Submitted for Approval',
    [HistoryAction.Approved]: 'Approved',
    [HistoryAction.AutoApproved]: 'Auto-Approved',
    [HistoryAction.Rejected]: 'Rejected',
    [HistoryAction.Commented]: 'Comment Added',
    [HistoryAction.Reassigned]: 'Reassigned',
    [HistoryAction.Bypassed]: 'Bypassed by HR',
    [HistoryAction.Cancelled]: 'Cancelled',
    [HistoryAction.ExcessDetermined]: 'Excess Determined',
    [HistoryAction.AttachmentAdded]: 'Attachment Added',
    [HistoryAction.AttachmentRemoved]: 'Attachment Removed',
    [HistoryAction.ReturnedForRevision]: 'Returned for Revision',
  };
  return labels[action] || action;
}

export function RequestTimeline({ history, pendingSince, currentAssigneeName, remainingSteps = [] }: RequestTimelineProps) {
  return (
    <View className="pl-2">
      {history.map((entry, index) => {
        const { Icon, color, bg } = getActionIcon(entry.action);
        const isLast = index === history.length - 1;

        return (
          <View key={entry.id} className="flex-row mb-0">
            {/* Timeline line + dot */}
            <View className="items-center mr-3">
              <View className={`w-8 h-8 rounded-full ${bg} items-center justify-center`}>
                <Icon size={16} color={color} />
              </View>
              {!isLast && <View className="w-0.5 flex-1 bg-border dark:bg-slate-600 my-1" />}
            </View>

            {/* Content */}
            <View className={`flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
              <Text className="text-sm font-medium text-text-primary dark:text-white">
                {getActionLabel(entry.action)}
              </Text>
              <Text className="text-xs text-text-muted dark:text-slate-400 mt-0.5">
                {entry.performer?.full_name || 'System'} - {getRoleLabel(entry.performer_role as Role)}
              </Text>
              {entry.comment && (
                <View className="bg-gray-50 dark:bg-slate-700 rounded-lg px-3 py-2 mt-1.5">
                  <Text className="text-xs text-text-muted dark:text-slate-400 italic">"{entry.comment}"</Text>
                </View>
              )}
              <Text className="text-xs text-text-light mt-1">
                {formatDate(entry.created_at)}
              </Text>
            </View>
          </View>
        );
      })}

      {/* Pending indicator */}
      {pendingSince && currentAssigneeName && (
        <View className="flex-row">
          <View className="items-center mr-3">
            <View className="w-8 h-8 rounded-full bg-warning-light items-center justify-center">
              <Clock size={16} color="#F59E0B" />
            </View>
            {remainingSteps.length > 1 && <View className="w-0.5 flex-1 bg-border dark:bg-slate-600 my-1" />}
          </View>
          <View className="flex-1 pb-4">
            <Text className="text-sm font-medium text-warning">
              Waiting for {currentAssigneeName}
            </Text>
            <Text className="text-xs text-text-muted dark:text-slate-400 mt-0.5">
              {formatPendingSince(pendingSince)}
            </Text>
          </View>
        </View>
      )}

      {/* Remaining approval steps (after current) */}
      {remainingSteps.length > 1 && remainingSteps.slice(1).map((step, index) => {
        const isLast = index === remainingSteps.length - 2;
        return (
          <View key={step} className="flex-row">
            <View className="items-center mr-3">
              <View className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 items-center justify-center border border-dashed border-gray-300 dark:border-slate-500">
                <Clock size={14} color="#94A3B8" />
              </View>
              {!isLast && <View className="w-0.5 flex-1 bg-border dark:bg-slate-600 my-1" />}
            </View>
            <View className={`flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
              <Text className="text-sm text-text-muted dark:text-slate-400">
                {step}
              </Text>
              <Text className="text-xs text-text-light dark:text-slate-500 mt-0.5">
                Upcoming
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
