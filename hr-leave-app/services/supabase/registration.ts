import { supabase } from './client';
import { REGISTRATION_DECLARATION_VERSION } from '@/lib/constants';
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
        p_national_address: data.national_address ?? null,
        p_qualification: data.qualification ?? null,
        p_specialization: data.specialization ?? null,
        p_declaration_accepted: data.declaration_accepted === true,
        p_declaration_version: REGISTRATION_DECLARATION_VERSION,
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

    // emp_code is NOT NULL with no default. The upsert plans the INSERT
    // branch first, so the column must be present in the payload even
    // when we expect the ON CONFLICT DO UPDATE branch to fire — otherwise
    // Postgres rejects with a NOT NULL violation before getting to the
    // conflict check. (This bit hard on info_rejected resubmits, where
    // the doc row already exists with a real emp_code.)
    if (existingDoc?.emp_code) {
      // Carry the existing value forward — the BEFORE UPDATE trigger in
      // migration 022 accepts unchanged emp_code (IS DISTINCT FROM is
      // false) so this is a no-op on the UPDATE path.
      docPayload.emp_code = existingDoc.emp_code;
    } else {
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

    // 4. Return updated profile (RPC: full row for self/HR — gap #1)
    const { data: profile, error: fetchError } = await supabase
      .rpc('get_profile_secure', { p_id: userId })
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
      // RPC (migration 050): HR caller → full rows; sensitive PII
      // on the base table is locked down (gap #1).
      .rpc('list_employees_secure', {
        p_reg_statuses: ['pending_approval', 'pending_info'],
      });

    if (error) throw new Error(error.message);

    // Most recently submitted first. The RPC orders by full_name;
    // re-sort here to preserve the prior behaviour. Backfill
    // (migration 040) guarantees registration_submitted_at is set
    // for all pending rows.
    const profiles = ((data ?? []) as Profile[])
      .slice()
      .sort((a, b) =>
        (b.registration_submitted_at ?? '').localeCompare(
          a.registration_submitted_at ?? '',
        ),
      );
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
    // 1. Assign the HR-chosen org fields (role / department / chain).
    //    Status is NOT flipped here — that goes through the audited
    //    transition chokepoint in step 1b.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role: data.role,
        department: data.department,
        supervisor_id: data.supervisor_id,
        manager_id: data.manager_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) throw new Error(profileError.message);

    // 1b. registration_status → active via the HR-only chokepoint RPC.
    //     Enforces the legal transition and auto-audits it (the
    //     active/note write is captured by trg_profiles_log_*).
    const { error: approveError } = await supabase.rpc('hr_set_registration_status', {
      p_user_id: userId,
      p_action: 'approve',
    });
    if (approveError) throw new Error(approveError.message);

    // 2. Update emp_code in employee_documents.
    //    emp_code is NOT NULL UNIQUE. Pre-check for a collision with a
    //    DIFFERENT employee so HR gets a clear message instead of a raw
    //    "duplicate key value violates unique constraint" (or, worse, a
    //    silently swallowed update — this error used to be unchecked).
    if (data.emp_code) {
      const { data: clash } = await supabase
        .from('employee_documents')
        .select('employee_id')
        .eq('emp_code', data.emp_code)
        .neq('employee_id', userId)
        .maybeSingle();
      if (clash) {
        throw new Error(
          `Employee code "${data.emp_code}" is already assigned to another employee. ` +
            `Use a different code, or fix the duplicate via Manage Employees → Remap Employee Codes.`
        );
      }
    }

    const { error: empCodeError } = await supabase
      .from('employee_documents')
      .update({
        emp_code: data.emp_code,
        updated_at: new Date().toISOString(),
      })
      .eq('employee_id', userId);

    if (empCodeError) {
      throw new Error(
        empCodeError.code === '23505'
          ? `Employee code "${data.emp_code}" is already in use. Choose a different code.`
          : `Failed to set employee code: ${empCodeError.message}`
      );
    }

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

    // 6. Return updated profile (RPC: full row for self/HR — gap #1)
    const { data: profile, error: fetchError } = await supabase
      .rpc('get_profile_secure', { p_id: userId })
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
      p_national_address:   orNull(edits.national_address),
      p_qualification:      orNull(edits.qualification),
      p_specialization:     orNull(edits.specialization),
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
    // "Reject" here is really "send a pending submission back for
    // changes". The chokepoint RPC enforces this is only valid from
    // pending_approval, flips status → info_rejected, stores HR's
    // comment, and auto-audits the change. is_active is NOT touched —
    // that's only HR's call via Edit Employee.
    const { error: rejectError } = await supabase.rpc('hr_set_registration_status', {
      p_user_id: userId,
      p_action: 'reject',
      p_note: reason,
    });

    if (rejectError) throw new Error(rejectError.message);

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

    // Return updated profile (RPC: full row for self/HR — gap #1)
    const { data: profile, error: fetchError } = await supabase
      .rpc('get_profile_secure', { p_id: userId })
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

  async requestProfileVerification(profileIds, options) {
    // Bulk resend the sign-in email. For employees currently in `active`
    // status this also demotes them to `pending_info` (the original
    // "force them back through the form" semantic); for any other
    // status it's purely a resend so people who lost their original
    // email can ask HR for a new one regardless of where they are in
    // the registration flow. Inactive employees are rejected by the
    // edge function unless `options.allowInactive` is passed — the
    // resend dialog ticks that flag only after HR sees an explicit
    // warning about each inactive row.
    const appUrl =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : undefined;

    const result = await callEdgeFunction('request-profile-verification', {
      profile_ids: profileIds,
      ...(appUrl ? { app_url: appUrl } : {}),
      ...(options?.allowInactive ? { allow_inactive: true } : {}),
    });
    return (result.results ?? []) as RequestProfileVerificationResult[];
  },

  async requestInfoFormUpdate(profileIds, comment) {
    // No password reset, NOT a rejection. For each employee: route the
    // status change through the HR-only chokepoint RPC (active →
    // pending_info, or a clock-restarting re-send if they're already
    // pending_info / info_rejected), set the optional comment as
    // registration_note, send a *neutral* in-app notif + the neutral
    // `info_form_request` email. Iterates client-side because each step
    // uses an already-wired service / edge function.
    const results: RequestProfileVerificationResult[] = [];
    for (const id of profileIds) {
      try {
        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('id, email, full_name, registration_status, is_active')
          .eq('id', id)
          .single();
        if (profErr || !profile) throw new Error('Profile not found');
        if (!profile.is_active) {
          throw new Error('Cannot request info update from an inactive employee');
        }

        // Chokepoint: enforces the legal transition, stamps
        // form_request_sent_at (the salary-hold clock), and the DB
        // trigger audits the status/note change.
        const { error: rpcErr } = await supabase.rpc('hr_set_registration_status', {
          p_user_id: id,
          p_action: 'request_info',
          p_note: comment?.trim() || null,
        });
        if (rpcErr) throw new Error(rpcErr.message);

        await supabase.from('notifications').insert({
          user_id: id,
          type: 'registration_info_requested',
          title: 'HR has asked you to update your profile',
          body: comment?.trim() || 'Please sign in and update your registration info.',
        });

        try {
          await callEdgeFunction('send-registration-email', {
            type: 'info_form_request',
            recipientEmail: profile.email,
            recipientName: profile.full_name,
            data: { reason: comment?.trim() },
          });
        } catch {
          /* email failure is non-fatal — status change + notif already landed */
        }

        results.push({ profile_id: id, success: true });
      } catch (err: any) {
        results.push({ profile_id: id, success: false, error: err.message });
      }
    }
    return results;
  },

  async sendFormWarning(profileIds, message) {
    // Ad-hoc HR warning. Calls log_manual_form_warning to record it,
    // then sends the `manual_form_warning` email. No status change.
    const results: RequestProfileVerificationResult[] = [];
    for (const id of profileIds) {
      try {
        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('id, email, full_name, is_active')
          .eq('id', id)
          .single();
        if (profErr || !profile) throw new Error('Profile not found');

        const { error: logErr } = await supabase.rpc('log_manual_form_warning', {
          p_employee_id: id,
          p_message: message?.trim() || null,
        });
        if (logErr) throw new Error(logErr.message);

        try {
          await callEdgeFunction('send-registration-email', {
            type: 'manual_form_warning',
            recipientEmail: profile.email,
            recipientName: profile.full_name,
            data: { message: message?.trim() },
          });
        } catch {
          /* same as above — log already saved */
        }

        results.push({ profile_id: id, success: true });
      } catch (err: any) {
        results.push({ profile_id: id, success: false, error: err.message });
      }
    }
    return results;
  },
};
