import { useEffect } from 'react';
import { View, Text, ScrollView, Alert, Pressable, Image, Linking, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Download, ImageIcon } from 'lucide-react-native';

import { ScreenHeader } from '@/components/layout/screen-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BalanceCard } from '@/components/leave/balance-card';
import { RequestTimeline } from '@/components/leave/request-timeline';
import { ApprovalActions } from '@/components/leave/approval-actions';
import { ExcessDeterminationPanel } from '@/components/leave/excess-determination';

import { useAuth } from '@/hooks/use-auth';
import { useLeaveRequest } from '@/hooks/use-leave-request';
import { useApprovals } from '@/hooks/use-approvals';
import { useBalance } from '@/hooks/use-balance';
import { getStatusLabel, getStatusVariant, canTransition, getRemainingApprovalSteps } from '@/lib/state-machine';
import { formatDateRange, formatHours, formatDaysHours, formatFileSize } from '@/lib/utils';
import { computeBalanceImpact } from '@/lib/hours-calculator';
import { LeaveStatus, LeaveType, ExcessDetermination, Role } from '@/types/enums';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { currentRequest, fetchRequestById, cancelRequest } = useLeaveRequest();
  const { approve, reject, determineExcess } = useApprovals();
  const { balances, fetchBalance } = useBalance();

  useEffect(() => {
    if (id) fetchRequestById(id);
    if (currentRequest?.employee_id) fetchBalance(currentRequest.employee_id);
  }, [id]);

  if (!currentRequest || !user) return null;

  const req = currentRequest;
  const isAssignee = req.current_assignee_id === user.id;
  const isEmployee = req.employee_id === user.id;
  const isHR = user.role === Role.HR || user.role === Role.HRDirector;
  const canCancel = canTransition(req.status, 'cancel', user.role);
  const showApprovalActions = isAssignee && canTransition(req.status, 'approve', user.role);
  const showExcessDetermination =
    isHR &&
    req.status === LeaveStatus.Approved &&
    req.has_excess &&
    req.excess_determination === ExcessDetermination.Pending;

  const workdayHours = user.workday_hours || 8;
  const balance = balances.find((b) => b.leave_type === req.leave_type);
  const impact = balance
    ? computeBalanceImpact(balance.balance_hours, req.requested_hours, workdayHours)
    : null;

  const handleApprove = async (comment?: string) => {
    await approve(req.id, user.id, comment);
    fetchRequestById(req.id);
  };

  const handleReject = async (comment: string) => {
    await reject(req.id, user.id, comment);
    fetchRequestById(req.id);
  };

  const handleCancel = () => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          await cancelRequest(req.id, 'Cancelled by employee');
          router.back();
        },
      },
    ]);
  };

  const handleExcessDetermination = async (determination: ExcessDetermination, comment?: string) => {
    await determineExcess(req.id, user.id, determination, comment);
    fetchRequestById(req.id);
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900" edges={['top']}>
      <ScreenHeader title={req.case_number} />

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 16 }}>
        {/* Status + Type header */}
        <View className="flex-row items-center gap-2 mb-4">
          <Badge variant={getStatusVariant(req.status)}>
            {getStatusLabel(req.status)}
          </Badge>
          <Badge variant={req.is_emergency ? 'error' : 'info'}>
            {req.is_emergency ? 'Emergency' : 'PTO'}
          </Badge>
          {req.emergency_number && (
            <Badge variant="warning">{`Emergency #${req.emergency_number}`}</Badge>
          )}
        </View>

        {/* Employee info (for approvers) */}
        {!isEmployee && req.employee && (
          <Card className="mb-4">
            <Text className="text-sm font-semibold text-text-primary dark:text-white">
              {req.employee.full_name}
            </Text>
            <Text className="text-xs text-text-muted dark:text-slate-400">{req.employee.department}</Text>
          </Card>
        )}

        {/* Request details */}
        <Card className="mb-4">
          <DetailRow label="Dates" value={formatDateRange(req.start_date, req.end_date)} />
          <DetailRow label="Requested" value={formatHours(req.requested_hours)} sub={formatDaysHours(req.requested_hours, workdayHours)} />
          <DetailRow label="Paid Hours" value={formatHours(req.paid_hours)} sub={formatDaysHours(req.paid_hours, workdayHours)} />
          {req.has_excess && (
            <DetailRow label="Excess" value={formatHours(req.excess_hours)} sub={formatDaysHours(req.excess_hours, workdayHours)} highlight />
          )}
          {req.employee_comment && (
            <DetailRow label="Comment" value={req.employee_comment} />
          )}
          {req.emergency_reason && (
            <DetailRow label="Emergency Reason" value={req.emergency_reason} />
          )}
        </Card>

        {/* Balance impact */}
        {impact && (
          <BalanceCard impact={impact} workdayHours={workdayHours} showRequestColumn={false} />
        )}

        {/* Excess determination (HR) */}
        {showExcessDetermination && (
          <ExcessDeterminationPanel
            excessHours={req.excess_hours}
            onDetermine={handleExcessDetermination}
          />
        )}

        {/* Attachments */}
        {req.attachments && req.attachments.length > 0 && (
          <Card className="mb-4">
            <Text className="text-sm font-semibold text-text-primary dark:text-white mb-2">Attachments</Text>
            {req.attachments.map((att) => {
              const isImg = att.file_type?.startsWith('image/');
              return (
                <Pressable
                  key={att.id}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      window.open(att.file_url, '_blank');
                    } else {
                      Linking.openURL(att.file_url);
                    }
                  }}
                  className="py-2 border-b border-border/50 dark:border-slate-700/50"
                >
                  {/* Image thumbnail preview */}
                  {isImg && (
                    <Image
                      source={{ uri: att.file_url }}
                      style={{ width: '100%', height: 180, borderRadius: 8, marginBottom: 8 }}
                      resizeMode="cover"
                    />
                  )}
                  <View className="flex-row items-center">
                    {isImg ? (
                      <ImageIcon size={16} color="#2563EB" style={{ marginRight: 8 }} />
                    ) : (
                      <FileText size={16} color="#2563EB" style={{ marginRight: 8 }} />
                    )}
                    <View className="flex-1">
                      <Text className="text-sm text-primary dark:text-blue-400">{att.file_name}</Text>
                      <Text className="text-xs text-text-muted dark:text-slate-400">{formatFileSize(att.file_size)}</Text>
                    </View>
                    <Download size={16} color="#64748B" />
                  </View>
                </Pressable>
              );
            })}
          </Card>
        )}

        {/* Timeline */}
        {req.history && req.history.length > 0 && (
          <Card className="mb-4">
            <Text className="text-sm font-semibold text-text-primary dark:text-white mb-3">Timeline</Text>
            <RequestTimeline
              history={req.history}
              pendingSince={req.pending_since}
              currentAssigneeName={req.current_assignee?.full_name}
              remainingSteps={getRemainingApprovalSteps(req.status, req.leave_type as LeaveType, req.emergency_number)}
            />
          </Card>
        )}

        {/* Approval actions */}
        {showApprovalActions && (
          <ApprovalActions onApprove={handleApprove} onReject={handleReject} />
        )}

        {/* Cancel button */}
        {isEmployee && canCancel && (
          <View className="mt-4 mb-8">
            <Button variant="destructive" onPress={handleCancel} fullWidth>
              Cancel Request
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, sub, highlight = false }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <View className="flex-row items-start justify-between py-2 border-b border-border/50 dark:border-slate-700/50 last:border-b-0">
      <Text className="text-sm text-text-muted dark:text-slate-400 flex-shrink-0 mr-4">{label}</Text>
      <View className="items-end">
        <Text className={`text-sm ${highlight ? 'text-warning font-semibold' : 'text-text-primary dark:text-white'}`}>
          {value}
        </Text>
        {sub && (
          <Text className={`text-xs ${highlight ? 'text-warning' : 'text-text-muted dark:text-slate-400'}`}>
            {sub}
          </Text>
        )}
      </View>
    </View>
  );
}
