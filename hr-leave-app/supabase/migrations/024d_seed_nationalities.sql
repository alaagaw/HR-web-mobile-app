-- ============================================================
-- 024d – Seed the standard set of nationalities
--
-- Migration 023 only seeded lookup_nationalities from whatever
-- distinct values existed on profiles at the time — which in
-- testing was just "Saudi". The 10 nationalities below are the
-- ones HR's PolyTech employee roster carries, plus a few they
-- expect to add in the near term.
--
-- TitleCase canonical form (first letter upper, rest lower) — the
-- CHECK constraint on lookup_nationalities.name enforces this.
-- ============================================================

INSERT INTO public.lookup_nationalities (name) VALUES
  ('Bangladeshi'),
  ('Egyptian'),
  ('Filipino'),
  ('Indian'),
  ('Moroccan'),
  ('Nepali'),
  ('Pakistani'),
  ('Saudi'),
  ('Srilankan'),
  ('Sudani')
ON CONFLICT (name) DO NOTHING;
