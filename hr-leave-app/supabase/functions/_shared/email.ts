// ============================================================
// Pluggable email transport for Supabase Edge Functions.
//
// Switch providers by setting EMAIL_PROVIDER env var:
//   "resend"   (default) | "brevo" | "sendgrid"
//
// All providers implement the same EmailProvider interface.
// Adding a new one = drop a file in ./providers/ and add a case below.
// ============================================================

import { sendViaResend } from './providers/resend.ts';

export interface SendEmailInput {
  /** Recipient address. */
  to: string;
  /** Subject line. */
  subject: string;
  /** Full HTML body. */
  html: string;
  /**
   * Optional From override. Format: `Display Name <addr@domain>` or just `addr@domain`.
   * Falls back to the EMAIL_FROM env var when omitted. Domain MUST be verified
   * with the active provider, otherwise the send is rejected.
   */
  from?: string;
  /** Optional Reply-To override. */
  replyTo?: string;
}

export interface EmailProvider {
  send(input: Required<Omit<SendEmailInput, 'replyTo'>> & { replyTo?: string }): Promise<void>;
}

const DEFAULT_FROM =
  Deno.env.get('EMAIL_FROM') ?? 'HR System <noreply@polytech.com.sa>';
const PROVIDER = (Deno.env.get('EMAIL_PROVIDER') ?? 'resend').toLowerCase();

/**
 * Send a transactional email through the active provider.
 *
 * Throws on any failure (including non-2xx provider responses) so callers
 * surface real errors to the UI instead of silently succeeding.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const from = input.from ?? DEFAULT_FROM;
  const payload = { ...input, from };

  switch (PROVIDER) {
    case 'resend':
      await sendViaResend(payload);
      return;
    // case 'brevo':
    //   await sendViaBrevo(payload);
    //   return;
    // case 'sendgrid':
    //   await sendViaSendgrid(payload);
    //   return;
    default:
      throw new Error(
        `Unknown EMAIL_PROVIDER "${PROVIDER}". Supported: resend (default).`
      );
  }
}
