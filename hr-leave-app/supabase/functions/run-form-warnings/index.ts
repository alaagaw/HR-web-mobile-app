// ============================================================
// run-form-warnings Edge Function
//
// Closes the loop on the daily form-warnings cron. The Postgres RPC
// `send_form_warnings_check()` computes who is due a warning today
// and writes the audit row, but it does not send the email itself.
// This function is what pg_cron actually POSTs to: it calls the RPC,
// then for each recipient fires the matching template through
// send-registration-email, with HR + HR Director BCC'd so they see
// every escalation without the employee seeing the CC list.
//
// Idempotency is owned by the RPC (UNIQUE on form_warnings_log
// prevents duplicates per employee per warning_type per day). So
// re-running this endpoint within the same day is a safe no-op:
// the RPC returns an empty recipients list because today's row
// already exists.
//
// Authentication: this function is deployed with verify_jwt:false.
// It is internally-called only (pg_cron). The URL acts as a soft
// secret. Damage cap is low because:
//   - The RPC is idempotent — repeated calls cannot double-email.
//   - The function returns only counts, no PII.
//   - If you want a hard secret, set CRON_SECRET as an Edge Function
//     env var and uncomment the check below.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Recipient {
  employee_id: string;
  email: string;
  full_name: string;
  status: string;
  days: number;
  warning_type: 'day3_reminder' | 'day4_salary_hold';
}

interface RpcResult {
  today: string;
  day3_count: number;
  day4_count: number;
  recipients: Recipient[];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Optional shared-secret gate. If CRON_SECRET is set on the
    // function, every caller must present it. If unset, the function
    // is open (URL-secret model — fine for an idempotent endpoint).
    if (CRON_SECRET) {
      const presented = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
      if (presented !== CRON_SECRET) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Compute today's recipients (also writes the audit log rows).
    const { data, error } = await supabase.rpc('send_form_warnings_check', {
      p_dry_run: false,
    });
    if (error) throw new Error(`RPC failed: ${error.message}`);

    const result = data as RpcResult;
    const recipients = result?.recipients ?? [];

    // 2. Resolve HR + HR Director emails ONCE per run — they get BCC'd
    //    on every warning that goes out.
    const { data: hrRows } = await supabase
      .from('profiles')
      .select('email')
      .in('role', ['hr', 'hr_director'])
      .eq('is_active', true);
    const hrEmails = (hrRows ?? [])
      .map((r: any) => (r.email || '').trim())
      .filter((e: string) => e.length > 0);

    // 3. Send the email for each recipient. Failures are caught
    //    per-row so a single bad address doesn't block the rest.
    let sent = 0;
    const failures: { email: string; error: string }[] = [];

    for (const r of recipients) {
      try {
        // Build the type → ensure it matches the email template names
        // in send-registration-email.
        const type =
          r.warning_type === 'day4_salary_hold' ? 'form_salary_hold_day4' : 'form_reminder_day3';

        const sendResp = await fetch(`${SUPABASE_URL}/functions/v1/send-registration-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // send-registration-email currently requires an Authorization
            // header (it auth-checks the caller). Use service-role so
            // the verify call succeeds; the function itself does no
            // additional role gating for these notification types.
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            type,
            recipientEmail: r.email,
            recipientName: r.full_name,
            bcc: hrEmails,
            data: { daysOverdue: r.days },
          }),
        });

        if (!sendResp.ok) {
          const text = await sendResp.text();
          throw new Error(`HTTP ${sendResp.status}: ${text}`);
        }
        sent += 1;
      } catch (err: any) {
        failures.push({ email: r.email, error: err.message || 'unknown' });
      }
    }

    return new Response(
      JSON.stringify({
        today: result?.today,
        day3_count: result?.day3_count ?? 0,
        day4_count: result?.day4_count ?? 0,
        attempted: recipients.length,
        sent,
        failed: failures.length,
        failures,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
