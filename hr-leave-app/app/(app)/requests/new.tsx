import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

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
import { meetsAdvanceNotice, formatDaysHours } from '@/lib/utils';
import { getEmergencyTier } from '@/lib/state-machine';
import { LeaveType, EmergencyTier } from '@/types/enums';
import { MAX_COMMENT_LENGTH } from '@/lib/constants';
import type { BalanceImpact } from '@/types/models';

const isWeb = Platform.OS === 'web';

// ─── Enterprise Design Tokens (matches dashboard) ───────────────────
const DT = {
  bgMain: '#0b1220',
  bgGradient: 'linear-gradient(180deg, #0b1220 0%, #0f172a 100%)',
  cardBg: '#111a2e',
  cardBorder: 'rgba(255,255,255,0.06)',
  cardShadow: '0 10px 30px rgba(0,0,0,0.35)',
  infoBg: 'rgba(59,130,246,0.15)',
  infoBorder: '#3b82f6',
  infoText: '#93c5fd',
  dangerBg: 'rgba(239,68,68,0.15)',
  dangerBorder: '#ef4444',
  dangerText: '#fca5a5',
  warningBg: 'rgba(245,158,11,0.15)',
  warningBorder: '#f59e0b',
  warningText: '#fcd34d',
  successBg: 'rgba(34,197,94,0.15)',
  successBorder: '#22c55e',
  successText: '#86efac',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accent: '#3b82f6',
  inputBg: 'rgba(255,255,255,0.04)',
  inputBorder: 'rgba(255,255,255,0.1)',
};

const LT = {
  bgMain: '#F8FAFC',
  cardBg: '#FFFFFF',
  cardBorder: '#E2E8F0',
  cardShadow: '0 4px 12px rgba(0,0,0,0.06)',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  accent: '#2563EB',
  inputBg: '#FFFFFF',
  inputBorder: '#E2E8F0',
};

function tk(isDark: boolean) {
  return isDark
    ? { ...DT }
    : { ...LT, infoBg: '#EFF6FF', infoBorder: '#3b82f6', infoText: '#2563EB', dangerBg: '#FEF2F2', dangerBorder: '#ef4444', dangerText: '#DC2626', warningBg: '#FFFBEB', warningBorder: '#f59e0b', warningText: '#D97706', successBg: '#F0FDF4', successBorder: '#22c55e', successText: '#16A34A' };
}

