import { z } from 'zod';
import { LeaveType } from '@/types/enums';
import { MAX_COMMENT_LENGTH } from './constants';

// ============================================================
// ZOD SCHEMAS — Validation for forms and API payloads
// ============================================================

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type SignInFormData = z.infer<typeof signInSchema>;

export const leaveRequestSchema = z
  .object({
    leave_type: z.nativeEnum(LeaveType, { message: 'Please select a leave type' }),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    is_full_day: z.boolean(),
    start_time: z.string().nullable(),
    end_time: z.string().nullable(),
    include_weekends: z.boolean(),
    employee_comment: z
      .string()
      .max(MAX_COMMENT_LENGTH, `Comment must be under ${MAX_COMMENT_LENGTH} characters`)
      .nullable(),
    emergency_reason: z.string().nullable(),
  })
  .refine(
    (data) => {
      // End date must be >= start date
      if (data.start_date && data.end_date) {
        return data.end_date >= data.start_date;
      }
      return true;
    },
    { message: 'End date must be on or after start date', path: ['end_date'] }
  )
  .refine(
    (data) => {
      // Partial day requires start and end time
      if (!data.is_full_day) {
        return data.start_time != null && data.end_time != null;
      }
      return true;
    },
    { message: 'Start time and end time are required for partial day', path: ['start_time'] }
  )
  .refine(
    (data) => {
      // Emergency requires reason
      if (data.leave_type === LeaveType.Emergency) {
        return data.emergency_reason != null && data.emergency_reason.trim().length > 0;
      }
      return true;
    },
    { message: 'Reason is required for emergency leave', path: ['emergency_reason'] }
  )
  .refine(
    (data) => {
      // Partial day only allowed for single-day requests
      if (!data.is_full_day && data.start_date !== data.end_date) {
        return false;
      }
      return true;
    },
    { message: 'Partial day is only allowed for single-day requests', path: ['is_full_day'] }
  );

export type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

export const approvalCommentSchema = z.object({
  comment: z.string().max(MAX_COMMENT_LENGTH).optional(),
});

export const rejectionSchema = z.object({
  comment: z.string().min(1, 'A reason is required when rejecting').max(MAX_COMMENT_LENGTH),
});

export const bypassSchema = z.object({
  reason: z.string().min(1, 'A reason is required for bypass').max(MAX_COMMENT_LENGTH),
});

export const balanceAdjustmentSchema = z.object({
  hours: z.number().min(-1000).max(1000),
  reason: z.string().min(1, 'Reason is required for balance adjustment').max(MAX_COMMENT_LENGTH),
});
