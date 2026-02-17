import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:8081';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'HR System <noreply@yourdomain.com>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitePayload {
  email: string;
  full_name: string;
  role: string;
  department: string;
  supervisor_id: string | null;
  manager_id: string | null;
  invited_by: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the caller is HR/HR Director
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const callerToken = authHeader.replace('Bearer ', '');
    const {
      data: { user: caller },
    } = await supabase.auth.getUser(callerToken);
    if (!caller) throw new Error('Invalid token');

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (!callerProfile || !['hr', 'hr_director'].includes(callerProfile.role)) {
      throw new Error('Only HR staff can invite employees');
    }

    const payload: InvitePayload = await req.json();

    if (!payload.email || !payload.full_name || !payload.role) {
      throw new Error('email, full_name, and role are required');
    }

    // Check for existing user with this email
    const { data: existingList } = await supabase.auth.admin.listUsers();
    const existingUser = existingList?.users?.find(
      (u: any) => u.email === payload.email
    );

    if (existingUser) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('registration_status')
        .eq('id', existingUser.id)
        .single();

      if (existingProfile?.registration_status === 'active') {
        throw new Error('A user with this email already exists and is active');
      }

      // Adopt pending self-registrations
      if (
        ['pending_info', 'pending_approval', 'email_unverified', 'rejected'].includes(
          existingProfile?.registration_status ?? ''
        )
      ) {
        await supabase
          .from('profiles')
          .update({
            full_name: payload.full_name,
            role: payload.role,
            department: payload.department,
            supervisor_id: payload.supervisor_id,
            manager_id: payload.manager_id,
            invited_by: payload.invited_by,
            registration_status: 'active',
            must_change_password: false,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id);

        await supabase.rpc('create_default_leave_balances', {
          p_employee_id: existingUser.id,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Existing registration adopted and approved',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();

    // Create auth user (email pre-confirmed, trigger auto-creates profile)
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email: payload.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: payload.full_name,
          role: payload.role,
          registration_status: 'active',
          must_change_password: true,
        },
      });

    if (createError) throw new Error(`Failed to create user: ${createError.message}`);
    if (!newUser.user) throw new Error('User creation returned no user');

    // Update profile with org chart fields (trigger created the base profile)
    await supabase
      .from('profiles')
      .update({
        department: payload.department,
        supervisor_id: payload.supervisor_id,
        manager_id: payload.manager_id,
        invited_by: payload.invited_by,
        updated_at: new Date().toISOString(),
      })
      .eq('id', newUser.user.id);

    // Create default leave balances
    await supabase.rpc('create_default_leave_balances', {
      p_employee_id: newUser.user.id,
    });

    // Send invitation email via Resend
    await sendInviteEmail(payload.email, payload.full_name, tempPassword);

    // In-app notification for the new user
    await supabase.from('notifications').insert({
      user_id: newUser.user.id,
      type: 'employee_invited',
      title: 'Welcome to HR System',
      body: 'Your account has been created. Please sign in and change your password.',
    });

    return new Response(
      JSON.stringify({ success: true, userId: newUser.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function sendInviteEmail(
  email: string,
  name: string,
  tempPassword: string
) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [email],
      subject: 'Welcome to HR System — Your Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1E40AF;">Welcome, ${name}!</h2>
          <p>Your HR System account has been created.</p>
          <div style="background: #F1F5F9; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 4px 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p>Please sign in and change your password immediately.</p>
          <a href="${APP_URL}" style="display: inline-block; background: #2563EB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px;">
            Open HR System
          </a>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    console.error('Failed to send invite email:', await response.text());
  }
}
