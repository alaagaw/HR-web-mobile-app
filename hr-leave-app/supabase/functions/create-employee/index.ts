// ============================================================
// create-employee Edge Function
//
// Step 1 of the "create now, invite later" workflow.
// HR fills the New Employee form → this function:
//   - validates the payload (most fields required, phone + emp_code optional)
//   - auto-generates the next emp_code via the emp_code_seq sequence
//     (atomic, race-free) IF HR didn't provide one. HR can override
//     when importing existing employees with legacy codes.
//   - creates an auth.users row with a throwaway password (email_confirm
//     stays true so the FK from profiles.id is satisfied; the user
//     never knows this password — they set their own via the invite/
//     reset flow).
//   - the migration-005 trigger then auto-creates the profiles row;
//     we update it with the org-chart fields and set status='not_invited'
//   - snapshots the HR-entered values into profiles.hr_original_values
//     so the HR review screen can later highlight any field the
//     employee changes during their registration form
//   - creates employee_documents with the emp_code AND occupation
//     auto-set from job_title
//   - DOES NOT send any email
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
  emp_code?: string | null;       // optional — auto-generated if blank
  phone?: string | null;          // optional — employee fills during registration
  nationality: string;            // required — HR enters at creation
  role: string;
  department: string;
  supervisor_id: string;
  manager_id: string;
  job_title: string;
  start_date: string;
  workday_hours: number;
  invited_by: string;
}

const REQUIRED_FIELDS: (keyof CreateEmployeePayload)[] = [
  'email', 'full_name', 'nationality', 'role', 'department',
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

    // 3. Validate payload — only the strictly-HR fields are required.
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

    // 5. Resolve emp_code: HR override OR auto-generated from sequence.
    let empCode = (payload.emp_code ?? '').trim();
    if (!empCode) {
      const { data: nextCode, error: codeErr } = await supabase.rpc('generate_next_emp_code');
      if (codeErr || !nextCode) {
        throw new Error(`Failed to generate employee code: ${codeErr?.message ?? 'no value returned'}`);
      }
      empCode = String(nextCode);
    } else {
      // HR provided a manual code — verify it doesn't collide before we
      // create the auth user (rolling back is more painful than checking).
      const { data: codeConflict } = await supabase
        .from('employee_documents')
        .select('emp_code')
        .eq('emp_code', empCode)
        .maybeSingle();
      if (codeConflict) {
        throw new Error(`Employee code "${empCode}" is already in use`);
      }
    }

    // 6. Workday hours sanity (default 8 if missing or invalid).
    const workdayHours =
      typeof payload.workday_hours === 'number' && payload.workday_hours > 0 && payload.workday_hours <= 24
        ? payload.workday_hours
        : 8;

    // 7. Create the auth.users row with a throwaway password.
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

    // 8. Snapshot the HR-entered values for diff during HR review.
    //    Stored as JSONB in profiles.hr_original_values.
    const hrOriginalValues = {
      full_name: payload.full_name.trim(),
      phone: payload.phone?.trim() || null,
      role: payload.role,
      department: payload.department.trim(),
      supervisor_id: payload.supervisor_id,
      manager_id: payload.manager_id,
      job_title: payload.job_title.trim(),
      start_date: payload.start_date,
      workday_hours: workdayHours,
      emp_code: empCode,
      // HR-entered at creation. Snapshot the real value so the HR review
      // diff highlights it if the employee changes it during registration.
      nationality: payload.nationality.trim(),
      // Personal fields HR didn't touch — capture as null so the diff
      // logic later knows those were employee-supplied.
      birth_date: null,
      id_type: null,
      national_id_number: null,
      iqama_number: null,
      iqama_expiry: null,
      passport_number: null,
      passport_expiry: null,
      insurance_number: null,
      insurance_expiry: null,
    };

    // 9. Update the auto-created profile with the org-chart fields.
    const { data: updatedProfile, error: updateErr } = await supabase
      .from('profiles')
      .update({
        full_name: payload.full_name.trim(),
        phone: payload.phone?.trim() || null,
        nationality: payload.nationality.trim(),
        role: payload.role,
        department: payload.department.trim(),
        supervisor_id: payload.supervisor_id,
        manager_id: payload.manager_id,
        job_title: payload.job_title.trim(),
        start_date: payload.start_date,
        workday_hours: workdayHours,
        invited_by: payload.invited_by,
        registration_status: 'not_invited',
        must_change_password: false,
        is_active: true,
        hr_original_values: hrOriginalValues,
        updated_at: new Date().toISOString(),
      })
      .eq('id', newProfileId)
      .select()
      .single();

    if (updateErr) {
      await supabase.auth.admin.deleteUser(newProfileId);
      throw new Error(`Failed to update profile: ${updateErr.message}`);
    }

    // 10. Seed employee_documents with emp_code + auto occupation = job_title.
    const { error: docError } = await supabase
      .from('employee_documents')
      .insert({
        employee_id: newProfileId,
        emp_code: empCode,
        occupation: payload.job_title.trim(),
      });

    if (docError) {
      await supabase.auth.admin.deleteUser(newProfileId);
      throw new Error(`Failed to create employee_documents: ${docError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, profile: updatedProfile, emp_code: empCode }),
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
