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
  type: 'registration_submitted' | 'registration_approved' | 'registration_rejected';
  recipientEmail: string;
  recipientName: string;
  data?: {
    reason?: string;
    employeeName?: string;
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
          <p>Your registration has been approved. You now have full access to the HR System.</p>
          <a href="${APP_URL}" style="display: inline-block; background: #2563EB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px; font-weight: 600;">
            Sign In Now
          </a>
        `),
      };

    case 'registration_rejected':
      return {
        subject: 'Registration Update',
        html: wrap(`
          <h2 style="color: #EF4444;">Registration Not Approved</h2>
          <p>Hi ${payload.recipientName},</p>
          <p>Unfortunately, your registration was not approved.</p>
          ${payload.data?.reason ? `<div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <strong>Reason:</strong> ${payload.data.reason}
          </div>` : ''}
          <p>If you have questions, please contact the HR department.</p>
        `),
      };

    default:
      throw new Error(`Unknown email type: ${payload.type}`);
  }
}
