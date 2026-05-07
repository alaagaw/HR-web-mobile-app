// ============================================================
// send-invite Edge Function
//
// Step 2 of the "create now, invite later" workflow. Accepts one or
// many profile ids and emails each employee.
//
// Two modes, picked by the INVITE_MODE env var:
//
//   magic_link (DEFAULT, no Resend needed)
//     - Triggers a password-recovery email through Supabase Auth.
//       Supabase sends it via whatever SMTP it has configured —
//       defaults to Supabase's built-in mailer (rate-limited to ~3/hr,
//       fine for testing). If you plug Resend SMTP into the Supabase
//       Auth dashboard, that limit is replaced by Resend's quotas
//       and the email comes from your verified polytech.com.sa domain.
//     - User clicks link → lands on /reset-password → sets password.
//     - No temp password ever exists.
//     - Customise the wording in Supabase Dashboard → Authentication →
//       Email Templates → "Reset Password" so it reads like a welcome.
//
//   temp_password
//     - Original behaviour: server generates a 12-char temp password,
//       sets must_change_password=true on the profile, sends a custom
//       HTML email via the Resend adapter (RESEND_API_KEY required).
//     - User signs in with temp password → forced change-password flow
//       → lands on dashboard.
//
// Returns per-id results so the UI shows partial-success cleanly.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/email.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:8081';
const INVITE_MODE = (Deno.env.get('INVITE_MODE') ?? 'magic_link').toLowerCase();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendInvitePayload {
  profile_ids: string[];
  /**
   * Optional override for the redirect base URL. The web client passes
   * window.location.origin so localhost dev sessions get a localhost link
   * and Vercel sessions get a Vercel link. Falls back to APP_URL env var
   * (mobile / no client hint). Supabase's Redirect URL allowlist is the
   * actual security boundary — this value is just a hint.
   */
  app_url?: string;
}

interface PerIdResult {
  profile_id: string;
  success: boolean;
  error?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    const callerToken = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabase.auth.getUser(callerToken);
    if (!caller) throw new Error('Invalid token');

    // 2. Authorize: HR or HR Director only
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', caller.id)
      .single();
    if (!callerProfile || !['hr', 'hr_director'].includes(callerProfile.role)) {
      throw new Error('Only HR staff can send invites');
    }

    const fromAddress = callerProfile.email
      ? `${callerProfile.full_name || 'HR'} <${callerProfile.email}>`
      : undefined;

    // 3. Validate payload
    const payload: SendInvitePayload = await req.json();
    if (!Array.isArray(payload.profile_ids) || payload.profile_ids.length === 0) {
      throw new Error('profile_ids must be a non-empty array');
    }

    // Pick the redirect base: client hint > env var fallback.
    const redirectBase = (payload.app_url || APP_URL).replace(/\/$/, '');

    // 4. Process each id; per-id results so one failure doesn't abort the rest
    const results: PerIdResult[] = [];

