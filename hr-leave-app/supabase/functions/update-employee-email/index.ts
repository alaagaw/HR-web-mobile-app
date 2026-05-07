// ============================================================
// update-employee-email Edge Function
//
// HR-only endpoint that changes an employee's authentication email.
// Calls auth.admin.updateUserById with email_confirm=true so the new
// email is immediately usable for sign-in (HR is the verifier; we
// don't round-trip a confirmation email to the employee).
//
// Trigger 015 (sync_profile_email) handles syncing profiles.email
// after this auth.users.email update lands.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateEmailPayload {
  profile_id: string;
  new_email: string;
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
      .select('role')
      .eq('id', caller.id)
      .single();
    if (!callerProfile || !['hr', 'hr_director'].includes(callerProfile.role)) {
      throw new Error('Only HR staff can change employee emails');
    }

    // 3. Validate payload
    const payload: UpdateEmailPayload = await req.json();
    if (!payload.profile_id || !payload.new_email) {
      throw new Error('profile_id and new_email are required');
    }
    const newEmail = payload.new_email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
      throw new Error('Invalid email format');
    }

    // 4. Reject if the new email is already in use by another user
    const { data: existingList } = await supabase.auth.admin.listUsers();
    const conflict = existingList?.users?.find(
      (u: any) => u.email?.toLowerCase() === newEmail && u.id !== payload.profile_id
    );
    if (conflict) {
      throw new Error('Another user already uses this email');
    }

    // 5. Update auth.users.email — email_confirm=true skips the user-side
    //    confirmation flow because HR is the authority here.
    //    Trigger 015 (sync_profile_email) will then update profiles.email.
    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      payload.profile_id,
      { email: newEmail, email_confirm: true }
    );
    if (updateErr) throw new Error(`Auth update failed: ${updateErr.message}`);

    return new Response(
      JSON.stringify({ success: true, new_email: newEmail }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
