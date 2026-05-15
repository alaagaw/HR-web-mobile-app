-- ============================================================
-- 038 - Backfill nationality + correct emp_code for the 92 employees
--       that no roster covered (HR supplied the values via
--       employees_missing_nationality.csv).
--
-- Context:
--   * After migration 037, 92 active employees were still NULL because
--     their emp_code was a wrong 90xxx placeholder absent from every
--     roster.  HR provided the correct emp_code (70xxx) AND nationality
--     in the CSV.  Rows were matched to profiles by EMAIL (the stable
--     key HR did not change); verified 92/92, 0 anomalies, 0 emp_code
--     collisions (no dup in CSV, no 70xxx already owned by another
--     employee).  This file is keyed by immutable profile id.
--   * All nationality values are already canonical (the 036 trigger,
--     live in prod, would canonicalise + auto-register anyway).
--   * 89 rows change emp_code (90xxx -> 70xxx); the rest only get
--     nationality.  All 92 already have an employee_documents row.
--
-- Reversal:
--   UPDATE profiles p SET nationality = l.old_nationality
--     FROM nationality_backfill_038_log l
--    WHERE l.profile_id = p.id AND l.run_id =
--          (SELECT max(run_id) FROM nationality_backfill_038_log);
--   UPDATE employee_documents e SET emp_code = l.old_emp_code
--     FROM nationality_backfill_038_log l
--    WHERE l.profile_id = e.employee_id AND l.old_emp_code IS NOT NULL
--      AND l.run_id = (SELECT max(run_id) FROM nationality_backfill_038_log);
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.nationality_backfill_038_log (
  id              BIGSERIAL PRIMARY KEY,
  run_id          BIGINT      NOT NULL,
  profile_id      UUID        NOT NULL,
  matched_via     TEXT        NOT NULL DEFAULT 'email',
  old_nationality TEXT,
  new_nationality TEXT        NOT NULL,
  old_emp_code    TEXT,
  new_emp_code    TEXT,
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TEMP TABLE _m(profile_id UUID PRIMARY KEY, nationality TEXT NOT NULL, new_emp_code TEXT)
  ON COMMIT DROP;
INSERT INTO _m (profile_id, nationality, new_emp_code) VALUES
  ('5cc02954-df07-48a7-b436-ac07ef232b53'::uuid, 'Saudi', '00000'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'Saudi', '00400'),
  ('440ba757-40f4-4954-9356-0a533040d872'::uuid, 'Saudi', '00500'),
  ('10da9e41-b3c2-4570-8fb0-6dd4c2467109'::uuid, 'Indian', '70165'),
  ('80899d40-2916-4484-b6b5-545b89942499'::uuid, 'Pakistani', '70393'),
  ('ebc146ad-1a1f-48ca-8114-f56c84461575'::uuid, 'Indian', '70111'),
  ('7fc6fbeb-d1aa-4b08-9d63-ca26a074a0a6'::uuid, 'Bangladeshi', '70100'),
  ('817aa215-9ef1-4aa2-bccc-cfaadb2b1b1a'::uuid, 'Pakistani', '70471'),
  ('9906bfb1-7a1f-469f-b3f7-937f27a7cc14'::uuid, 'Bangladeshi', '70130'),
  ('67880c2e-a433-465f-a8fb-de52e31f81cd'::uuid, 'Bangladeshi', '70154'),
  ('c38d2d47-0235-4804-ae2c-5aa50f5abfaa'::uuid, 'Bangladeshi', '70117'),
  ('893c48d2-6788-4ed6-a709-7c0983290acd'::uuid, 'Bangladeshi', '70097'),
  ('0057a136-22e2-4765-b6b9-518a41ee4179'::uuid, 'Indian', '70084'),
  ('1b0379fb-d12e-46e6-bfaf-f51c30481038'::uuid, 'Indian', '70403'),
  ('d5afd523-fbec-47c3-b5cf-bc0f6dc9308a'::uuid, 'Pakistani', '70656'),
  ('55d5fdd0-799d-4b76-856f-67009d1393f6'::uuid, 'Indian', '70160'),
  ('aa562364-f23d-44ca-a507-83a2e0e158b0'::uuid, 'Nepali', '70169'),
  ('2ab75170-1abb-4cb7-8df6-86ce7284cd23'::uuid, 'Pakistani', '70401'),
  ('d5ca270b-cfdc-4b5c-84e5-502100be58bc'::uuid, 'Sudani', '70071'),
  ('ac9822a0-1343-482d-9230-0bff54d8876e'::uuid, 'Indian', '70090'),
  ('0dd86cd7-31e4-43bc-8de6-e30dd7126731'::uuid, 'Indian', '70189'),
  ('0017e64c-095f-451b-9ae1-fb68c92194b9'::uuid, 'Nepali', '70467'),
  ('36f9554e-3a86-4aeb-b87d-fd14a336e210'::uuid, 'Pakistani', '70394'),
  ('6c0fdab1-3b6d-4fc7-9c91-3b4ddea46568'::uuid, 'Indian', '70125'),
  ('fcfaaf25-ec38-4929-8737-46de94c966af'::uuid, 'Indian', '70110'),
  ('ad202280-6741-44d8-9fce-372478d22850'::uuid, 'Pakistani', '70168'),
  ('b8f4a63e-d71e-42e4-b700-14381370bd7e'::uuid, 'Indian', '70149'),
  ('cdfd4dcf-b961-4cee-8293-6e87f05325fd'::uuid, 'Indian', '70390'),
  ('731e14f2-c685-427d-abfe-ead69d878aa0'::uuid, 'Indian', '70162'),
  ('6dfacedd-2195-4a24-9d84-8e4ad37a4068'::uuid, 'Pakistani', '70387'),
  ('611396d2-ee18-44d3-b9eb-3aff6ead6863'::uuid, 'Pakistani', '70400'),
  ('1fc43c40-3eb4-4d29-9375-7cf336ec9a37'::uuid, 'Moroccan', '70466'),
  ('af48101f-cead-42a6-ba47-e9abe6697c4a'::uuid, 'Pakistani', '70388'),
  ('00b5114d-054e-4921-be9e-3cf6c0f717d7'::uuid, 'Pakistani', '70383'),
  ('d31315c6-7b37-483f-a9ed-f5acef9d22b9'::uuid, 'Pakistani', '70213'),
  ('52b8f071-9f5f-471a-9f73-07c0f10da097'::uuid, 'Srilankan', '70218'),
  ('f8157761-32b7-4a7a-a09d-bb2e17d77611'::uuid, 'Pakistani', '70241'),
  ('d547e89b-88d9-4c86-b6a8-443f188fe91f'::uuid, 'Filipino', '70235'),
  ('448a887a-8f77-4dcc-824a-13a9b60c84c9'::uuid, 'Indian', '70389'),
  ('d2490b32-dc79-44e3-b2f8-9c60c4ba7a61'::uuid, 'Pakistani', '70391'),
  ('b1125f75-7f1f-441a-a884-d87008aca917'::uuid, 'Pakistani', '70370'),
  ('e8f2533f-2406-450e-b8d9-5e53237569d9'::uuid, 'Filipino', '70284'),
  ('bfa1263d-eee6-4dee-9dd4-f90b81c94827'::uuid, 'Filipino', '70286'),
  ('624e72be-930f-45e0-8e70-4e0fba296730'::uuid, 'Filipino', '70288'),
  ('c1103e0e-d17b-4341-b0af-e51c69e89d3f'::uuid, 'Nepali', '70314'),
  ('9da47df0-9137-44e4-bdd0-56af5f8e5583'::uuid, 'Nepali', '70315'),
  ('6d80fe13-5a27-4528-a822-2f2785118cc9'::uuid, 'Indian', '70331'),
  ('1fa77467-29c2-4902-91ae-e43b338b6486'::uuid, 'Bangladeshi', '70368'),
  ('3c5bd135-282b-46d5-964d-789d47269840'::uuid, 'Indian', '70447'),
  ('9a9d9fc2-b88d-40e6-890c-d4eb5205fff2'::uuid, 'Pakistani', '70661'),
  ('93157721-4c46-4886-9ccd-ff7426e62fc0'::uuid, 'Bangladeshi', '70511'),
  ('aef9beac-6251-4f81-b57a-679e2fa03748'::uuid, 'Bangladeshi', '70456'),
  ('dfcc5bf6-7e05-4a27-8f90-61850cbc7967'::uuid, 'Bangladeshi', '70460'),
  ('05f942ef-aba4-4c4b-a9b5-f74a1f2d6af9'::uuid, 'Bangladeshi', '70465'),
  ('b1af0a60-44a7-416c-8311-f6e7b0b548e3'::uuid, 'Pakistani', '70480'),
  ('20b650ec-12a7-49de-883b-d3de1040c8b7'::uuid, 'Pakistani', '70482'),
  ('008d0b67-4741-4385-9bf2-7bda186fe810'::uuid, 'Pakistani', '70483'),
  ('180711b4-58c4-4caf-bba8-90f00edb9e83'::uuid, 'Pakistani', '70479'),
  ('7536b4fd-eab2-40c9-8d88-d3190a64e8ce'::uuid, 'Pakistani', '70490'),
  ('1ed4200a-d58e-4696-85f9-5072fdb4c1e4'::uuid, 'Bangladeshi', '70525'),
  ('5a4fb7ce-47c3-421e-a977-a221bf2adda2'::uuid, 'Nepali', '70536'),
  ('45045a56-bc1e-4f64-9db9-6966c6ed9f45'::uuid, 'Nepali', '70534'),
  ('e7fa3f0a-0f5a-469e-b509-158f69661c77'::uuid, 'Filipino', '70766'),
  ('30038a4f-8ef7-4513-a7bb-bf8ac1998638'::uuid, 'Pakistani', '70693'),
  ('284852c4-3541-4675-ba2e-03179492eefd'::uuid, 'Pakistani', '70658'),
  ('1987e3ff-772d-47d0-b043-c7809420fceb'::uuid, 'Indian', '70609'),
  ('3e9bacd6-aad8-4b73-a46e-1c5b6a48d149'::uuid, 'Pakistani', '70649'),
  ('f6eb953f-a7d2-4c1d-a454-420a5bdb78f1'::uuid, 'Pakistani', '70756'),
  ('241e4225-01d4-47d3-b68b-6bc0911ce745'::uuid, 'Indian', '70668'),
  ('b1c176c6-8231-48cc-9e06-18b24f50a21c'::uuid, 'Indian', '70669'),
  ('efe0480d-a56f-4c3d-a0a0-52a767f73c18'::uuid, 'Indian', '70671'),
  ('b86d37a5-5276-482e-991f-53f94c395d7e'::uuid, 'Indian', '70666'),
  ('078d12ae-cad1-4f6a-8633-2d4d3ecbd39c'::uuid, 'Indian', '70675'),
  ('7c6bb737-3316-471b-8e8a-b56c97076e2c'::uuid, 'Indian', '70676'),
  ('ac4a1f9e-0991-448d-8f41-add1cf9d4cf4'::uuid, 'Indian', '70685'),
  ('bd33af91-0c5d-4b5c-a519-21c8926af284'::uuid, 'Indian', '70682'),
  ('f3cf6720-1dc0-44e0-b324-186e935773dd'::uuid, 'Bangladeshi', '70700'),
  ('c9d0e1a6-3b31-4789-b825-7ba3eccfdb6b'::uuid, 'Bangladeshi', '70701'),
  ('e1817a3d-1b66-4af9-93d4-07e89e4dc52b'::uuid, 'Indian', '70702'),
  ('3d2212ab-f427-41b2-9c9d-dc18f2df138d'::uuid, 'Srilankan', '70707'),
  ('54571581-630c-45e6-80c6-d024408f3d80'::uuid, 'Indian', '70732'),
  ('c995ce9e-9731-4a7d-8d11-0625d3640cc6'::uuid, 'Indian', '70738'),
  ('cd3b9f07-6f4c-46e5-ba5d-2e1c916d4faf'::uuid, 'Indian', '70737'),
  ('a103d552-4b58-418a-af5f-75c19af855e9'::uuid, 'Bangladeshi', '70770'),
  ('66cf8f3f-6aab-484b-bc28-0c58421b36d6'::uuid, 'Indian', '70741'),
  ('d96e86ca-cf6a-4fea-8ab1-c1cffd01375c'::uuid, 'Indian', '70745'),
  ('d79a3486-7684-4fd9-b311-a3c735c7b987'::uuid, 'Indian', '70747'),
  ('ac2003d8-cbde-4ba5-9172-d0506130975f'::uuid, 'Pakistani', '70764'),
  ('51e8169a-cff0-42f6-bdbd-0f5551608eec'::uuid, 'Nepali', '70773'),
  ('d40262f7-35d8-4a07-ac97-3f233ae9eddd'::uuid, 'Indian', '70780'),
  ('4534d14d-db96-4077-909c-69fb59cea8f1'::uuid, 'Pakistani', '70795'),
  ('6041cd50-6b94-4c78-8515-c7555784f0ea'::uuid, 'Filipino', '70793')
;

DO $do$
DECLARE
  v_run    BIGINT := (EXTRACT(EPOCH FROM now()))::BIGINT;
  v_null0  INT; v_nat INT; v_code INT; v_null1 INT;
BEGIN
  SELECT count(*) INTO v_null0 FROM public.profiles
    WHERE nationality IS NULL OR btrim(nationality) = '';

  -- Log BEFORE state for every targeted profile.
  INSERT INTO public.nationality_backfill_038_log
    (run_id, profile_id, matched_via, old_nationality, new_nationality, old_emp_code, new_emp_code)
  SELECT v_run, m.profile_id, 'email', p.nationality, m.nationality, ed.emp_code, m.new_emp_code
  FROM _m m
  JOIN public.profiles p ON p.id = m.profile_id
  LEFT JOIN public.employee_documents ed ON ed.employee_id = m.profile_id;

  -- 1. Nationality (036 trigger canonicalises/auto-registers).
  WITH u AS (
    UPDATE public.profiles p
    SET nationality = m.nationality, updated_at = now()
    FROM _m m
    WHERE p.id = m.profile_id
      AND p.nationality IS DISTINCT FROM m.nationality
    RETURNING 1)
  SELECT count(*) INTO v_nat FROM u;

  -- 2. emp_code correction (only where it actually differs). All 92
  --    target rows already have a doc row; new codes verified globally
  --    unique and disjoint from every other employee's code.
  WITH u AS (
    UPDATE public.employee_documents e
    SET emp_code = m.new_emp_code, updated_at = now()
    FROM _m m
    WHERE e.employee_id = m.profile_id
      AND m.new_emp_code IS NOT NULL
      AND btrim(e.emp_code) IS DISTINCT FROM m.new_emp_code
    RETURNING 1)
  SELECT count(*) INTO v_code FROM u;

  SELECT count(*) INTO v_null1 FROM public.profiles
    WHERE nationality IS NULL OR btrim(nationality) = '';

  RAISE NOTICE '038 run_id=%  NULL before=%  nationality written=%  emp_code corrected=%  NULL after=%',
    v_run, v_null0, v_nat, v_code, v_null1;
END $do$;

COMMIT;
