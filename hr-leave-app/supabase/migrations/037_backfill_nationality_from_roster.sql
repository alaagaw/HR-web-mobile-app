-- ============================================================
-- 037 - Backfill profiles.nationality + install the 036 canon
--       trigger.  (Generated; do not hand-edit the data blocks.)
--
-- VERIFIED AGAINST PRODUCTION on generation:
--   * Migration 036 was NEVER applied: strict FK profiles_nationality_fk
--     is live but the canonicalise/auto-register trigger is absent.
--     This is the root cause of the registration-form crash ("violates
--     foreign key constraint profiles_nationality_fk") that occurred
--     in the demo.  supabase_migrations.schema_migrations is empty, so
--     this project is NOT deployed via "supabase db push"; this file
--     is applied directly and is therefore SELF-CONTAINED + idempotent.
--   * 234 of 238 profiles had NULL nationality; 0 had misspelled /
--     non-canonical values (nothing to "correct").
--
-- Authoritative source for the backfill:
--   'employees List with Nationality.xlsm' (sheet 2026, 310 rows,
--   columns Emp. Code / Name / Nationality, 0 blanks, all 10 canonical
--   spellings).  Matched to profiles by employee_documents.emp_code
--   (58) then unique normalised name (78) = 136 resolved.
--   The remaining ~92 employees use a 90xxx emp-code series that exists
--   in NO available roster and cannot be resolved without a data source;
--   they stay NULL (safe: NULL never violates the FK, and once the
--   trigger below is live their later self-registration cannot crash).
--
-- Reversal of the backfill (if ever needed):
--   UPDATE profiles p SET nationality = l.old_nationality
--   FROM nationality_backfill_037_log l
--   WHERE l.profile_id = p.id
--     AND l.run_id = (SELECT max(run_id) FROM nationality_backfill_037_log);
-- ============================================================

BEGIN;

-- == 1. canon_* helpers + profiles trigger (mirror of migration 036) ==

CREATE OR REPLACE FUNCTION public.canon_department(raw TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $fn$
  SELECT upper(trim(regexp_replace(coalesce(raw, ''), '\s+', ' ', 'g')));
$fn$;

CREATE OR REPLACE FUNCTION public.canon_nationality(raw TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $fn$
  SELECT upper(substring(c FROM 1 FOR 1)) || lower(substring(c FROM 2))
  FROM (SELECT trim(regexp_replace(coalesce(raw, ''), '\s+', ' ', 'g')) AS c) s;
$fn$;

CREATE OR REPLACE FUNCTION public.canon_designation(raw TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $fn$
  SELECT trim(regexp_replace(coalesce(raw, ''), '\s+', ' ', 'g'));
$fn$;

GRANT EXECUTE ON FUNCTION public.canon_department(TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.canon_nationality(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.canon_designation(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.profiles_canon_lookup_refs()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $fn$
DECLARE
  v_actor UUID := auth.uid();
  v_val   TEXT;
BEGIN
  IF NEW.department IS NOT NULL THEN
    v_val := public.canon_department(NEW.department);
    IF length(v_val) = 0 THEN NEW.department := NULL;
    ELSE
      NEW.department := v_val;
      IF TG_OP = 'INSERT' OR v_val IS DISTINCT FROM OLD.department THEN
        INSERT INTO public.lookup_departments (name, is_active, created_by)
        VALUES (v_val, true, v_actor) ON CONFLICT (name) DO NOTHING;
      END IF;
    END IF;
  END IF;

  IF NEW.nationality IS NOT NULL THEN
    v_val := public.canon_nationality(NEW.nationality);
    IF length(v_val) = 0 THEN NEW.nationality := NULL;
    ELSE
      NEW.nationality := v_val;
      IF TG_OP = 'INSERT' OR v_val IS DISTINCT FROM OLD.nationality THEN
        INSERT INTO public.lookup_nationalities (name, is_active, created_by)
        VALUES (v_val, true, v_actor) ON CONFLICT (name) DO NOTHING;
      END IF;
    END IF;
  END IF;

  IF NEW.job_title IS NOT NULL THEN
    v_val := public.canon_designation(NEW.job_title);
    IF length(v_val) = 0 THEN NEW.job_title := NULL;
    ELSE
      NEW.job_title := v_val;
      IF TG_OP = 'INSERT' OR v_val IS DISTINCT FROM OLD.job_title THEN
        INSERT INTO public.lookup_designations (name, is_active, created_by)
        VALUES (v_val, true, v_actor) ON CONFLICT (name) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_profiles_canon_lookup_refs ON public.profiles;
CREATE TRIGGER trg_profiles_canon_lookup_refs
  BEFORE INSERT OR UPDATE OF department, nationality, job_title
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_canon_lookup_refs();

-- == 2. Reversible change log ==

CREATE TABLE IF NOT EXISTS public.nationality_backfill_037_log (
  id              BIGSERIAL PRIMARY KEY,
  run_id          BIGINT      NOT NULL,
  profile_id      UUID        NOT NULL,
  matched_via     TEXT,
  old_nationality TEXT,
  new_nationality TEXT        NOT NULL,
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- == 3. The 136 resolved decisions (profile-id keyed) ==

CREATE TEMP TABLE _decided(profile_id UUID PRIMARY KEY, nationality TEXT NOT NULL, via TEXT)
  ON COMMIT DROP;
INSERT INTO _decided (profile_id, nationality, via) VALUES
  ('be7f6798-d7ca-42da-b1f8-1b7c5912cb25'::uuid, 'Indian', 'emp_code'),
  ('23e689b6-2e97-4178-917f-15fe4d18dca4'::uuid, 'Indian', 'emp_code'),
  ('580a878f-2e55-454e-a123-f675a65f8b56'::uuid, 'Bangladeshi', 'emp_code'),
  ('b37f2d8d-c6aa-47e0-b9fd-bde3ab44fb5b'::uuid, 'Indian', 'emp_code'),
  ('ccab95ac-cf1b-4fa5-b259-b13c50560eb5'::uuid, 'Bangladeshi', 'emp_code'),
  ('8672cf72-900a-4827-8a9b-05a68ade6812'::uuid, 'Bangladeshi', 'emp_code'),
  ('112e03ed-7bf2-4d99-a943-905b734c2780'::uuid, 'Pakistani', 'emp_code'),
  ('1e1425a6-45e9-40c2-8a3b-6b9ffd5a06a0'::uuid, 'Bangladeshi', 'emp_code'),
  ('b013e177-85e6-4a11-9e86-171870293455'::uuid, 'Indian', 'emp_code'),
  ('66668939-ae39-4f2b-9b47-6766ba32c43f'::uuid, 'Filipino', 'emp_code'),
  ('1801bf79-b980-4b02-88ef-f3c53a64d507'::uuid, 'Indian', 'emp_code'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'Saudi', 'emp_code'),
  ('8452ea87-edd5-49a3-a4bf-bc5a46f61fa7'::uuid, 'Bangladeshi', 'emp_code'),
  ('3d87685e-05ed-4903-8578-870ffa697c00'::uuid, 'Nepali', 'emp_code'),
  ('ae0cb0d4-915e-4c27-a234-a3b0a0a5749e'::uuid, 'Indian', 'emp_code'),
  ('362f639d-5220-4fe9-8a38-887dfe07e797'::uuid, 'Indian', 'emp_code'),
  ('9369af7e-b1e9-4788-8747-f2b55dac5ee5'::uuid, 'Indian', 'emp_code'),
  ('10634800-d788-4da0-802c-22eb1fa7051e'::uuid, 'Bangladeshi', 'emp_code'),
  ('3bc30439-4605-4d83-8a6a-56bc3858fcde'::uuid, 'Nepali', 'emp_code'),
  ('dc0de2b1-da7b-419a-943a-cc828c2938d5'::uuid, 'Indian', 'emp_code'),
  ('c13c99ad-a8fb-4ec3-9928-ccaa07af0f1f'::uuid, 'Indian', 'emp_code'),
  ('feacd22b-4115-4b86-a6d8-4b1e6fb947aa'::uuid, 'Nepali', 'emp_code'),
  ('3f830b96-101e-4b46-9567-00cf168bf883'::uuid, 'Nepali', 'emp_code'),
  ('84bb0475-36dd-45d1-8956-7634ddc2d6a6'::uuid, 'Filipino', 'emp_code'),
  ('5237f897-2322-40bc-9f4e-cc0fede88cdb'::uuid, 'Indian', 'emp_code'),
  ('a7a657d6-0180-485e-9afd-97cd823a326c'::uuid, 'Bangladeshi', 'emp_code'),
  ('ef81675d-7c15-4cf4-a257-6b5df7949728'::uuid, 'Bangladeshi', 'emp_code'),
  ('e8baacb9-c311-402b-bb33-f74ed4e0586f'::uuid, 'Pakistani', 'emp_code'),
  ('23423551-51b9-482a-8f04-efacc978114a'::uuid, 'Srilankan', 'emp_code'),
  ('2e896bfb-952d-4d05-9c33-935cd779bfa7'::uuid, 'Indian', 'emp_code'),
  ('62af114d-26db-49c0-9290-53132d677a84'::uuid, 'Nepali', 'emp_code'),
  ('48edb4ca-ee79-45e1-9ebb-b2276fdaca79'::uuid, 'Pakistani', 'emp_code'),
  ('84964d4b-5f23-44fd-b512-6aba3405addc'::uuid, 'Indian', 'emp_code'),
  ('b11e224f-873c-4572-b21d-351d99f22064'::uuid, 'Nepali', 'emp_code'),
  ('2619363f-30dc-4497-b080-7a4e873cef08'::uuid, 'Nepali', 'emp_code'),
  ('fa88a39a-a4e8-4c47-a9a2-f38508b0e88b'::uuid, 'Nepali', 'emp_code'),
  ('324c87e9-f811-4d5d-a2e7-9e05e4c94b0d'::uuid, 'Indian', 'emp_code'),
  ('493b8bda-4973-460d-8580-89ecd0496b32'::uuid, 'Nepali', 'emp_code'),
  ('374b1cb3-e72f-4773-9cb5-df596a63128a'::uuid, 'Nepali', 'emp_code'),
  ('2f6df21b-51bf-4728-b1c6-32b522b10b38'::uuid, 'Bangladeshi', 'emp_code'),
  ('2223bdf7-c1d1-4192-9d2a-bb7276c1359b'::uuid, 'Indian', 'emp_code'),
  ('79131eaf-cb11-4834-bc0a-ec745a0899fd'::uuid, 'Pakistani', 'emp_code'),
  ('04b4cd76-b258-4a12-8ba8-4f40f1896cec'::uuid, 'Indian', 'emp_code'),
  ('1355afb9-febc-498d-97fa-5aad2d24d54e'::uuid, 'Indian', 'emp_code'),
  ('11e43655-7bd6-4d53-a1f1-f25b95efa898'::uuid, 'Nepali', 'emp_code'),
  ('a348f4f7-db30-45be-a812-5abf54b56e65'::uuid, 'Nepali', 'emp_code'),
  ('5bc7d31c-8802-4cf4-81d9-e26e6345a501'::uuid, 'Nepali', 'emp_code'),
  ('3cf4f622-791d-4304-af8a-e69c1334e1ec'::uuid, 'Nepali', 'emp_code'),
  ('306418b0-65ec-4ec6-88a7-e36f2996c998'::uuid, 'Indian', 'emp_code'),
  ('b0d75b23-0f78-4804-8d7d-2a410fff5ce9'::uuid, 'Bangladeshi', 'name'),
  ('022e9733-5c33-4495-8697-fa7c75233205'::uuid, 'Nepali', 'name'),
  ('92ab18d2-9464-45be-97aa-0857dc6931a9'::uuid, 'Nepali', 'name'),
  ('f0ec12e6-3ebf-431d-b9e5-3dbf20fa4f29'::uuid, 'Nepali', 'name'),
  ('0beadb61-35e2-4ff1-897f-c7ef43122e63'::uuid, 'Nepali', 'name'),
  ('0bded8f3-238e-4749-806f-ec44a9388cf1'::uuid, 'Indian', 'name'),
  ('9a5b48bf-9f47-4e1e-a6e3-be76d1182a40'::uuid, 'Filipino', 'name'),
  ('b605e9d1-a7ea-4332-a091-50610e88ae63'::uuid, 'Bangladeshi', 'name'),
  ('bb8909ca-6b11-4ec6-89c2-ac016ba9ea80'::uuid, 'Nepali', 'name'),
  ('d6bae9c6-4761-4a0a-88b6-2c0b4955f147'::uuid, 'Nepali', 'name'),
  ('c3b8c1b2-8d9c-4856-af00-9740f915c791'::uuid, 'Nepali', 'name'),
  ('a36e8bc1-10ff-44cb-8d95-b0bd26db33fd'::uuid, 'Pakistani', 'name'),
  ('ff076dbd-06d3-4928-ad61-de8dd9c19de5'::uuid, 'Indian', 'name'),
  ('e24d1892-6e83-4b99-8cb3-e5040f1c6f03'::uuid, 'Nepali', 'name'),
  ('31de870a-a39d-4b53-bbcc-18ea1f2bb287'::uuid, 'Indian', 'name'),
  ('a78d517f-91d3-45cb-b513-b46003201555'::uuid, 'Indian', 'name'),
  ('db6578ab-f9ca-4943-b5bc-6e9902bdc38a'::uuid, 'Nepali', 'name'),
  ('0bc17f9a-38a6-41be-b88f-3705ceb84c15'::uuid, 'Bangladeshi', 'name'),
  ('d1a8ab5a-9791-483a-8109-f5396585a1d6'::uuid, 'Nepali', 'name'),
  ('4d146894-a2d9-4799-8401-14fa118f5361'::uuid, 'Indian', 'name'),
  ('71ad7cdd-29a7-47b1-b00d-280a3c20ba1d'::uuid, 'Nepali', 'name'),
  ('682d92f0-6f34-4692-b5eb-801d2627e9ee'::uuid, 'Nepali', 'name'),
  ('30f03afa-555e-49bc-817d-ca0c8a483b77'::uuid, 'Nepali', 'name'),
  ('bda2c7de-2857-434a-ad94-6a1abae08990'::uuid, 'Nepali', 'name'),
  ('9dd783a7-a9ca-4751-86e7-f4ed7fd02b1a'::uuid, 'Nepali', 'name'),
  ('d53bc4ce-f71a-4bd5-9ad6-f05f9cc30455'::uuid, 'Bangladeshi', 'name'),
  ('b0000000-0000-0000-0000-000000000003'::uuid, 'Saudi', 'emp_code'),
  ('351036a3-d88f-49a1-b0c0-149d25319e87'::uuid, 'Bangladeshi', 'name'),
  ('acab8d50-45d4-48d7-8e9b-2016106edcac'::uuid, 'Nepali', 'name'),
  ('7dc87509-43e3-4f80-8f70-081ff3150027'::uuid, 'Bangladeshi', 'name'),
  ('c563afb9-a49a-40b1-b5a4-f65efa41ca14'::uuid, 'Bangladeshi', 'name'),
  ('a9bbdf42-6a08-4cf2-a637-13b14753c238'::uuid, 'Indian', 'name'),
  ('0fe3da29-45e4-42f1-bacd-8ac6dc923ac9'::uuid, 'Indian', 'name'),
  ('66b36bee-68a8-40eb-a80b-57a15fe9a0d8'::uuid, 'Bangladeshi', 'name'),
  ('ccf3e0f0-352e-4de0-ac45-ee4e318c3997'::uuid, 'Bangladeshi', 'name'),
  ('c300af5a-b778-4743-921f-99ab9febf99a'::uuid, 'Indian', 'name'),
  ('e79f67a9-11fd-4506-bd38-39d079e2d9a0'::uuid, 'Indian', 'name'),
  ('c4317b2b-4492-4e95-80b9-e11dd80da8e3'::uuid, 'Bangladeshi', 'name'),
  ('739ade6c-ecca-469c-b821-1a20deef57b0'::uuid, 'Indian', 'name'),
  ('1f99b038-5d16-4e62-bf61-3352515b03c2'::uuid, 'Indian', 'name'),
  ('18b78875-7f56-4f5a-943c-039b5a8730e2'::uuid, 'Indian', 'name'),
  ('8dad677c-6162-4e9f-81dc-535fd74f77be'::uuid, 'Indian', 'name'),
  ('c412f11b-17fa-4715-a600-6bd69319d185'::uuid, 'Nepali', 'name'),
  ('23a54c17-b7fd-498d-8361-0f2f5f5650c1'::uuid, 'Indian', 'name'),
  ('b1a49278-6db0-4f0a-8178-7928582a707c'::uuid, 'Nepali', 'name'),
  ('8cb2ef7a-4050-48ed-afb8-8574f6d73f18'::uuid, 'Indian', 'name'),
  ('b0000000-0000-0000-0000-000000000006'::uuid, 'Saudi', 'emp_code'),
  ('6e13e766-6c78-47da-a56f-2842c1acf1c8'::uuid, 'Indian', 'emp_code'),
  ('b5641ce5-7643-4749-97fe-2de886007918'::uuid, 'Indian', 'name'),
  ('9cb82a90-d8cd-4d3a-a17a-ca2e3b6b53fb'::uuid, 'Indian', 'name'),
  ('f7eb36be-40d4-4ad9-938e-af9ea760398e'::uuid, 'Nepali', 'name'),
  ('deb3c0af-8cd0-4ed9-941f-dd0835c73003'::uuid, 'Indian', 'name'),
  ('a7bcc2ee-d8bb-4bb6-90e4-f23f21aa4912'::uuid, 'Nepali', 'name'),
  ('c276a18a-0b11-4048-82d0-f79d950d07e2'::uuid, 'Indian', 'name'),
  ('bdddce37-ed7f-4c7c-b050-95adcbc11b7b'::uuid, 'Nepali', 'name'),
  ('a5db605b-ea0c-4b7e-86b5-e7b3ef9bbaab'::uuid, 'Nepali', 'name'),
  ('7813a9a4-c474-4798-b237-fc6145d65ea0'::uuid, 'Indian', 'emp_code'),
  ('5c9dfab2-ba03-45b1-8567-e2788db39cec'::uuid, 'Indian', 'name'),
  ('6c3cbf18-52bc-4207-ad50-89e72900cfb9'::uuid, 'Indian', 'name'),
  ('14bfacc5-7465-4413-b4c9-e5d13a9e5580'::uuid, 'Filipino', 'name'),
  ('8a08a8be-2e25-4d23-8cea-971f899aaa65'::uuid, 'Indian', 'emp_code'),
  ('d785e87c-9030-48cc-be2d-f120f68917d4'::uuid, 'Indian', 'name'),
  ('c2b82392-bec2-47b0-8154-ef9b5a5b8fe8'::uuid, 'Indian', 'name'),
  ('bf2ad65f-0133-4c37-b41a-2553529e3d8f'::uuid, 'Pakistani', 'name'),
  ('4631efca-2a4e-434c-a7b4-0b067fed44ff'::uuid, 'Indian', 'emp_code'),
  ('a5cacb37-0202-413d-a91d-6311baf82b42'::uuid, 'Nepali', 'name'),
  ('af741d29-a7ae-4c8d-bde5-a15eeaa73459'::uuid, 'Indian', 'name'),
  ('dc763cd5-1db8-484a-9d23-db1f444caa3e'::uuid, 'Indian', 'name'),
  ('bed43d07-d476-40bb-8f4c-c5da7bfb3639'::uuid, 'Indian', 'name'),
  ('51147beb-a0d5-435c-92de-dbc3290eebc8'::uuid, 'Bangladeshi', 'name'),
  ('b0000000-0000-0000-0000-000000000007'::uuid, 'Saudi', 'emp_code'),
  ('95daa5b1-ed1f-4b8c-9eb0-d943de47ac66'::uuid, 'Bangladeshi', 'name'),
  ('637261b2-99c2-4292-9719-4bf60dc94bda'::uuid, 'Nepali', 'name'),
  ('f77ec71c-ff31-4d19-81ea-3e682312b72d'::uuid, 'Indian', 'name'),
  ('66449ce0-f5b7-40e2-b5e1-390ac6865243'::uuid, 'Indian', 'emp_code'),
  ('836b7452-4691-49e2-80b8-275feff4963d'::uuid, 'Indian', 'name'),
  ('50d6a28d-294f-463f-b67c-636a60411616'::uuid, 'Nepali', 'name'),
  ('a602a43b-07fa-4a23-9ab3-7674d53f1d07'::uuid, 'Nepali', 'name'),
  ('871d2c70-b843-4fb7-ac1c-ef3cde3ea97a'::uuid, 'Nepali', 'name'),
  ('f99d8561-5e23-4443-a0ab-59e27a30a8de'::uuid, 'Bangladeshi', 'name'),
  ('0581c07f-4f41-4ab8-a54b-a3430188c511'::uuid, 'Nepali', 'name'),
  ('7d8b9f6e-bd2a-435a-9d0c-86e77e790e13'::uuid, 'Indian', 'name'),
  ('2542d0e4-93ad-46fc-bc52-84b896bbf686'::uuid, 'Nepali', 'name'),
  ('54d21a33-6490-434b-988b-875aa5d55648'::uuid, 'Nepali', 'name'),
  ('168ef9f2-3f84-43f0-953d-1ab0593b6541'::uuid, 'Nepali', 'name'),
  ('c323b2c0-dc87-4dd9-9b83-bd5b5aaaaf2e'::uuid, 'Indian', 'name'),
  ('b0000000-0000-0000-0000-000000000004'::uuid, 'Indian', 'emp_code')
;

DO $do$
DECLARE
  v_run   BIGINT := (EXTRACT(EPOCH FROM now()))::BIGINT;
  v_null0 INT; v_written INT; v_null1 INT; v_codes INT;
BEGIN
  SELECT count(*) INTO v_null0 FROM public.profiles
    WHERE nationality IS NULL OR btrim(nationality) = '';

  INSERT INTO public.nationality_backfill_037_log
    (run_id, profile_id, matched_via, old_nationality, new_nationality)
  SELECT v_run, p.id, d.via, p.nationality, d.nationality
  FROM public.profiles p
  JOIN _decided d ON d.profile_id = p.id
  WHERE p.nationality IS DISTINCT FROM d.nationality;

  WITH upd AS (
    UPDATE public.profiles p
    SET nationality = d.nationality, updated_at = now()
    FROM _decided d
    WHERE p.id = d.profile_id
      AND p.nationality IS DISTINCT FROM d.nationality
    RETURNING 1
  )
  SELECT count(*) INTO v_written FROM upd;

  -- 4. Test-account emp codes you specified (idempotent).
  INSERT INTO public.employee_documents (employee_id, emp_code)
  VALUES
  ('a0000000-0000-0000-0000-000000000005'::uuid, '20001'),
  ('a0000000-0000-0000-0000-000000000001'::uuid, '20002'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, '20003'),
  ('a0000000-0000-0000-0000-000000000004'::uuid, '20004'),
  ('a0000000-0000-0000-0000-000000000006'::uuid, '20005')
  ON CONFLICT (employee_id) DO NOTHING;
  GET DIAGNOSTICS v_codes = ROW_COUNT;

  SELECT count(*) INTO v_null1 FROM public.profiles
    WHERE nationality IS NULL OR btrim(nationality) = '';

  RAISE NOTICE '037 run_id=%  NULL before=%  nationality rows written=%  NULL after=%  test emp_codes added=%',
    v_run, v_null0, v_written, v_null1, v_codes;
END $do$;

COMMIT;