export default function NewRequestScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { balances, emergencyCount, fetchBalance, fetchEmergencyCount } = useBalance();
  const { createAndSubmit, loading: submitLoading } = useLeaveRequest();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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

  // ─── Date display helper ──────────────────────────────────────────
  const dateDisplay = watchedStartDate
    ? watchedEndDate && watchedStartDate !== watchedEndDate
      ? `${format(new Date(watchedStartDate), 'MMM d, yyyy')} — ${format(new Date(watchedEndDate), 'MMM d, yyyy')}`
      : format(new Date(watchedStartDate), 'MMMM d, yyyy')
    : 'No dates selected';

  // ─── Web Layout ───────────────────────────────────────────────────
  if (isWeb) {
    const t = tk(isDark);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* ─── Header Bar ─── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 28px',
            backgroundColor: isDark ? '#0b1220' : '#FFFFFF',
            borderBottom: `1px solid ${isDark ? DT.cardBorder : '#E2E8F0'}`,
            flexShrink: 0,
          }}
        >
          <div
            onClick={() => router.back()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            <ArrowLeft size={20} color={t.textPrimary} />
            <span style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
              Request Time Off
            </span>
          </div>

          {/* Selected date summary chip */}
          {watchedStartDate && (
            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 8,
                backgroundColor: isDark ? DT.infoBg : '#EFF6FF',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'transparent'}`,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? DT.infoText : '#2563EB' }}>
                {dateDisplay}
              </span>
              {impact && (
                <span style={{ fontSize: 12, color: t.textSecondary }}>
                  ({formatDaysHours(impact.requested_hours, workdayHours)})
                </span>
              )}
            </div>
          )}
        </div>

        {/* ─── Content ─── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto' as const,
            background: isDark ? DT.bgGradient : LT.bgMain,
            padding: 28,
          }}
        >
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            {/* Warnings */}
            {showAdvanceNotice && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 10,
                  marginBottom: 20,
                  backgroundColor: isDark ? DT.warningBg : '#FFFBEB',
                  border: `1px solid ${isDark ? 'rgba(245,158,11,0.25)' : '#FDE68A'}`,
                  fontSize: 13,
                  fontWeight: 500,
                  color: isDark ? DT.warningText : '#92400E',
                }}
              >
                This request does not meet the minimum of 2 days advanced notice.
              </div>
            )}

            {/* Two-column layout */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

              {/* ─── Left Column: Form Fields ─── */}
              <div
                style={{
                  flex: '1 1 55%',
                  backgroundColor: isDark ? DT.cardBg : LT.cardBg,
                  border: `1px solid ${isDark ? DT.cardBorder : LT.cardBorder}`,
                  borderRadius: 16,
                  boxShadow: isDark ? DT.cardShadow : LT.cardShadow,
                  padding: 28,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, marginBottom: 24 }}>
                  Leave Details
                </div>

                {/* Request Type */}
                <WebFormField label="Request Type">
                  <Controller
                    control={control}
                    name="leave_type"
                    render={({ field: { onChange, value } }) => (
                      <select
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 10,
                          border: `1px solid ${errors.leave_type ? '#ef4444' : isDark ? DT.inputBorder : LT.inputBorder}`,
                          backgroundColor: isDark ? DT.cardBg : LT.inputBg,
                          color: t.textPrimary,
                          fontSize: 14,
                          outline: 'none',
                          cursor: 'pointer',
                          appearance: 'auto' as any,
                        }}
                      >
                        <option value={LeaveType.PTO} style={{ backgroundColor: isDark ? DT.cardBg : '#FFFFFF', color: isDark ? DT.textPrimary : LT.textPrimary }}>PTO / Vacation</option>
                        <option value={LeaveType.Emergency} style={{ backgroundColor: isDark ? DT.cardBg : '#FFFFFF', color: isDark ? DT.textPrimary : LT.textPrimary }}>Emergency Leave</option>
                      </select>
                    )}
                  />
                </WebFormField>

                {isEmergency && <EmergencyCounter count={emergencyCount} />}

                {/* Date display (read-only on left, calendar on right) */}
                <WebFormField label="Selected Dates">
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: `1px solid ${errors.start_date || errors.end_date ? '#ef4444' : isDark ? DT.inputBorder : LT.inputBorder}`,
                      backgroundColor: isDark ? DT.inputBg : LT.inputBg,
                      fontSize: 14,
                      color: watchedStartDate ? t.textPrimary : t.textMuted,
                    }}
                  >
                    {dateDisplay}
                  </div>
                  {(errors.start_date || errors.end_date) && (
                    <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                      {errors.start_date?.message || errors.end_date?.message}
                    </div>
                  )}
                </WebFormField>

                {/* Options row */}
                <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                  <WebToggle
                    label="Include weekends?"
                    value={watchedIncludeWeekends}
                    onChange={(v) => setValue('include_weekends', v)}
                    isDark={isDark}
                    t={t}
                  />
                  <WebToggle
                    label="Full day request?"
                    value={watchedIsFullDay}
                    onChange={(v) => setValue('is_full_day', v)}
                    isDark={isDark}
                    t={t}
                    helper={watchedIsFullDay ? `${workdayHours}h/day` : undefined}
                  />
                </div>

                {/* Partial day time pickers */}
                {!watchedIsFullDay && (
                  <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                    <View style={{ flex: 1 }}>
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
                    <View style={{ flex: 1 }}>
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
                  </div>
                )}

                {/* Emergency reason */}
                {isEmergency && (
                  <WebFormField label="Reason for Emergency (required)">
                    <textarea
                      placeholder="Please explain the reason for this emergency leave..."
                      value={watch('emergency_reason') || ''}
                      onChange={(e) => setValue('emergency_reason', e.target.value)}
                      maxLength={MAX_COMMENT_LENGTH}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: `1px solid ${errors.emergency_reason ? '#ef4444' : isDark ? DT.inputBorder : LT.inputBorder}`,
                        backgroundColor: isDark ? DT.inputBg : LT.inputBg,
                        color: t.textPrimary,
                        fontSize: 14,
                        resize: 'vertical' as const,
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                    {errors.emergency_reason && (
                      <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                        {errors.emergency_reason.message}
                      </div>
                    )}
                  </WebFormField>
                )}

                {/* Comments */}
                <WebFormField label="Comments (optional)">
                  <textarea
                    placeholder="Any additional notes..."
                    value={watch('employee_comment') || ''}
                    onChange={(e) => setValue('employee_comment', e.target.value)}
                    maxLength={MAX_COMMENT_LENGTH}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: `1px solid ${isDark ? DT.inputBorder : LT.inputBorder}`,
                      backgroundColor: isDark ? DT.inputBg : LT.inputBg,
                      color: t.textPrimary,
                      fontSize: 14,
                      resize: 'vertical' as const,
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
                    {(watch('employee_comment') || '').length}/{MAX_COMMENT_LENGTH} characters
                  </div>
                </WebFormField>

                {/* Attachments */}
                {isEmergency && (
                  <FileUpload
                    label="Attachments (optional)"
                    files={files}
                    onFilesChange={setFiles}
                  />
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    style={{
                      flex: 1,
                      padding: '10px 20px',
                      borderRadius: 10,
                      border: `1px solid ${isDark ? DT.inputBorder : LT.inputBorder}`,
                      backgroundColor: 'transparent',
                      color: t.textPrimary,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit(onSubmit)}
                    disabled={submitLoading || emergencyBlocked}
                    style={{
                      flex: 1,
                      padding: '10px 20px',
                      borderRadius: 10,
                      border: 'none',
                      backgroundColor: (submitLoading || emergencyBlocked) ? '#64748B' : '#3b82f6',
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: (submitLoading || emergencyBlocked) ? 'not-allowed' : 'pointer',
                      opacity: (submitLoading || emergencyBlocked) ? 0.6 : 1,
                    }}
                  >
                    {submitLoading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>

              {/* ─── Right Column: Calendar + Balance ─── */}
              <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column' as const, gap: 20 }}>

                {/* Calendar card */}
                <div
                  style={{
                    backgroundColor: isDark ? DT.cardBg : LT.cardBg,
                    border: `1px solid ${isDark ? DT.cardBorder : LT.cardBorder}`,
                    borderRadius: 16,
                    boxShadow: isDark ? DT.cardShadow : LT.cardShadow,
                    padding: 24,
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, marginBottom: 16 }}>
                    Select Dates
                  </div>

                  <Controller
                    control={control}
                    name="start_date"
                    render={() => (
                      <DatePicker
                        inline
                        startDate={watchedStartDate ? new Date(watchedStartDate) : null}
                        endDate={watchedEndDate ? new Date(watchedEndDate) : null}
                        onDateChange={(start, end) => {
                          if (start) setValue('start_date', format(start, 'yyyy-MM-dd'));
                          if (end) setValue('end_date', format(end, 'yyyy-MM-dd'));
                        }}
                        error={errors.start_date?.message || errors.end_date?.message}
                        includeWeekends={watchedIncludeWeekends}
                      />
                    )}
                  />
                </div>

                {/* Balance impact card */}
                {impact && (
                  <div
                    style={{
                      backgroundColor: isDark ? DT.cardBg : LT.cardBg,
                      border: `1px solid ${isDark ? DT.cardBorder : LT.cardBorder}`,
                      borderRadius: 16,
                      boxShadow: isDark ? DT.cardShadow : LT.cardShadow,
                      padding: 24,
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary, marginBottom: 16 }}>
                      Balance Impact
                    </div>

                    {/* Stat row */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      <WebBalanceStat
                        label="Available"
                        hours={impact.available_hours}
                        days={formatDaysHours(impact.available_hours, workdayHours)}
                        color={impact.available_hours <= 0 ? (isDark ? DT.dangerText : '#DC2626') : (isDark ? DT.infoText : '#2563EB')}
                        bg={impact.available_hours <= 0 ? (isDark ? DT.dangerBg : '#FEF2F2') : (isDark ? DT.infoBg : '#EFF6FF')}
                        isDark={isDark}
                      />
                      <WebBalanceStat
                        label="Requesting"
                        hours={impact.requested_hours}
                        days={formatDaysHours(impact.requested_hours, workdayHours)}
                        color={isDark ? DT.warningText : '#D97706'}
                        bg={isDark ? DT.warningBg : '#FFFBEB'}
                        isDark={isDark}
                      />
                      <WebBalanceStat
                        label="Remaining"
                        hours={impact.remaining_hours}
                        days={formatDaysHours(impact.remaining_hours, workdayHours)}
                        color={impact.remaining_hours <= 0 ? (isDark ? DT.dangerText : '#DC2626') : (isDark ? DT.successText : '#16A34A')}
                        bg={impact.remaining_hours <= 0 ? (isDark ? DT.dangerBg : '#FEF2F2') : (isDark ? DT.successBg : '#F0FDF4')}
                        isDark={isDark}
                      />
                    </div>

                    {/* Excess warning */}
                    {impact.has_excess && (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          backgroundColor: isDark ? DT.dangerBg : '#FEF2F2',
                          border: `1px solid ${isDark ? 'rgba(239,68,68,0.25)' : '#FECACA'}`,
                          fontSize: 13,
                          fontWeight: 500,
                          color: isDark ? DT.dangerText : '#DC2626',
                        }}
                      >
                        Exceeds balance by {impact.excess_hours.toFixed(1)}h ({impact.excess_days.toFixed(1)} days) — will require additional approval.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Mobile Layout (unchanged) ────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-slate-900" edges={['top']}>
      <ScreenHeader title="Request Time Off" />

      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        <View className="py-4">
          {showAdvanceNotice && (
            <Banner variant="warning" className="mb-4">
              This request does not meet the minimum of 2 days advanced notice.
            </Banner>
          )}

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

          {isEmergency && <EmergencyCounter count={emergencyCount} />}

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
                includeWeekends={watchedIncludeWeekends}
              />
            )}
          />

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

          <BalanceCard impact={impact} workdayHours={workdayHours} />

          {impact?.has_excess && (
            <ExcessBanner excessHours={impact.excess_hours} excessDays={impact.excess_days} />
          )}

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

          {isEmergency && (
            <FileUpload
              label="Attachments (optional)"
              files={files}
              onFilesChange={setFiles}
            />
          )}

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

// ─── Web Helper Components ──────────────────────────────────────────

function WebFormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.03em' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function WebToggle({ label, value, onChange, isDark, t, helper }: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isDark: boolean;
  t: any;
  helper?: string;
}) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.03em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[true, false].map((opt) => (
          <div
            key={String(opt)}
            onClick={() => onChange(opt)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${value === opt ? '#3b82f6' : isDark ? DT.inputBorder : LT.inputBorder}`,
              backgroundColor: value === opt ? (isDark ? DT.infoBg : '#EFF6FF') : 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: value === opt ? 600 : 400,
              color: value === opt ? (isDark ? DT.infoText : '#2563EB') : t.textSecondary,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                border: `2px solid ${value === opt ? '#3b82f6' : isDark ? '#475569' : '#CBD5E1'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {value === opt && (
                <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' }} />
              )}
            </div>
            {opt ? 'Yes' : 'No'}
          </div>
        ))}
      </div>
      {helper && (
        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>{helper}</div>
      )}
    </div>
  );
}

function WebBalanceStat({ label, hours, days, color, bg, isDark }: {
  label: string;
  hours: number;
  days: string;
  color: string;
  bg: string;
  isDark: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: 'center' as const,
        padding: '14px 10px',
        borderRadius: 12,
        backgroundColor: bg,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>
        {hours.toFixed(1)}h
      </div>
      <div style={{ fontSize: 11, color: isDark ? '#64748B' : '#94A3B8', marginTop: 2 }}>
        {days}
      </div>
    </div>
  );
}
