-- ============================================================
-- 043 — HR document folders get a visibility flag
--
-- Folders now carry the same all / hr_only visibility as documents
-- (migration 041). HR can flag a whole folder HR-only on create or
-- edit. The folder SELECT policy is tightened so non-HR users only
-- ever receive folders with visibility = 'all'; an HR-only folder
-- (and, because the client builds the tree from the rows it gets,
-- its subtree) simply doesn't appear for them.
--
-- Writes stay HR-only via the existing hr_folders_write policy.
-- Document visibility is independent: a visibility='all' document is
-- still readable on its own even if its folder is hr_only — it just
-- won't be reachable via that hidden folder in the tree.
--
-- Apply: supabase db query --linked -f 043_hr_folder_visibility.sql
-- ============================================================

ALTER TABLE public.hr_document_folders
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'all'
    CHECK (visibility IN ('all', 'hr_only'));

-- Tighten read access: HR sees every folder; everyone else only the
-- ones explicitly shared with all employees.
DROP POLICY IF EXISTS hr_folders_select ON public.hr_document_folders;
CREATE POLICY hr_folders_select ON public.hr_document_folders
  FOR SELECT USING (
    public.is_hr_user()
    OR (visibility = 'all' AND auth.uid() IS NOT NULL)
  );
