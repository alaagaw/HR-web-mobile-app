-- ============================================================
-- 047 – Access superuser capability
--
-- Adds is_superuser to profile_capabilities. An access superuser
-- bypasses ALL access_policies rules everywhere (set by HR per
-- employee in Edit Employee, decoupled from Role).
--
-- This REPLACES the old blanket "HR/HR_Director sees everything"
-- failsafe (which made it impossible to ever restrict a page
-- away from regular HR). The only remaining hardcoded floor is
-- enforced in the app: HR & HR_Director can always reach the
-- Access Control screen + HR Admin menu (and nothing else), so
-- a bad policy / zero superusers can never permanently brick
-- policy management.
--
-- Additive & behaviour-preserving: defaults false, so before HR
-- flags anyone, only the minimal app-side HR floor + each page's
-- existing rules apply. profile_capabilities RLS is unchanged
-- (own-read + HR-write), so a user can read their own flag for
-- the client-side bypass check but cannot self-promote.
-- ============================================================

ALTER TABLE public.profile_capabilities
  ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profile_caps_superuser
  ON public.profile_capabilities(profile_id) WHERE is_superuser = true;
