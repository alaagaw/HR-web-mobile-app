import { supabase } from './client';
import type { RegistrationService } from '../types';
import type {
  Profile,
  PendingRegistration,
  SendInviteResult,
  RequestProfileVerificationResult,
} from '@/types/models';
import { RegistrationStatus } from '@/types/enums';

const EDGE_FUNCTION_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1';

async function callEdgeFunction(
  name: string,
  body: Record<string, unknown>
): Promise<any> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${EDGE_FUNCTION_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `${name} failed`);
  return result;
}

export const registrationService: RegistrationService = {
  // ── Self-registration flow ───────────────────────────────────

  async submitRegistration(userId, data) {
    // 1. Profile update (email, full_name, phone, nationality + status flip to
    //    pending_approval) goes through the SECURITY DEFINER RPC
    //    `submit_my_registration` because the RLS lockdown in migration
    //    014 forbids the employee from changing nationality or
    //    registration_status directly.
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'submit_my_registration',
      {
        p_email: data.email,
        p_full_name: data.full_name,
        p_phone: data.phone,
        p_nationality: data.nationality ?? '',
      }
    );

    if (rpcError) throw new Error(rpcError.message);
    if (!rpcData) throw new Error('submit_my_registration returned no data');

    // 2. Upsert employee_documents — including the new primary-ID fields
    //    (id_type, national_id_number, id_document_url). occupation is
    //    auto-derived from job_title at create-employee time and not
    //    re-collected here. emp_code is HR-managed; only set it (with a
    //    PENDING placeholder) for self-registered users who don't have
    //    an HR-created profile yet.
    const { data: existingDoc } = await supabase
      .from('employee_documents')
      .select('emp_code')
      .eq('employee_id', userId)
      .maybeSingle();

    const docPayload: Record<string, unknown> = {
      employee_id: userId,
      // New fields — only set if the (Phase B) form provided them
      ...(data.id_type ? { id_type: data.id_type } : {}),
      ...(data.national_id_number !== undefined ? { national_id_number: data.national_id_number } : {}),
      ...(data.id_document_url ? { id_document_url: data.id_document_url } : {}),
      // ID document fields — current form always sets these
      iqama_number: data.iqama_number,
      iqama_expiry: data.iqama_expiry,
      passport_number: data.passport_number,
      passport_expiry: data.passport_expiry,
      occupation: data.occupation,
      updated_at: new Date().toISOString(),
    };
    if (!existingDoc) {
      // Self-registered (no HR-pre-created row) — placeholder so the NOT NULL
      // emp_code constraint is satisfied; HR replaces it on approval.
      docPayload.emp_code = `PENDING-${Date.now()}`;
    }

    const { error: docError } = await supabase
      .from('employee_documents')
      .upsert(docPayload, { onConflict: 'employee_id' });

    if (docError) throw new Error(docError.message);

    // 3. Notify all HR users (in-app)
    const { data: hrUsers } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('role', ['hr', 'hr_director'])
      .eq('registration_status', 'active');

    if (hrUsers?.length) {
      const notifications = hrUsers.map((hr) => ({
        user_id: hr.id,
        type: 'registration_submitted',
        title: 'New Registration Pending',
        body: `${data.full_name} has submitted a registration request.`,
        reference_id: userId,
      }));
      await supabase.from('notifications').insert(notifications);

      // Send email to each HR user
      for (const hr of hrUsers) {
        try {
          await callEdgeFunction('send-registration-email', {
            type: 'registration_submitted',
            recipientEmail: hr.email,
            recipientName: hr.full_name,
            data: { employeeName: data.full_name },
          });
        } catch {
          // Don't fail the registration if email fails
        }
      }
    }

    // 4. Return updated profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) throw new Error(fetchError.message);
    return profile as Profile;
  },

  async getRegistrationStatus(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('registration_status')
      .eq('id', userId)
      .single();

    if (error) throw new Error(error.message);
    return data.registration_status as RegistrationStatus;
  },

  // ── HR admin ─────────────────────────────────────────────────

  async getPendingRegistrations() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('registration_status', ['pending_approval', 'pending_info'])
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const profiles = data as Profile[];
    const result: PendingRegistration[] = [];

    for (const profile of profiles) {
      const { data: doc } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', profile.id)
        .maybeSingle();

      result.push({ ...profile, employee_documents: doc });
    }

    return result;
  },

  async approveRegistration(userId, data, approvedBy) {
    // 1. Update profile with HR-assigned fields
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role: data.role,
        department: data.department,
        supervisor_id: data.supervisor_id,
        manager_id: data.manager_id,
        registration_status: RegistrationStatus.Active,
        registration_note: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) throw new Error(profileError.message);

    // 2. Update emp_code in employee_documents
    await supabase
      .from('employee_documents')
      .update({
        emp_code: data.emp_code,
        updated_at: new Date().toISOString(),
      })
      .eq('employee_id', userId);

    // 3. Create default leave balances
    const { error: rpcError } = await supabase.rpc(
      'create_default_leave_balances',
      { p_employee_id: userId }
    );
    if (rpcError) throw new Error(rpcError.message);

    // 4. In-app notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'registration_approved',
      title: 'Registration Approved!',
      body: 'Your registration has been approved. You now have full access to the HR System.',
    });

    // 5. Email notification
    const { data: employeeProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (employeeProfile) {
      try {
        await callEdgeFunction('send-registration-email', {
          type: 'registration_approved',
          recipientEmail: employeeProfile.email,
          recipientName: employeeProfile.full_name,
        });
      } catch {
        // Don't fail approval if email fails
      }
    }

    // 6. Return updated profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) throw new Error(fetchError.message);
    return profile as Profile;
  },

  async updateRegistrationFields(userId, edits) {
    // Translate "undefined" → NULL (no change). Empty strings are
    // forwarded as-is so HR can intentionally blank a field.
    const orNull = (v: unknown) => (v === undefined ? null : v);

    const { data, error } = await supabase.rpc('hr_update_pending_profile', {
      p_user_id: userId,
      p_full_name:          orNull(edits.full_name),
      p_phone:              orNull(edits.phone),
      p_nationality:        orNull(edits.nationality),
      p_id_type:            orNull(edits.id_type),
      p_national_id_number: orNull(edits.national_id_number),
      p_iqama_number:       orNull(edits.iqama_number),
      p_iqama_expiry:       orNull(edits.iqama_expiry),
      p_passport_number:    orNull(edits.passport_number),
      p_passport_expiry:    orNull(edits.passport_expiry),
      p_id_document_url:    orNull(edits.id_document_url),
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error('hr_update_pending_profile returned no data');
    return data as Profile;
  },

  async updateRegistrationEmail(userId, newEmail) {
    // Edge function handles the auth.admin.updateUserById call; trigger
    // 015 (sync_profile_email) mirrors the new email into profiles.
    await callEdgeFunction('update-employee-email', {
      profile_id: userId,
      new_email: newEmail,
    });
  },

  async rejectRegistration(userId, reason, rejectedBy) {
    // "Reject" here is really "send back for changes". We flip status
    // to info_rejected so the employee is bounced back to the form (one
    // time, on next sign-in) and shown HR's comment. We do NOT change
    // is_active — that's only HR's call via Edit Employee.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        registration_status: RegistrationStatus.InfoRejected,
        registration_note: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) throw new Error(profileError.message);

    // In-app notification — keep the `registration_rejected` type so any
    // historical notifications still render correctly; the title/body
    // now describe the action accurately.
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'registration_rejected',
      title: 'Action needed: update your registration info',
      body: `HR sent your registration back for changes. Comment: ${reason}`,
    });

    // Email notification
    const { data: employeeProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (employeeProfile) {
      try {
        await callEdgeFunction('send-registration-email', {
          type: 'registration_rejected',
          recipientEmail: employeeProfile.email,
          recipientName: employeeProfile.full_name,
          data: { reason },
        });
      } catch {
        // Don't fail rejection if email fails
      }
    }

    // Return updated profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) throw new Error(fetchError.message);
    return profile as Profile;
  },

  async inviteEmployee(data, invitedBy) {
    await callEdgeFunction('invite-employee', {
      ...data,
      invited_by: invitedBy,
    });
  },

  async createEmployee(data, invitedBy) {
    const result = await callEdgeFunction('create-employee', {
      ...data,
      invited_by: invitedBy,
    });
    return result.profile as Profile;
  },

  async sendInvites(profileIds) {
    // On web, tell the Edge Function which origin to redirect employees back to
    // after they click the magic-link in the email. This way `localhost` users
    // get a localhost link and Vercel users get a Vercel link automatically —
    // no manual config flip. Supabase's Redirect URL allowlist still validates
    // the URL, so this can't be abused.
    const appUrl =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : undefined;

    const result = await callEdgeFunction('send-invite', {
      profile_ids: profileIds,
      ...(appUrl ? { app_url: appUrl } : {}),
    });
    return (result.results ?? []) as SendInviteResult[];
  },

  async requestProfileVerification(profileIds) {
    // Bulk demote selected active employees back to `pending_info` so the
    // AuthGuard routes them through the registration form on next sign-in.
    // Also fires an email asking them to log in and complete their profile.
    //
    // Implementation lives in a dedicated Edge Function so we can do the
    // status update + magic-link email atomically with HR auth check.
    const appUrl =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : undefined;

    const result = await callEdgeFunction('request-profile-verification', {
      profile_ids: profileIds,
      ...(appUrl ? { app_url: appUrl } : {}),
    });
    return (result.results ?? []) as RequestProfileVerificationResult[];
  },
};
