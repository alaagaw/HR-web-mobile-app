-- ============================================================
-- 041 — HR Policies & Documents
--
-- A company-wide policy / document library that HR curates and the
-- whole company reads. Three tables model it:
--
--   hr_document_folders   The navigation tree (self-referencing).
--                         Drives the MUI RichTreeView on web.
--   hr_documents          A logical document (title, folder, tags,
--                         status, visibility) — the thing people open.
--   hr_document_versions  Every uploaded file. Immutable history:
--                         "replace" = new version row + pointer move.
--                         Nothing is ever destroyed, so HR can always
--                         reactivate or roll back.
--
-- Security model:
--   * Any signed-in employee may READ folders and ACTIVE documents
--     whose visibility = 'all' (company policies are for everyone).
--   * Documents with visibility = 'hr_only', or status = 'archived',
--     are visible to HR / HR Director only.
--   * Only HR / HR Director may create/edit/version/archive anything.
--   * Files live in a PRIVATE storage bucket. Employees never read
--     storage directly — the `hr-document-url` edge function mints a
--     short-lived signed URL after re-checking visibility. Direct
--     bucket access is HR-only (storage.objects policy below).
--
-- Full-text content search: hr_document_versions.extracted_text is
-- populated by the `extract-document-text` edge function on upload
-- (PDF / Word / Excel in v1; OCR for images/scans is a later phase).
-- A generated tsvector + GIN index makes the contents searchable.
--
-- Apply: supabase db query --linked < 041_hr_policies.sql
-- ============================================================

-- ── Helper: is the current caller HR / HR Director? ──────────
-- SECURITY DEFINER so it reads profiles without tripping RLS, and
-- because the policies below live on *other* tables there is no
-- recursion risk (cf. migration 022). STABLE: same answer within a
-- statement.

CREATE OR REPLACE FUNCTION public.is_hr_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('hr', 'hr_director')
  );
$$;

-- ── Shared updated_at trigger ────────────────────────────────

CREATE OR REPLACE FUNCTION public.tg_hr_docs_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 1. Folders (the tree) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hr_document_folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES public.hr_document_folders(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_doc_folders_parent
  ON public.hr_document_folders(parent_id);

DROP TRIGGER IF EXISTS trg_hr_doc_folders_updated_at ON public.hr_document_folders;
CREATE TRIGGER trg_hr_doc_folders_updated_at
  BEFORE UPDATE ON public.hr_document_folders
  FOR EACH ROW EXECUTE FUNCTION public.tg_hr_docs_set_updated_at();

-- ── 2. Documents (logical record) ────────────────────────────

CREATE TABLE IF NOT EXISTS public.hr_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id           UUID REFERENCES public.hr_document_folders(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  tags                TEXT[] NOT NULL DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'archived')),
  visibility          TEXT NOT NULL DEFAULT 'all'
                        CHECK (visibility IN ('all', 'hr_only')),
  current_version_id  UUID,   -- FK added after versions table exists
  created_by          UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at         TIMESTAMPTZ,
  archived_by         UUID REFERENCES public.profiles(id)
);

-- title/description/tags get their own tsvector so the title search and
-- the in-content search (on versions) can be OR'd in one query. This is
-- a trigger-maintained column, not GENERATED: a STORED generated column
-- demands a strictly-immutable expression and to_tsvector() with a text-
-- search config is rejected there (ERROR 42P17). The trigger has no such
-- restriction and produces identical results.
ALTER TABLE public.hr_documents
  ADD COLUMN IF NOT EXISTS meta_tsv TSVECTOR;

CREATE OR REPLACE FUNCTION public.tg_hr_documents_tsv()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.meta_tsv := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_documents_tsv ON public.hr_documents;
CREATE TRIGGER trg_hr_documents_tsv
  BEFORE INSERT OR UPDATE OF title, description, tags ON public.hr_documents
  FOR EACH ROW EXECUTE FUNCTION public.tg_hr_documents_tsv();

CREATE INDEX IF NOT EXISTS idx_hr_documents_folder
  ON public.hr_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_hr_documents_status
  ON public.hr_documents(status);
CREATE INDEX IF NOT EXISTS idx_hr_documents_meta_tsv
  ON public.hr_documents USING GIN (meta_tsv);

DROP TRIGGER IF EXISTS trg_hr_documents_updated_at ON public.hr_documents;
CREATE TRIGGER trg_hr_documents_updated_at
  BEFORE UPDATE ON public.hr_documents
  FOR EACH ROW EXECUTE FUNCTION public.tg_hr_docs_set_updated_at();

-- ── 3. Versions (immutable file history) ─────────────────────

CREATE TABLE IF NOT EXISTS public.hr_document_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES public.hr_documents(id) ON DELETE CASCADE,
  version_no      INT NOT NULL,
  file_path       TEXT NOT NULL,            -- path within hr-documents bucket
  file_name       TEXT NOT NULL,
  file_size       BIGINT NOT NULL DEFAULT 0,
  file_type       TEXT NOT NULL,            -- MIME type
  extracted_text  TEXT,                     -- filled by extract-document-text
  search_tsv      TSVECTOR,                 -- maintained by trg_hr_doc_versions_tsv
  change_note     TEXT,
  uploaded_by     UUID REFERENCES public.profiles(id),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_no)
);

