-- ============================================================
-- 039 - Correct the 78 remaining wrong 90xxx placeholder emp_codes.
--
-- Context:
--   Migration 037 resolved these employees' nationality by matching
--   their (unique) name to the roster, but it did NOT touch emp_code,
--   so they kept the wrong 90xxx placeholder. Migration 038 fixed the
--   92 CSV employees; these 78 were not in that CSV. The roster
--   ('employees List with Nationality.xlsm') already holds their real
--   code (that is how 037 name-matched them). Re-matched here by the
--   SAME normalized token-sorted name; verified 78/78 unique, 0
--   collisions (no target code owned by another employee, no dup in
--   set). old=90xxx and new=70xxx are disjoint, so the single UPDATE
--   below cannot raise a transient UNIQUE violation.
--
-- Reversal:
--   UPDATE employee_documents e SET emp_code = l.old_emp_code
--     FROM emp_code_correction_039_log l
--    WHERE l.profile_id = e.employee_id
--      AND l.run_id = (SELECT max(run_id) FROM emp_code_correction_039_log);
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.emp_code_correction_039_log (
  id           BIGSERIAL PRIMARY KEY,
  run_id       BIGINT      NOT NULL,
  profile_id   UUID        NOT NULL,
  matched_via  TEXT        NOT NULL DEFAULT 'roster_name',
  old_emp_code TEXT,
  new_emp_code TEXT        NOT NULL,
  applied_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TEMP TABLE _c(profile_id UUID PRIMARY KEY, new_emp_code TEXT NOT NULL)
  ON COMMIT DROP;
INSERT INTO _c (profile_id, new_emp_code) VALUES
  ('bf2ad65f-0133-4c37-b41a-2553529e3d8f'::uuid, '70344'),
  ('a78d517f-91d3-45cb-b513-b46003201555'::uuid, '70182'),
  ('c300af5a-b778-4743-921f-99ab9febf99a'::uuid, '70399'),
  ('7d8b9f6e-bd2a-435a-9d0c-86e77e790e13'::uuid, '70180'),
  ('18b78875-7f56-4f5a-943c-039b5a8730e2'::uuid, '70692'),
  ('51147beb-a0d5-435c-92de-dbc3290eebc8'::uuid, '70113'),
  ('ff076dbd-06d3-4928-ad61-de8dd9c19de5'::uuid, '70159'),
  ('a7bcc2ee-d8bb-4bb6-90e4-f23f21aa4912'::uuid, '70087'),
  ('5c9dfab2-ba03-45b1-8567-e2788db39cec'::uuid, '70170'),
  ('4d146894-a2d9-4799-8401-14fa118f5361'::uuid, '70402'),
  ('0bded8f3-238e-4749-806f-ec44a9388cf1'::uuid, '70709'),
  ('bed43d07-d476-40bb-8f4c-c5da7bfb3639'::uuid, '70152'),
  ('a36e8bc1-10ff-44cb-8d95-b0bd26db33fd'::uuid, '70395'),
  ('bb8909ca-6b11-4ec6-89c2-ac016ba9ea80'::uuid, '70469'),
  ('9a5b48bf-9f47-4e1e-a6e3-be76d1182a40'::uuid, '70221'),
  ('e24d1892-6e83-4b99-8cb3-e5040f1c6f03'::uuid, '70242'),
  ('db6578ab-f9ca-4943-b5bc-6e9902bdc38a'::uuid, '70244'),
  ('23a54c17-b7fd-498d-8361-0f2f5f5650c1'::uuid, '70256'),
  ('c3b8c1b2-8d9c-4856-af00-9740f915c791'::uuid, '70264'),
  ('92ab18d2-9464-45be-97aa-0857dc6931a9'::uuid, '70266'),
  ('bdddce37-ed7f-4c7c-b050-95adcbc11b7b'::uuid, '70270'),
  ('14bfacc5-7465-4413-b4c9-e5d13a9e5580'::uuid, '70297'),
  ('71ad7cdd-29a7-47b1-b00d-280a3c20ba1d'::uuid, '70303'),
  ('acab8d50-45d4-48d7-8e9b-2016106edcac'::uuid, '70683'),
  ('66b36bee-68a8-40eb-a80b-57a15fe9a0d8'::uuid, '70422'),
  ('9cb82a90-d8cd-4d3a-a17a-ca2e3b6b53fb'::uuid, '70437'),
  ('6c3cbf18-52bc-4207-ad50-89e72900cfb9'::uuid, '70435'),
  ('b5641ce5-7643-4749-97fe-2de886007918'::uuid, '70436'),
  ('c2b82392-bec2-47b0-8154-ef9b5a5b8fe8'::uuid, '70441'),
  ('c323b2c0-dc87-4dd9-9b83-bd5b5aaaaf2e'::uuid, '70448'),
  ('af741d29-a7ae-4c8d-bde5-a15eeaa73459'::uuid, '70449'),
  ('dc763cd5-1db8-484a-9d23-db1f444caa3e'::uuid, '70446'),
  ('739ade6c-ecca-469c-b821-1a20deef57b0'::uuid, '70518'),
  ('a9bbdf42-6a08-4cf2-a637-13b14753c238'::uuid, '70520'),
  ('1f99b038-5d16-4e62-bf61-3352515b03c2'::uuid, '70519'),
  ('b0d75b23-0f78-4804-8d7d-2a410fff5ce9'::uuid, '70510'),
  ('0bc17f9a-38a6-41be-b88f-3705ceb84c15'::uuid, '70524'),
  ('b605e9d1-a7ea-4332-a091-50610e88ae63'::uuid, '70454'),
  ('d53bc4ce-f71a-4bd5-9ad6-f05f9cc30455'::uuid, '70453'),
  ('9dd783a7-a9ca-4751-86e7-f4ed7fd02b1a'::uuid, '70463'),
  ('a5db605b-ea0c-4b7e-86b5-e7b3ef9bbaab'::uuid, '70464'),
  ('ccf3e0f0-352e-4de0-ac45-ee4e318c3997'::uuid, '70523'),
  ('c4317b2b-4492-4e95-80b9-e11dd80da8e3'::uuid, '70474'),
  ('f99d8561-5e23-4443-a0ab-59e27a30a8de'::uuid, '70477'),
  ('95daa5b1-ed1f-4b8c-9eb0-d943de47ac66'::uuid, '70457'),
  ('50d6a28d-294f-463f-b67c-636a60411616'::uuid, '70488'),
  ('a5cacb37-0202-413d-a91d-6311baf82b42'::uuid, '70492'),
  ('351036a3-d88f-49a1-b0c0-149d25319e87'::uuid, '70526'),
  ('d6bae9c6-4761-4a0a-88b6-2c0b4955f147'::uuid, '70529'),
  ('54d21a33-6490-434b-988b-875aa5d55648'::uuid, '70527'),
  ('0beadb61-35e2-4ff1-897f-c7ef43122e63'::uuid, '70528'),
  ('637261b2-99c2-4292-9719-4bf60dc94bda'::uuid, '70537'),
  ('a602a43b-07fa-4a23-9ab3-7674d53f1d07'::uuid, '70535'),
  ('022e9733-5c33-4495-8697-fa7c75233205'::uuid, '70540'),
  ('871d2c70-b843-4fb7-ac1c-ef3cde3ea97a'::uuid, '70541'),
  ('168ef9f2-3f84-43f0-953d-1ab0593b6541'::uuid, '70545'),
  ('2542d0e4-93ad-46fc-bc52-84b896bbf686'::uuid, '70602'),
  ('f0ec12e6-3ebf-431d-b9e5-3dbf20fa4f29'::uuid, '70604'),
  ('d1a8ab5a-9791-483a-8109-f5396585a1d6'::uuid, '70606'),
  ('deb3c0af-8cd0-4ed9-941f-dd0835c73003'::uuid, '70684'),
  ('b1a49278-6db0-4f0a-8178-7928582a707c'::uuid, '70645'),
  ('bda2c7de-2857-434a-ad94-6a1abae08990'::uuid, '70646'),
  ('f77ec71c-ff31-4d19-81ea-3e682312b72d'::uuid, '70678'),
  ('7dc87509-43e3-4f80-8f70-081ff3150027'::uuid, '70743'),
  ('d785e87c-9030-48cc-be2d-f120f68917d4'::uuid, '70699'),
  ('c276a18a-0b11-4048-82d0-f79d950d07e2'::uuid, '70789'),
  ('c563afb9-a49a-40b1-b5a4-f65efa41ca14'::uuid, '70744'),
  ('8dad677c-6162-4e9f-81dc-535fd74f77be'::uuid, '70712'),
  ('682d92f0-6f34-4692-b5eb-801d2627e9ee'::uuid, '70746'),
  ('0fe3da29-45e4-42f1-bacd-8ac6dc923ac9'::uuid, '70752'),
  ('8cb2ef7a-4050-48ed-afb8-8574f6d73f18'::uuid, '70765'),
  ('31de870a-a39d-4b53-bbcc-18ea1f2bb287'::uuid, '70769'),
  ('30f03afa-555e-49bc-817d-ca0c8a483b77'::uuid, '70777'),
  ('c412f11b-17fa-4715-a600-6bd69319d185'::uuid, '70776'),
  ('f7eb36be-40d4-4ad9-938e-af9ea760398e'::uuid, '70775'),
  ('0581c07f-4f41-4ab8-a54b-a3430188c511'::uuid, '70783'),
  ('836b7452-4691-49e2-80b8-275feff4963d'::uuid, '70794'),
  ('e79f67a9-11fd-4506-bd38-39d079e2d9a0'::uuid, '70803')
;

DO $do$
DECLARE
  v_run  BIGINT := (EXTRACT(EPOCH FROM now()))::BIGINT;
  v_n0   INT; v_upd INT; v_n1 INT;
BEGIN
  SELECT count(*) INTO v_n0 FROM public.employee_documents WHERE emp_code ~ '^90[0-9]{3}$';

  INSERT INTO public.emp_code_correction_039_log
    (run_id, profile_id, matched_via, old_emp_code, new_emp_code)
  SELECT v_run, c.profile_id, 'roster_name', btrim(e.emp_code), c.new_emp_code
  FROM _c c JOIN public.employee_documents e ON e.employee_id = c.profile_id;

  WITH u AS (
    UPDATE public.employee_documents e
    SET emp_code = c.new_emp_code, updated_at = now()
    FROM _c c
    WHERE e.employee_id = c.profile_id
      AND btrim(e.emp_code) IS DISTINCT FROM c.new_emp_code
    RETURNING 1)
  SELECT count(*) INTO v_upd FROM u;

  SELECT count(*) INTO v_n1 FROM public.employee_documents WHERE emp_code ~ '^90[0-9]{3}$';

  RAISE NOTICE '039 run_id=%  90xxx before=%  emp_code corrected=%  90xxx after=%',
    v_run, v_n0, v_upd, v_n1;
END $do$;

COMMIT;
