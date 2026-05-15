// ============================================================
// extract-document-text Edge Function
//
// HR-only. Called by the app right after a new document version is
// uploaded. Pulls the plain text out of the file so it becomes
// full-text searchable (hr_document_versions.extracted_text -> the
// generated search_tsv column + GIN index).
//
// Supported in v1:  PDF, DOCX (Word), XLSX (Excel).
// Not yet:          legacy .doc, and OCR for images / scanned PDFs
//                   (deferred to a private v2 worker — see the design
//                   thread). For those we simply store no text; the
//                   document is still usable, just not content-search-
//                   able, and search still matches its title/tags.
//
// Extraction is BEST EFFORT: any parser failure is swallowed and the
// version is left with extracted_text = null. A bad/odd file must
// never make the HR upload flow fail.
//
// Request:  { version_id: string }
// Response: { ok: true, chars: number, skipped?: string }
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BUCKET = 'hr-documents';
// Cap stored text so a giant spreadsheet can't bloat the row / tsvector.
const MAX_TEXT_CHARS = 500_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PDF = 'application/pdf';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function extractPdf(buf: ArrayBuffer): Promise<string> {
  const { getDocumentProxy, extractText } = await import('https://esm.sh/unpdf@0.12.1');
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join('\n') : String(text ?? '');
}

async function extractDocx(buf: ArrayBuffer): Promise<string> {
  const mammoth = (await import('https://esm.sh/mammoth@1.8.0')).default;
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return value ?? '';
}

async function extractXlsx(buf: ArrayBuffer): Promise<string> {
  const XLSXLib = await import('https://esm.sh/xlsx@0.18.5');
  const wb = XLSXLib.read(new Uint8Array(buf), { type: 'array' });
  const parts: string[] = [];
  for (const name of wb.SheetNames) {
    parts.push(`# ${name}`);
    parts.push(XLSXLib.utils.sheet_to_csv(wb.Sheets[name]));
  }
  return parts.join('\n');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Authenticate caller — uploads are HR-only.
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
    if (!callerProfile || !['hr', 'hr_director'].includes(callerProfile.role)) {
      throw new Error('Only HR staff can index documents');
    }

    // 2. Load the version row.
    const payload = await req.json();
    const versionId: string | undefined = payload?.version_id;
    if (!versionId) throw new Error('version_id is required');

    const { data: version, error: vErr } = await supabase
      .from('hr_document_versions')
      .select('id, file_path, file_type')
      .eq('id', versionId)
      .single();
    if (vErr || !version) throw new Error('Version not found');

    // 3. Pick an extractor. Unsupported types short-circuit cleanly.
    let extractor: ((b: ArrayBuffer) => Promise<string>) | null = null;
    if (version.file_type === PDF) extractor = extractPdf;
    else if (version.file_type === DOCX) extractor = extractDocx;
    else if (version.file_type === XLSX) extractor = extractXlsx;

    if (!extractor) {
      return new Response(
        JSON.stringify({ ok: true, chars: 0, skipped: version.file_type }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 4. Download + extract. Best effort: never throw past here.
    let text = '';
    try {
      const { data: blob, error: dlErr } = await supabase.storage
        .from(BUCKET)
        .download(version.file_path);
      if (dlErr || !blob) throw new Error(dlErr?.message || 'download failed');
      const buf = await blob.arrayBuffer();
      text = (await extractor(buf)) ?? '';
    } catch (_parseErr) {
      text = '';
    }

    text = text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_CHARS);

    // 5. Persist. The trg_hr_doc_versions_tsv trigger recomputes
    //    search_tsv from extracted_text on this UPDATE.
    const { error: upErr } = await supabase
      .from('hr_document_versions')
      .update({ extracted_text: text.length ? text : null })
      .eq('id', versionId);
    if (upErr) throw new Error(upErr.message);

    return new Response(
      JSON.stringify({ ok: true, chars: text.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