CREATE INDEX IF NOT EXISTS idx_hr_doc_versions_document
  ON public.hr_document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_hr_doc_versions_tsv
  ON public.hr_document_versions USING GIN (search_tsv);

-- Content search vector — trigger-maintained for the same immutability
-- reason as hr_documents.meta_tsv. extract-document-text writes
-- extracted_text; this keeps search_tsv in lock-step.
CREATE OR REPLACE FUNCTION public.tg_hr_doc_versions_tsv()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_tsv := to_tsvector('english', coalesce(NEW.extracted_text, ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_doc_versions_tsv ON public.hr_document_versions;
CREATE TRIGGER trg_hr_doc_versions_tsv
  BEFORE INSERT OR UPDATE OF extracted_text ON public.hr_document_versions
  FOR EACH ROW EXECUTE FUNCTION public.tg_hr_doc_versions_tsv();

-- Now wire the documents -> current version pointer.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_hr_documents_current_version'
  ) THEN
    ALTER TABLE public.hr_documents
      ADD CONSTRAINT fk_hr_documents_current_version
      FOREIGN KEY (current_version_id)
      REFERENCES public.hr_document_versions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ── 4. Row Level Security ────────────────────────────────────

ALTER TABLE public.hr_document_folders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_document_versions ENABLE ROW LEVEL SECURITY;

-- Folders: any signed-in user reads; HR writes.
DROP POLICY IF EXISTS hr_folders_select ON public.hr_document_folders;
CREATE POLICY hr_folders_select ON public.hr_document_folders
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS hr_folders_write ON public.hr_document_folders;
CREATE POLICY hr_folders_write ON public.hr_document_folders
  FOR ALL USING (public.is_hr_user()) WITH CHECK (public.is_hr_user());

-- Documents: HR sees everything; everyone else sees only ACTIVE +
-- visibility 'all'. HR is the only writer.
DROP POLICY IF EXISTS hr_documents_select ON public.hr_documents;
CREATE POLICY hr_documents_select ON public.hr_documents
  FOR SELECT USING (
    public.is_hr_user()
    OR (status = 'active' AND visibility = 'all' AND auth.uid() IS NOT NULL)
  );

DROP POLICY IF EXISTS hr_documents_write ON public.hr_documents;
CREATE POLICY hr_documents_write ON public.hr_documents
  FOR ALL USING (public.is_hr_user()) WITH CHECK (public.is_hr_user());

-- Versions: visible iff the parent document is visible to the caller.
DROP POLICY IF EXISTS hr_doc_versions_select ON public.hr_document_versions;
CREATE POLICY hr_doc_versions_select ON public.hr_document_versions
  FOR SELECT USING (
    public.is_hr_user()
    OR EXISTS (
      SELECT 1 FROM public.hr_documents d
      WHERE d.id = hr_document_versions.document_id
        AND d.status = 'active'
        AND d.visibility = 'all'
    )
  );

DROP POLICY IF EXISTS hr_doc_versions_write ON public.hr_document_versions;
CREATE POLICY hr_doc_versions_write ON public.hr_document_versions
  FOR ALL USING (public.is_hr_user()) WITH CHECK (public.is_hr_user());

-- ── 5. Search RPC ────────────────────────────────────────────
-- SECURITY INVOKER (default): RLS still applies, so an employee only
-- ever gets documents they're allowed to see. Matches the title /
-- description / tags tsvector OR the current version's content tsv,
-- with a plain-ILIKE fallback for short / partial queries.

CREATE OR REPLACE FUNCTION public.search_hr_documents(p_query TEXT)
RETURNS SETOF public.hr_documents
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT d.*
  FROM public.hr_documents d
  LEFT JOIN public.hr_document_versions v
    ON v.id = d.current_version_id
  WHERE
    p_query IS NULL
    OR btrim(p_query) = ''
    OR d.meta_tsv @@ websearch_to_tsquery('english', p_query)
    OR v.search_tsv @@ websearch_to_tsquery('english', p_query)
    OR d.title ILIKE '%' || p_query || '%'
    OR coalesce(d.description, '') ILIKE '%' || p_query || '%'
    OR coalesce(array_to_string(d.tags, ' '), '') ILIKE '%' || p_query || '%'
  ORDER BY d.updated_at DESC;
$$;

-- ── 6. Private storage bucket + policies ─────────────────────
-- 25 MB cap; allowed MIME types kept in sync with lib/constants.ts
-- (HR_DOC_ALLOWED_TYPES). Bucket is PRIVATE (public = false).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hr-documents',
  'hr-documents',
  false,
  26214400,  -- 25 * 1024 * 1024
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Direct object access is HR-only. Employees fetch files exclusively
-- through the hr-document-url edge function (service role + visibility
-- re-check), so there is no employee-facing storage policy by design.
DROP POLICY IF EXISTS hr_documents_storage_hr_all ON storage.objects;
CREATE POLICY hr_documents_storage_hr_all ON storage.objects
  FOR ALL
  USING (bucket_id = 'hr-documents' AND public.is_hr_user())
  WITH CHECK (bucket_id = 'hr-documents' AND public.is_hr_user());
