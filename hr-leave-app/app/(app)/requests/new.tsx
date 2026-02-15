import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';

import { ScreenHeader } from '@/components/layout/screen-header';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Toggle } from '@/components/ui/toggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Banner } from '@/components/ui/banner';
import { FileUpload } from '@/components/ui/file-upload';
import { BalanceCard } from '@/components/leave/balance-card';
import { ExcessBanner } from '@/components/leave/excess-banner';
import { EmergencyCounter } from '@/components/leave/emergency-counter';

import { useAuth } from '@/hooks/use-auth';
import { useBalance } from '@/hooks/use-balance';
import { useLeaveRequest } from '@/hooks/use-leave-request';
import { attachmentService } from '@/services';
import { leaveRequestSchema, type LeaveRequestFormData } from '@/lib/validators';
import { computeRequestedHours, computeBalanceImpact } from '@/lib/hours-calculator';
import { meetsAdvanceNotice } from '@/lib/utils';
import { getEmergencyTier } from '@/lib/state-machine';
import { LeaveType, EmergencyTier } from '@/types/enums';
import { MAX_COMMENT_LENGTH } from '@/lib/constants';
import type { BalanceImpact } from '@/types/models';

export default function NewRequestScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { balances, emergencyCount, fetchBalance, fetchEmergencyCount } = useBalance();
  const { createAndSubmit, loading: submitLoading } = useLeaveRequest();

  const [files, setFiles] = useState<any[]>([]);
  const [impact, setImpact] = useState<BalanceImpact | null>(null);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leave_type: LeaveType.PTO,
      start_date: '',
      end_date: '',
      is_full_day: true,
      start_time: null,
      end_time: null,
      include_weekends: false,
      employee_comment: null,
      emergency_reason: null,
    },
  });

  const watchedType = watch('leave_type');
  const watchedStartDate = watch('start_date');
  const watchedEndDate = watch('end_date');
  const watchedIsFullDay = watch('is_full_day');
  const watchedStartTime = watch('start_time');
  const watchedEndTime = watch('end_time');
  const watchedIncludeWeekends = watch('include_weekends');

  const isEmergency = watchedType === LeaveType.Emergency;
  const workdayHours = user?.workday_hours || 8;

  useEffect(() => {
    if (user) {
      fetchBalance(user.id);
      fetchEmergencyCount(user.id);
    }
  }, [user?.id]);

  // Recompute balance impact whenever form fields change
  useEffect(() => {
    if (!watchedStartDate || !watchedEndDate) {
      setImpact(null);
      return;
    }

    const hoursResult = computeRequestedHours({
      start_date: watchedStartDate,
      end_date: watchedEndDate,
      start_time: watchedStartTime,
      end_time: watchedEndTime,
      include_weekends: watchedIncludeWeekends,
      is_full_day: watchedIsFullDay,
      workday_hours: workdayHours,
    });

    const balance = balances.find((b) => b.leave_type === watchedType);
    const available = balance?.balance_hours ?? 0;

    setImpact(computeBalanceImpact(available, hoursResult.requested_hours, workdayHours));
  }, [watchedStartDate, watchedEndDate, watchedStartTime, watchedEndTime, watchedIsFullDay, watchedIncludeWeekends, watchedType, balances]);

  const emergencyTier = getEmergencyTier(emergencyCount);
  const emergencyBlocked = isEmergency && emergencyTier === EmergencyTier.Blocked;
  const showAdvanceNotice = watchedStartDate && !meetsAdvanceNotice(watchedStartDate) && !isEmergency;

  const onSubmit = async (data: LeaveRequestFormData) => {
    if (!user) return;
    if (emergencyBlocked) return;

    try {
      const submitted = await createAndSubmit(user.id, {
        leave_type: data.leave_type,
        start_date: data.start_date,
        end_date: data.end_date,
        start_time: data.start_time,
        end_time: data.end_time,
        include_weekends: data.include_weekends,
        is_full_day: data.is_full_day,
        employee_comment: data.employee_comment,
        emergency_reason: data.emergency_reason,
      });

      // Upload attachments in background — don't block navigation
      if (files.length > 0 && submitted) {
        Promise.all(
          files.map((file) => attachmentService.uploadAttachment(submitted.id, file, user.id))
        ).catch((uploadErr) => {
          console.warn('Attachment upload failed:', uploadErr.message);
        });
      }

      router.replace('/(app)/(tabs)/requests' as any);
    } catch (err: any) {
      console.error('Submit failed:', err.message);
      Alert.alert('Error', err.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900" edges={['top']}>
      <ScreenHeader title="Request Time Off" />

      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        <View className="py-4">
          {/* Advance notice warning */}
          {showAdvanceNotice && (
            <Banner variant="warning" className="mb-4">
              This request does not meet the minimum of 2 days advanced notice.
            </Banner>
          )}

          {/* Leave type */}
          <Controller
            control={control}
            name="leave_type"
            render={({ field: { onChange, value } }) => (
              <Select
                label="Request Type"
                options={[
                  { value: LeaveType.PTO, label: 'PTO / Vacation' },
                  { value: LeaveType.Emergency, label: 'Emergency Leave', description: 'Requires reason text' },
                ]}
                value={value}
                onValueChange={onChange}
                error={errors.leave_type?.message}
              />
            )}
          />

          {/* Emergency counter */}
          {isEmergency && <EmergencyCounter count={emergencyCount} />}

          {/* Date picker */}
          <Controller
            control={control}
            name="start_date"
            render={() => (
              <DatePicker
                label="Request Dates"
                startDate={watchedStartDate ? new Date(watchedStartDate) : null}
                endDate={watchedEndDate ? new Date(watchedEndDate) : null}
                onDateChange={(start, end) => {
                  if (start) setValue('start_date', format(start, 'yyyy-MM-dd'));
                  if (end) setValue('end_date', format(end, 'yyyy-MM-dd'));
                }}
                error={errors.start_date?.message || errors.end_date?.message}
              />
            )}
          />

          {/* Include weekends */}
          <Controller
            control={control}
            name="include_weekends"
            render={({ field: { onChange, value } }) => (
              <Toggle
                label="Do you want to include weekends?"
                value={value}
                onValueChange={onChange}
              />
            )}
          />

          {/* Full day toggle */}
          <Controller
            control={control}
            name="is_full_day"
            render={({ field: { onChange, value } }) => (
              <Toggle
                label="Do you want to request full days?"
                value={value}
                onValueChange={onChange}
                helper={value ? `${workdayHours} Hours Per Day` : undefined}
              />
            )}
          />

          {/* Partial day time pickers */}
          {!watchedIsFullDay && (
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="start_time"
                  render={({ field: { onChange, value } }) => (
                    <TimePicker
                      label="Start Time"
                      value={value}
                      onValueChange={onChange}
                      error={errors.start_time?.message}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="end_time"
                  render={({ field: { onChange, value } }) => (
                    <TimePicker
                      label="End Time"
                      value={value}
                      onValueChange={onChange}
                    />
                  )}
                />
              </View>
            </View>
          )}

          {/* Balance impact card */}
          <BalanceCard impact={impact} workdayHours={workdayHours} />

          {/* Excess banner */}
          {impact?.has_excess && (
            <ExcessBanner excessHours={impact.excess_hours} excessDays={impact.excess_days} />
          )}

          {/* Emergency reason */}
          {isEmergency && (
            <Controller
              control={control}
              name="emergency_reason"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Reason for Emergency (required)"
                  placeholder="Please explain the reason for this emergency leave..."
                  value={value || ''}
                  onChangeText={onChange}
                  error={errors.emergency_reason?.message}
                  multiline
                  numberOfLines={3}
                  maxLength={MAX_COMMENT_LENGTH}
                  style={{ minHeight: 80, textAlignVertical: 'top' }}
                />
              )}
            />
          )}

          {/* Comment */}
          <Controller
            control={control}
            name="employee_comment"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Add Comments (optional)"
                placeholder="Any additional notes..."
                value={value || ''}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
                maxLength={MAX_COMMENT_LENGTH}
                helper={`${(value || '').length}/${MAX_COMMENT_LENGTH} Characters Remaining`}
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />
            )}
          />

          {/* Attachments (emergency) */}
          {isEmergency && (
            <FileUpload
              label="Attachments (optional)"
              files={files}
              onFilesChange={setFiles}
            />
          )}

          {/* Submit */}
          <View className="flex-row gap-3 mt-4 mb-8">
            <View className="flex-1">
              <Button variant="secondary" onPress={() => router.back()} fullWidth>
                Cancel
              </Button>
            </View>
            <View className="flex-1">
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={submitLoading}
                disabled={emergencyBlocked}
                fullWidth
              >
                Submit
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