    for (const profileId of payload.profile_ids) {
      try {
        if (INVITE_MODE === 'temp_password') {
          await inviteWithTempPassword(supabase, profileId, fromAddress, callerProfile.full_name || 'HR', redirectBase);
        } else {
          await inviteWithMagicLink(supabase, profileId, redirectBase);
        }
        results.push({ profile_id: profileId, success: true });
      } catch (err: any) {
        results.push({ profile_id: profileId, success: false, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ results, mode: INVITE_MODE }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================
// Mode A — magic_link (default; uses Supabase's built-in mailer)
// ============================================================

async function inviteWithMagicLink(supabase: any, profileId: string, redirectBase: string): Promise<void> {
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, registration_status, is_active')
    .eq('id', profileId)
    .single();
  if (profileErr || !profile) throw new Error('Profile not found');
  if (!profile.email) throw new Error('Profile has no email address');
  if (!profile.is_active) throw new Error('Cannot invite an inactive employee — reactivate first');

  // Trigger Supabase's built-in password-recovery email. We use the anon-key
  // client because resetPasswordForEmail is a public unauthenticated RPC.
  // Supabase auto-sends the email via the SMTP configured in Auth → SMTP
  // Settings (or its own built-in mailer if none is set yet).
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error: rpcErr } = await supabaseAnon.auth.resetPasswordForEmail(profile.email, {
    redirectTo: `${redirectBase}/reset-password`,
  });
  if (rpcErr) throw new Error(`Supabase mailer rejected: ${rpcErr.message}`);

  // Mark the profile active. The user can sign in once they've set a password
  // via the recovery link. (must_change_password is left false because they're
  // setting their own password directly on the reset page — no second step.)
  await supabase
    .from('profiles')
    .update({
      registration_status: 'active',
      must_change_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId);

  await supabase.from('notifications').insert({
    user_id: profileId,
    type: 'employee_invited',
    title: 'Welcome to Poly-Tech HR Management System',
    body: 'Check your email for a link to set your password and sign in.',
  });
}

// ============================================================
// Mode B — temp_password (uses our Resend adapter directly)
// ============================================================

async function inviteWithTempPassword(
  supabase: any,
  profileId: string,
  fromAddress: string | undefined,
  hrName: string,
  redirectBase: string
): Promise<void> {
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, registration_status, is_active')
    .eq('id', profileId)
    .single();
  if (profileErr || !profile) throw new Error('Profile not found');
  if (!profile.email) throw new Error('Profile has no email address');
  if (!profile.is_active) throw new Error('Cannot invite an inactive employee — reactivate first');

  const tempPassword = generateTempPassword();
  // "Resend" framing applies to anyone who's already past the not_invited stage.
  const isResend = profile.registration_status !== 'not_invited';

  // Reset the password (the auth user already exists from create-employee).
  const { error: pwErr } = await supabase.auth.admin.updateUserById(profileId, {
    password: tempPassword,
  });
  if (pwErr) throw new Error(`Failed to reset password: ${pwErr.message}`);

  await supabase
    .from('profiles')
    .update({
      registration_status: 'active',
      must_change_password: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId);

  await sendEmail({
    to: profile.email,
    from: fromAddress,
    subject: isResend
      ? 'Your Poly-Tech HR password has been reset'
      : 'Welcome to Poly-Tech HR Management System',
    html: buildTempPasswordHtml({
      employeeName: profile.full_name || 'there',
      employeeEmail: profile.email,
      tempPassword,
      hrName,
      isResend,
      appUrl: redirectBase,
    }),
  });

  await supabase.from('notifications').insert({
    user_id: profileId,
    type: 'employee_invited',
    title: isResend ? 'Password reset by HR' : 'Welcome to Poly-Tech HR Management System',
    body: isResend
      ? 'Your password has been reset. Check your email for the new temporary password.'
      : 'Your account has been created. Please sign in and change your password.',
  });
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let pw = '';
  for (let i = 0; i < 12; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

function buildTempPasswordHtml(params: {
  employeeName: string;
  employeeEmail: string;
  tempPassword: string;
  hrName: string;
  isResend: boolean;
  appUrl: string;
}): string {
  const heading = params.isResend
    ? 'Your password has been reset'
    : `Welcome to Poly-Tech HR Management System, ${params.employeeName}!`;
  const intro = params.isResend
    ? `${params.hrName} has reset your password. Use the temporary password below to sign in, then change it immediately.`
    : `Your account has been created by ${params.hrName}. Use the credentials below to sign in. You'll be prompted to change your password right away.`;

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color: #0F172A; background: #FFFFFF; border-radius: 12px; overflow: hidden;">
      <div style="background: #0F172A;">
        <img src="${params.appUrl}/PolyTech_background.png"
             alt="Poly-Tech"
             width="600"
             style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;">
      </div>
      <div style="padding: 32px 28px;">
        <h2 style="color: #1E40AF; margin: 0 0 12px; font-size: 22px;">${heading}</h2>
        <p style="margin: 0 0 20px; line-height: 1.5;">${intro}</p>
        <div style="background: #F1F5F9; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Email:</strong> ${params.employeeEmail}</p>
          <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <code style="font-size: 15px;">${params.tempPassword}</code></p>
        </div>
        <p style="text-align: center; margin: 28px 0;">
          <a href="${params.appUrl}" style="display: inline-block; background: #2563EB; color: #FFFFFF; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Open Poly-Tech HR
          </a>
        </p>
        <hr style="margin: 28px 0; border: none; border-top: 1px solid #E2E8F0;">
        <p style="font-size: 12px; color: #94A3B8; margin: 0;">
          If you weren't expecting this email, please contact ${params.hrName}.
        </p>
      </div>
    </div>
  `;
}
