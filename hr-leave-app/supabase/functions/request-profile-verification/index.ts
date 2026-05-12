// ============================================================
// request-profile-verification Edge Function
//
// HR-only bulk action. For each selected profile id:
//   1. Verify caller is HR.
//   2. Verify the target is active (we don't demote anyone who isn't
//      already at active — pending_info / pending_approval / not_invited
//      stay where they are).
//   3. Demote registration_status from 'active' → 'pending_info' so
//      the AuthGuard routes them to the registration form on next
//      sign-in.
//   4. Trigger Supabase's password-recovery email so they get a fresh
//      sign-in link saying "Action Required: Complete your Poly-Tech
//      HR profile". Reuses the same recovery-template wording.
//   5. Insert an in-app notification.
//
// Returns per-id results so the UI can show partial-success cleanly.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:8081';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  profile_ids: string[];
  app_url?: string;
  // When true, employees with is_active=false are processed too (still
  // resends the email; doesn't change is_active). The UI sets this only
  // after HR confirms in a dialog that includes inactive rows. Without
  // this flag, inactive rows are returned as failures so a stray bulk
  // action doesn't accidentally re-invite ex-employees.
  allow_inactive?: boolean;
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
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1. Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    const callerToken = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabase.auth.getUser(callerToken);
    if (!caller) throw new Error('Invalid token');

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();
    if (!callerProfile || !['hr', 'hr_director'].includes(callerProfile.role)) {
      throw new Error('Only HR staff can request profile verification');
    }

    const payload: Payload = await req.json();
    if (!Array.isArray(payload.profile_ids) || payload.profile_ids.length === 0) {
      throw new Error('profile_ids must be a non-empty array');
    }

    const redirectBase = (payload.app_url || APP_URL).replace(/\/$/, '');
    const allowInactive = !!payload.allow_inactive;
    const results: PerIdResult[] = [];

    for (const profileId of payload.profile_ids) {
      try {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('id, email, full_name, registration_status, is_active')
          .eq('id', profileId)
          .single();
        if (profileErr || !profile) throw new Error('Profile not found');
        if (!profile.email) throw new Error('Profile has no email address');
        if (!profile.is_active && !allowInactive) {
          throw new Error('Cannot resend to an inactive employee without explicit confirmation');
        }
        // registration_status check removed: people in any status can
        // legitimately lose their email and ask for a fresh sign-in
        // link. The post-sign-in routing handles status-based landing.

        // Send the password-recovery email FIRST. If the mailer rejects
        // (rate limit, etc.), we abort before any status change so the
        // employee is not stranded in a halfway state.
        const { error: rpcErr } = await supabaseAnon.auth.resetPasswordForEmail(profile.email, {
          redirectTo: `${redirectBase}/reset-password`,
        });
        if (rpcErr) throw new Error(`Mailer rejected: ${rpcErr.message}`);

        // Only ACTIVE employees get demoted to pending_info — that's
        // the original "force them through the form again" semantic of
        // this action. Anyone already at pending_info / pending_approval /
        // info_rejected / etc. keeps their status; for them this is
        // purely a resend.
        if (profile.registration_status === 'active') {
          await supabase
            .from('profiles')
            .update({
              registration_status: 'pending_info',
              updated_at: new Date().toISOString(),
            })
            .eq('id', profileId);
        }

        // In-app notification.
        await supabase.from('notifications').insert({
          user_id: profileId,
          type: 'employee_invited',
          title: 'Action Required: Sign in to your Poly-Tech HR account',
          body: 'HR has resent your sign-in email. Check your inbox for a 6-digit code; entering it will let you set a new password and access the system.',
        });

        results.push({ profile_id: profileId, success: true });
      } catch (err: any) {
        results.push({ profile_id: profileId, success: false, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
