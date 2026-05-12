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

// ============================================================
// REGISTRATION & AUTH SCHEMAS
// ============================================================

export const signUpSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;

export const changePasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

/**
 * Schema for the employee registration completion form
 * (post-Phase-A flow: HR creates employee → invite sent → employee
 * sets password → lands here → fills personal data → HR approves).
 *
 * Fields HR controls (employee_code, role, dept, supervisor, manager,
 * job_title, start_date, workday_hours) are NOT in this schema —
 * the form displays them read-only.
 */
export const registrationFormSchema = z
  .object({
    // Personal — employee owns these
    email: z.string().email('Please enter a valid email address'),
    full_name: z.string().min(2, 'Full name is required'),
    phone: z.string().min(5, 'Phone number is required'),
    nationality: z.string().min(2, 'Nationality is required'),

    // Primary ID — the document the employee chose to upload
    id_type: z.enum(['national_id', 'iqama', 'passport'], {
      errorMap: () => ({ message: 'Please select your ID type' }),
    }),
    id_document_url: z.string().min(1, 'Please upload a scan/photo of your ID'),

    // Conditional based on id_type — set in superRefine below
    national_id_number: z.string().optional().nullable(),
    iqama_number: z.string().optional().nullable(),
    iqama_expiry: z.string().optional().nullable(),
    passport_number: z.string().optional().nullable(),
    passport_expiry: z.string().optional().nullable(),

    // Legacy field — auto-set from job_title now, but keep in schema
    // so submitRegistration's existing payload keeps working.
    occupation: z.string().optional().default(''),
  })
  .superRefine((data, ctx) => {
    // The chosen primary ID's number + expiry are required.
    if (data.id_type === 'national_id') {
      if (!data.national_id_number?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['national_id_number'],
          message: 'National ID number is required',
        });
      }
      // National IDs typically don't expire — no expiry check
    } else if (data.id_type === 'iqama') {
      if (!data.iqama_number?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['iqama_number'],
          message: 'Iqama number is required',
        });
      }
      if (!data.iqama_expiry?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['iqama_expiry'],
          message: 'Iqama expiry is required',
        });
      }
    } else if (data.id_type === 'passport') {
      if (!data.passport_number?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['passport_number'],
          message: 'Passport number is required',
        });
      }
      if (!data.passport_expiry?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['passport_expiry'],
          message: 'Passport expiry is required',
        });
      }
    }
  });

export type RegistrationFormSchemaData = z.infer<typeof registrationFormSchema>;

// ============================================================
// TIMESHEET SYSTEM SCHEMAS
// ============================================================

export const projectFormSchema = z.object({
  project_number: z.string().min(1, 'Project number is required'),
  name: z.string().min(1, 'Project name is required'),
  client: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  scope: z.string().nullable().optional(),
  status: z.string().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;

export const supplierFormSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  code: z.string().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email('Invalid email').nullable().optional().or(z.literal('')),
});

export type SupplierFormData = z.infer<typeof supplierFormSchema>;
