// ============================================================
// hr-document-url Edge Function
//
// Mints a short-lived signed URL for a single HR document version,
// AFTER re-checking that the caller is allowed to see it. The
// hr-documents bucket is private and has no employee-facing storage
// policy by design — every preview/download for a non-HR user flows
// through here so confidential ('hr_only') and archived documents
// never leak.
//
// Request:  { version_id: string, download?: boolean }
//   download=true -> URL forces a file download (Content-Disposition
//                    attachment) with the original filename.
//   download=false/omitted -> URL renders inline (for previews).
//
// Response: { url, file_name, file_type, expires_in }
//
// Access rule (mirrors the hr_documents RLS):
//   * HR / HR Director  -> any version of any document.
//   * Everyone else     -> only versions whose parent document is
//                          status='active' AND visibility='all'.
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BUCKET = 'hr-documents';
const SIGNED_URL_TTL_SECONDS = 120;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Authenticate caller.
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
    const isHr = !!callerProfile && ['hr', 'hr_director'].includes(callerProfile.role);

    // 2. Resolve the requested version + its parent document.
    const payload = await req.json();
    const versionId: string | undefined = payload?.version_id;
    const wantDownload = !!payload?.download;
    if (!versionId) throw new Error('version_id is required');

    const { data: version, error: vErr } = await supabase
      .from('hr_document_versions')
      .select('id, document_id, file_path, file_name, file_type')
      .eq('id', versionId)
      .single();
    if (vErr || !version) throw new Error('Version not found');

    const { data: doc, error: dErr } = await supabase
      .from('hr_documents')
      .select('status, visibility')
      .eq('id', version.document_id)
      .single();
    if (dErr || !doc) throw new Error('Document not found');

    // 3. Enforce visibility.
    const publiclyVisible = doc.status === 'active' && doc.visibility === 'all';
    if (!isHr && !publiclyVisible) {
      return new Response(
        JSON.stringify({ error: 'You do not have access to this document' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 4. Mint the signed URL.
    const { data: signed, error: sErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(
        version.file_path,
        SIGNED_URL_TTL_SECONDS,
        wantDownload ? { download: version.file_name } : {},
      );
    if (sErr || !signed) throw new Error(sErr?.message || 'Could not create signed URL');

    return new Response(
      JSON.stringify({
        url: signed.signedUrl,
        file_name: version.file_name,
        file_type: version.file_type,
        expires_in: SIGNED_URL_TTL_SECONDS,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
