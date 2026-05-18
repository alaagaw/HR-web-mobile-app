-- ============================================================
-- 056 – hr_activate_specialization(name)
--
-- Closes the specialization loop: an employee-typed specialization
-- is stored is_active=false (migration 052) so it stays out of the
-- shared autocomplete until HR endorses it. When HR approves the
-- registration (review dialog), it calls this to flip the row
-- is_active=true so it appears for everyone next time.
--
-- Additive & safe: a new SECURITY DEFINER function only (no
-- chokepoint/RPC behaviour changed). HR / HR_Director only.
-- Idempotent; name is trim+collapse normalised to match how
-- 052/054 store it.
-- ============================================================

CREATE OR REPLACE FUNCTION public.hr_activate_specialization(p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := NULLIF(trim(regexp_replace(coalesce(p_name,''), '\s+', ' ', 'g')), '');
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
     WHERE id = auth.uid() AND role IN ('hr','hr_director')
  ) THEN
    RAISE EXCEPTION 'Only HR can activate specializations';
  END IF;

  IF v_name IS NULL THEN
    RETURN;
  END IF;

  -- Create-or-activate (covers the rare case the row was pruned).
  INSERT INTO lookup_specializations (name, is_active, created_by)
  VALUES (v_name, true, auth.uid())
  ON CONFLICT (name) DO UPDATE SET is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hr_activate_specialization(text) TO authenticated;
