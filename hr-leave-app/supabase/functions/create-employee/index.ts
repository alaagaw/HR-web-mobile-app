// ============================================================
// create-employee Edge Function
//
// Step 1 of the new "create now, invite later" workflow.
// HR fills the New Employee form → this function:
//   - validates the payload
//   - creates an auth.users row (throwaway password, email_confirm=true)
//     so the FK from profiles.id is satisfied; the user never knows this
//     password — they set their own via the invite/reset flow
//   - the migration-005 trigger then auto-creates the profiles row;
//     we update it with the org-chart fields and set status='not_invited'
//   - creates employee_documents with the real emp_code
//   - DOES NOT send any email
//
// The invite email goes out via the separate send-invite function.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateEmployeePayload {
  email: string;
  full_name: string;
  emp_code: string;
  phone: string;
  role: string;
  department: string;
  supervisor_id: string;
  manager_id: string;
  job_title: string;
  start_date: string;
  invited_by: string;
}

const REQUIRED_FIELDS: (keyof CreateEmployeePayload)[] = [
  'email', 'full_name', 'emp_code', 'phone', 'role', 'department',
  'supervisor_id', 'manager_id', 'job_title', 'start_date', 'invited_by',
];

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
      throw new Error('Only HR staff can create employees');
    }

    // 3. Validate payload
    const payload: CreateEmployeePayload = await req.json();
    for (const field of REQUIRED_FIELDS) {
      const value = payload[field];
      if (value === undefined || value === null || String(value).trim() === '') {
        throw new Error(`Field "${field}" is required`);
      }
    }

    const email = payload.email.trim().toLowerCase();

    // 4. Reject if email already in use
    const { data: existingList } = await supabase.auth.admin.listUsers();
    const existingAuth = existingList?.users?.find((u: any) => u.email?.toLowerCase() === email);
    if (existingAuth) {
      throw new Error('A user with this email already exists');
    }

    // 5. Create the auth.users row with a throwaway password.
    //    The migration-005 trigger fires and creates a profile row; we update it next.
    //    email_confirm=true means Supabase doesn't send its own "verify your email"
    //    notification — we control the invite email separately via send-invite.
    const throwawayPassword = generateRandomPassword();
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: throwawayPassword,
      email_confirm: true,
      user_metadata: {
        full_name: payload.full_name.trim(),
      },
    });
    if (createErr) throw new Error(`Failed to create auth user: ${createErr.message}`);
    if (!newUser.user) throw new Error('createUser returned no user');

    const newProfileId = newUser.user.id;

    // 6. Update the auto-created profile with the org-chart and identity fields.
    const { data: updatedProfile, error: updateErr } = await supabase
      .from('profiles')
      .update({
        full_name: payload.full_name.trim(),
        phone: payload.phone.trim(),
        role: payload.role,
        department: payload.department.trim(),
        supervisor_id: payload.supervisor_id,
        manager_id: payload.manager_id,
        job_title: payload.job_title.trim(),
        start_date: payload.start_date,
        invited_by: payload.invited_by,
        registration_status: 'not_invited',
        must_change_password: false,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', newProfileId)
      .select()
      .single();

    if (updateErr) {
      // Roll back the auth user so we don't leave a half-created account
      await supabase.auth.admin.deleteUser(newProfileId);
      throw new Error(`Failed to update profile: ${updateErr.message}`);
    }

    // 7. Seed the employee_documents row with the real emp_code.
    const { error: docError } = await supabase
      .from('employee_documents')
      .insert({
        employee_id: newProfileId,
        emp_code: payload.emp_code.trim(),
      });

    if (docError) {
      // Roll back both
      await supabase.auth.admin.deleteUser(newProfileId);
      throw new Error(`Failed to create employee_documents: ${docError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, profile: updatedProfile }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let pw = '';
  for (let i = 0; i < 24; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}
