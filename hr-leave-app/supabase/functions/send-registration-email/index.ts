// ============================================================
// send-registration-email Edge Function
//
// Notification emails for the self-registration approval workflow:
//   - registration_submitted  → HR is notified a new applicant submitted
//   - registration_approved   → applicant is told they're in
//   - registration_rejected   → applicant is told why they were declined
//
// Uses the shared sendEmail adapter so the provider is swappable.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/email.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:8081';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  type:
    | 'registration_submitted'
    | 'registration_approved'
    | 'registration_rejected'
    | 'info_form_request'
    | 'form_reminder_day3'
    | 'form_salary_hold_day4'
    | 'manual_form_warning';
  recipientEmail: string;
  recipientName: string;
  data?: {
    reason?: string;
    employeeName?: string;
    daysOverdue?: number;
    message?: string;
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const callerToken = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabase.auth.getUser(callerToken);
    if (!caller) throw new Error('Invalid token');

    const payload: EmailPayload = await req.json();
    if (!payload.type || !payload.recipientEmail) {
      throw new Error('type and recipientEmail are required');
    }

    const { subject, html } = buildEmail(payload);
    await sendEmail({ to: payload.recipientEmail, subject, html });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildEmail(payload: EmailPayload): { subject: string; html: string } {
  const wrap = (body: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0F172A;">
      ${body}
    </div>
  `;

  switch (payload.type) {
    case 'registration_submitted':
      return {
        subject: `New Registration: ${payload.data?.employeeName || 'New Employee'}`,
        html: wrap(`
          <h2 style="color: #F59E0B;">New Employee Registration</h2>
          <p><strong>${payload.data?.employeeName || 'An employee'}</strong> has submitted a registration request and is waiting for your review.</p>
          <p>Please review their information and approve or reject their registration.</p>
          <a href="${APP_URL}" style="display: inline-block; background: #2563EB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px; font-weight: 600;">
            Open Admin Panel
          </a>
        `),
      };

    case 'registration_approved':
      return {
        subject: 'Your Registration Has Been Approved!',
        html: wrap(`
          <h2 style="color: #16A34A;">Registration Approved!</h2>
          <p>Hi ${payload.recipientName},</p>
          <p>Your registration has been approved. You now have full access to the Poly-Tech HR Management System.</p>
          <a href="${APP_URL}" style="display: inline-block; background: #2563EB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px; font-weight: 600;">
            Sign In Now
          </a>
        `),
      };

    case 'registration_rejected':
      return {
        subject: 'Action needed: update your registration info',
        html: wrap(`
          <h2 style="color: #D97706;">Your registration needs a few changes</h2>
          <p>Hi ${payload.recipientName},</p>
          <p>HR reviewed your registration and asked you to update some details before it can be approved.</p>
          ${payload.data?.reason ? `<div style="background: #FFFBEB; border-left: 4px solid #D97706; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <strong>HR comment:</strong> ${payload.data.reason}
          </div>` : ''}
          <p>Please sign in, open the registration form, fix the highlighted fields, and submit again. HR will review the updated info.</p>
        `),
      };

    case 'info_form_request':
      // HR proactively asks an existing employee to update their info.
      // No password reset involved — the recipient signs in normally,
      // sees the task on their dashboard, fills out the form on their
      // schedule.
      return {
        subject: 'Action requested: update your profile info',
        html: wrap(`
          <h2 style="color: #2563EB;">HR has requested an update to your profile</h2>
          <p>Hi ${payload.recipientName},</p>
          <p>HR has asked you to review and update your registration info. You can sign in with your existing password — there's no password reset needed.</p>
          ${payload.data?.reason ? `<div style="background: #EFF6FF; border-left: 4px solid #2563EB; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <strong>HR note:</strong> ${payload.data.reason}
          </div>` : ''}
          <p>You'll find the form linked from your dashboard. If you're busy right now, you can come back to it later — but please don't leave it for more than a few days.</p>
          <a href="${APP_URL}" style="display: inline-block; background: #2563EB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px; font-weight: 600;">
            Sign In
          </a>
        `),
      };

    case 'form_reminder_day3':
      // Auto-fired by the daily cron when an employee has been in
      // pending_info / info_rejected for 3+ days. Friendly tone.
      return {
        subject: 'Reminder: please complete your registration info',
        html: wrap(`
          <h2 style="color: #D97706;">Quick reminder to update your profile</h2>
          <p>Hi ${payload.recipientName},</p>
          <p>It's been ${payload.data?.daysOverdue ?? 3} days since HR asked you to update your registration info. Please sign in and finish it as soon as you can.</p>
          <p>If you finish it within the next 24 hours, no further action will be needed.</p>
          <a href="${APP_URL}" style="display: inline-block; background: #D97706; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px; font-weight: 600;">
            Open the form
          </a>
        `),
      };

    case 'form_salary_hold_day4':
      // Day 4+. Same daily cron, escalated wording. The first sentence
      // is the legal/operational consequence so it's impossible to miss.
      return {
        subject: 'Important: salary on hold until you update your profile',
        html: wrap(`
          <h2 style="color: #DC2626;">Your salary for this month is on hold</h2>
          <p>Hi ${payload.recipientName},</p>
          <p>Your registration info has not been updated despite multiple requests. As a result, <strong>your salary for this month will be held and paid only with next month's payroll</strong> once your profile is complete.</p>
          <p>This is an automatic policy — the moment you submit a complete profile, HR will release this month's payment alongside the regular cycle.</p>
          <a href="${APP_URL}" style="display: inline-block; background: #DC2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px; font-weight: 600;">
            Update profile now
          </a>
          <p style="margin-top: 16px;">If you believe this is a mistake, contact HR right away.</p>
        `),
      };

    case 'manual_form_warning':
      // HR-fired ad-hoc warning. They can pass a custom message in
      // payload.data.message to customise the body.
      return {
        subject: 'Action requested by HR: update your profile',
        html: wrap(`
          <h2 style="color: #D97706;">HR has sent you a manual reminder</h2>
          <p>Hi ${payload.recipientName},</p>
          ${payload.data?.message
            ? `<div style="background: #FFFBEB; border-left: 4px solid #D97706; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                ${payload.data.message}
              </div>`
            : '<p>HR is asking you to complete your pending registration info as soon as possible.</p>'
          }
          <a href="${APP_URL}" style="display: inline-block; background: #D97706; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px; font-weight: 600;">
            Open the form
          </a>
        `),
      };

    default:
      throw new Error(`Unknown email type: ${(payload as any).type}`);
  }
}
