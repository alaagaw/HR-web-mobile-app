// ============================================================
// Resend (https://resend.com) — REST adapter
//
// Requires RESEND_API_KEY in the Edge Function environment.
// Sender domain (the @-domain in `from`) MUST be verified in Resend
// via DKIM/SPF/DMARC DNS records, otherwise the API rejects the call.
// ============================================================

import type { SendEmailInput } from '../email.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

export async function sendViaResend(input: Required<Omit<SendEmailInput, 'replyTo'>> & { replyTo?: string }): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured on this Edge Function.');
  }

  const body: Record<string, unknown> = {
    from: input.from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
  };
  if (input.replyTo) body.reply_to = input.replyTo;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend rejected the send (${response.status}): ${errorText}`);
  }
}
