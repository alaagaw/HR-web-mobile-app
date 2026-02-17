-- ============================================================
-- SEED: Employee Documents from Active Residents Excel
-- Generated: 2026-02-17T03:01:58.632Z
-- Source: Active Residents2_10_2026.xlsx (219 rows)
-- ============================================================
-- Run this in Supabase SQL Editor (as postgres / service role)
-- ============================================================

BEGIN;

DO $$
DECLARE
  uid_0 UUID;
  uid_1 UUID;
  uid_2 UUID;
  uid_3 UUID;
  uid_4 UUID;
  uid_5 UUID;
  uid_6 UUID;
  uid_7 UUID;
  uid_8 UUID;
  uid_9 UUID;
  uid_10 UUID;
  uid_11 UUID;
  uid_12 UUID;
  uid_13 UUID;
  uid_14 UUID;
  uid_15 UUID;
  uid_16 UUID;
  uid_17 UUID;
  uid_18 UUID;
  uid_19 UUID;
  uid_20 UUID;
  uid_21 UUID;
  uid_22 UUID;
  uid_23 UUID;
  uid_24 UUID;
  uid_25 UUID;
  uid_26 UUID;
  uid_27 UUID;
  uid_28 UUID;
  uid_29 UUID;
  uid_30 UUID;
  uid_31 UUID;
  uid_32 UUID;
  uid_33 UUID;
  uid_34 UUID;
  uid_35 UUID;
  uid_36 UUID;
  uid_37 UUID;
  uid_38 UUID;
  uid_39 UUID;
  uid_40 UUID;
  uid_41 UUID;
  uid_42 UUID;
  uid_43 UUID;
  uid_44 UUID;
  uid_45 UUID;
  uid_46 UUID;
  uid_47 UUID;
  uid_48 UUID;
  uid_49 UUID;
  uid_50 UUID;
  uid_51 UUID;
  uid_52 UUID;
  uid_53 UUID;
  uid_54 UUID;
  uid_55 UUID;
  uid_56 UUID;
  uid_57 UUID;
  uid_58 UUID;
  uid_59 UUID;
  uid_60 UUID;
  uid_61 UUID;
  uid_62 UUID;
  uid_63 UUID;
  uid_64 UUID;
  uid_65 UUID;
  uid_66 UUID;
  uid_67 UUID;
  uid_68 UUID;
  uid_69 UUID;
  uid_70 UUID;
  uid_71 UUID;
  uid_72 UUID;
  uid_73 UUID;
  uid_74 UUID;
  uid_75 UUID;
  uid_76 UUID;
  uid_77 UUID;
  uid_78 UUID;
  uid_79 UUID;
  uid_80 UUID;
  uid_81 UUID;
  uid_82 UUID;
  uid_83 UUID;
  uid_84 UUID;
  uid_85 UUID;
  uid_86 UUID;
  uid_87 UUID;
  uid_88 UUID;
  uid_89 UUID;
  uid_90 UUID;
  uid_91 UUID;
  uid_92 UUID;
  uid_93 UUID;
  uid_94 UUID;
  uid_95 UUID;
  uid_96 UUID;
  uid_97 UUID;
  uid_98 UUID;
  uid_99 UUID;
  uid_100 UUID;
  uid_101 UUID;
  uid_102 UUID;
  uid_103 UUID;
  uid_104 UUID;
  uid_105 UUID;
  uid_106 UUID;
  uid_107 UUID;
  uid_108 UUID;
  uid_109 UUID;
  uid_110 UUID;
  uid_111 UUID;
  uid_112 UUID;
  uid_113 UUID;
  uid_114 UUID;
  uid_115 UUID;
  uid_116 UUID;
  uid_117 UUID;
  uid_118 UUID;
  uid_119 UUID;
  uid_120 UUID;
  uid_121 UUID;
  uid_122 UUID;
  uid_123 UUID;
  uid_124 UUID;
  uid_125 UUID;
  uid_126 UUID;
  uid_127 UUID;
  uid_128 UUID;
  uid_129 UUID;
  uid_130 UUID;
  uid_131 UUID;
  uid_132 UUID;
  uid_133 UUID;
  uid_134 UUID;
  uid_135 UUID;
  uid_136 UUID;
  uid_137 UUID;
  uid_138 UUID;
  uid_139 UUID;
  uid_140 UUID;
  uid_141 UUID;
  uid_142 UUID;
  uid_143 UUID;
  uid_144 UUID;
  uid_145 UUID;
  uid_146 UUID;
  uid_147 UUID;
  uid_148 UUID;
  uid_149 UUID;
  uid_150 UUID;
  uid_151 UUID;
  uid_152 UUID;
  uid_153 UUID;
  uid_154 UUID;
  uid_155 UUID;
  uid_156 UUID;
  uid_157 UUID;
  uid_158 UUID;
  uid_159 UUID;
  uid_160 UUID;
  uid_161 UUID;
  uid_162 UUID;
  uid_163 UUID;
  uid_164 UUID;
  uid_165 UUID;
  uid_166 UUID;
  uid_167 UUID;
  uid_168 UUID;
  uid_169 UUID;
  uid_170 UUID;
  uid_171 UUID;
  uid_172 UUID;
  uid_173 UUID;
  uid_174 UUID;
  uid_175 UUID;
  uid_176 UUID;
  uid_177 UUID;
  uid_178 UUID;
  uid_179 UUID;
  uid_180 UUID;
  uid_181 UUID;
  uid_182 UUID;
  uid_183 UUID;
  uid_184 UUID;
  uid_185 UUID;
  uid_186 UUID;
  uid_187 UUID;
  uid_188 UUID;
  uid_189 UUID;
  uid_190 UUID;
  uid_191 UUID;
  uid_192 UUID;
  uid_193 UUID;
  uid_194 UUID;
  uid_195 UUID;
  uid_196 UUID;
  uid_197 UUID;
  uid_198 UUID;
  uid_199 UUID;
  uid_200 UUID;
  uid_201 UUID;
  uid_202 UUID;
  uid_203 UUID;
  uid_204 UUID;
  uid_205 UUID;
  uid_206 UUID;
  uid_207 UUID;
  uid_208 UUID;
  uid_209 UUID;
  uid_210 UUID;
  uid_211 UUID;
  uid_212 UUID;
  uid_213 UUID;
  uid_214 UUID;
  uid_215 UUID;
  uid_216 UUID;
  uid_217 UUID;
  uid_218 UUID;
BEGIN

  -- [1/219] ABDULAZEEZ - - ASHRAF (70150)
  SELECT id INTO uid_0 FROM profiles WHERE email = 'abdulazeez.ashraf@company.com';
  IF uid_0 IS NULL THEN
    uid_0 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_0,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'abdulazeez.ashraf@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ABDULAZEEZ - - ASHRAF"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_0,
      uid_0::text,
      json_build_object('sub', uid_0::text, 'email', 'abdulazeez.ashraf@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_0, 'ABDULAZEEZ - - ASHRAF', 'abdulazeez.ashraf@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_0,
    '70150',
    '2071060228',
    'N4989618',
    'bupa-1590',
    'Manufacturing officer',
    '1962-01-01',
    '2026-03-27',
    '2026-05-28',
    '2026-03-27'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [2/219] BALOUR SINGH (70070)
  SELECT id INTO uid_1 FROM profiles WHERE email = 'balour.singh@company.com';
  IF uid_1 IS NULL THEN
    uid_1 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_1,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'balour.singh@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"BALOUR SINGH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_1,
      uid_1::text,
      json_build_object('sub', uid_1::text, 'email', 'balour.singh@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_1, 'BALOUR SINGH', 'balour.singh@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_1,
    '70070',
    '2111443756',
    'U0056172',
    'bupa-1591',
    'Truck Driver',
    '1969-01-01',
    '2030-10-19',
    '2026-09-10',
    '2026-02-09'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [3/219] DAVOOD - - BULLAT (70188)
  SELECT id INTO uid_2 FROM profiles WHERE email = 'davood.bullat@company.com';
  IF uid_2 IS NULL THEN
    uid_2 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_2,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'davood.bullat@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DAVOOD - - BULLAT"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_2,
      uid_2::text,
      json_build_object('sub', uid_2::text, 'email', 'davood.bullat@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_2, 'DAVOOD - - BULLAT', 'davood.bullat@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_2,
    '70188',
    '2113760785',
    'V9312783',
    'bupa-1592',
    'Maintenance Supervisor',
    '1993-01-01',
    '2032-06-29',
    '2026-08-06',
    '2032-06-29'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [4/219] DAVOOD AUDHRAMA - BEARY (70080)
  SELECT id INTO uid_3 FROM profiles WHERE email = 'davood.beary@company.com';
  IF uid_3 IS NULL THEN
    uid_3 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_3,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'davood.beary@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DAVOOD AUDHRAMA - BEARY"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_3,
      uid_3::text,
      json_build_object('sub', uid_3::text, 'email', 'davood.beary@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_3, 'DAVOOD AUDHRAMA - BEARY', 'davood.beary@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_3,
    '70080',
    '2122897537',
    'V6057326',
    'bupa-1593',
    'Truck Driver',
    '1969-01-01',
    '2031-05-31',
    '2026-08-07',
    '2031-05-31'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [5/219] AMINUDDIN GONI - HAZI (70095)
  SELECT id INTO uid_4 FROM profiles WHERE email = 'aminuddin.hazi@company.com';
  IF uid_4 IS NULL THEN
    uid_4 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_4,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'aminuddin.hazi@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"AMINUDDIN GONI - HAZI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_4,
      uid_4::text,
      json_build_object('sub', uid_4::text, 'email', 'aminuddin.hazi@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_4, 'AMINUDDIN GONI - HAZI', 'aminuddin.hazi@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_4,
    '70095',
    '2145123986',
    'EM0980917',
    'bupa-1594',
    'Manufacturing officer',
    '1975-01-01',
    '2030-01-11',
    '2026-07-10',
    '2030-01-11'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [6/219] ABUSALAM - - ABDULKHALEK (70103)
  SELECT id INTO uid_5 FROM profiles WHERE email = 'abusalam.abdulkhalek@company.com';
  IF uid_5 IS NULL THEN
    uid_5 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_5,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'abusalam.abdulkhalek@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ABUSALAM - - ABDULKHALEK"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_5,
      uid_5::text,
      json_build_object('sub', uid_5::text, 'email', 'abusalam.abdulkhalek@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_5, 'ABUSALAM - - ABDULKHALEK', 'abusalam.abdulkhalek@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_5,
    '70103',
    '2145124224',
    'EN0024568',
    'bupa-1595',
    'Manufacturing officer',
    '1971-01-01',
    '2029-12-12',
    '2026-04-04',
    '2029-12-12'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [7/219] SALIM MOHAMEED AHMED GORI (70067)
  SELECT id INTO uid_6 FROM profiles WHERE email = 'salim.gori@company.com';
  IF uid_6 IS NULL THEN
    uid_6 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_6,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'salim.gori@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SALIM MOHAMEED AHMED GORI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_6,
      uid_6::text,
      json_build_object('sub', uid_6::text, 'email', 'salim.gori@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_6, 'SALIM MOHAMEED AHMED GORI', 'salim.gori@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_6,
    '70067',
    '2166237913',
    'U0667930',
    'bupa-1596',
    'Bus  Driver',
    '1967-01-01',
    '2030-01-09',
    '2026-04-13',
    '2030-01-09'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [8/219] ESMAIL - - SAVAD (90001)
  SELECT id INTO uid_7 FROM profiles WHERE email = 'esmail.savad@company.com';
  IF uid_7 IS NULL THEN
    uid_7 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_7,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'esmail.savad@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ESMAIL - - SAVAD"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_7,
      uid_7::text,
      json_build_object('sub', uid_7::text, 'email', 'esmail.savad@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_7, 'ESMAIL - - SAVAD', 'esmail.savad@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_7,
    '90001',
    '2168280150',
    'T8343184',
    'bupa-1597',
    'Bus  Driver',
    '1971-01-01',
    '2031-01-05',
    '2026-03-22',
    '2031-01-05'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [9/219] MAHAMMAD - - ABBAS (90002)
  SELECT id INTO uid_8 FROM profiles WHERE email = 'mahammad.abbas@company.com';
  IF uid_8 IS NULL THEN
    uid_8 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_8,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mahammad.abbas@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MAHAMMAD - - ABBAS"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_8,
      uid_8::text,
      json_build_object('sub', uid_8::text, 'email', 'mahammad.abbas@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_8, 'MAHAMMAD - - ABBAS', 'mahammad.abbas@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_8,
    '90002',
    '2170362327',
    'BP0160302',
    'bupa-1598',
    'Manufacturing officer',
    '1975-01-01',
    '2035-01-23',
    '2026-04-27',
    '2035-01-22'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [10/219] NOUSHAD KUNNAN (70186)
  SELECT id INTO uid_9 FROM profiles WHERE email = 'noushad.kunnan@company.com';
  IF uid_9 IS NULL THEN
    uid_9 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_9,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'noushad.kunnan@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"NOUSHAD KUNNAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_9,
      uid_9::text,
      json_build_object('sub', uid_9::text, 'email', 'noushad.kunnan@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_9, 'NOUSHAD KUNNAN', 'noushad.kunnan@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_9,
    '70186',
    '2182678520',
    'V6094371',
    'bupa-1599',
    'Manufacturing officer',
    '1977-10-25',
    '2031-04-19',
    '2026-08-26',
    '2031-04-18'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [11/219] SABU - - YOHANNAN (70072)
  SELECT id INTO uid_10 FROM profiles WHERE email = 'sabu.yohannan@company.com';
  IF uid_10 IS NULL THEN
    uid_10 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_10,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sabu.yohannan@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SABU - - YOHANNAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_10,
      uid_10::text,
      json_build_object('sub', uid_10::text, 'email', 'sabu.yohannan@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_10, 'SABU - - YOHANNAN', 'sabu.yohannan@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_10,
    '70072',
    '2184423438',
    'V6097509',
    'bupa-1600',
    'Truck Driver',
    '1965-01-01',
    '2031-05-08',
    '2026-04-30',
    '2031-05-08'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [12/219] SIRAJ UMMER - THEKODAN (70183)
  SELECT id INTO uid_11 FROM profiles WHERE email = 'siraj.thekodan@company.com';
  IF uid_11 IS NULL THEN
    uid_11 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_11,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'siraj.thekodan@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SIRAJ UMMER - THEKODAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_11,
      uid_11::text,
      json_build_object('sub', uid_11::text, 'email', 'siraj.thekodan@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_11, 'SIRAJ UMMER - THEKODAN', 'siraj.thekodan@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_11,
    '70183',
    '2205329259',
    'V1874093',
    'bupa-1601',
    'Manufacturing officer',
    '1980-01-01',
    '2031-07-27',
    '2026-07-26',
    '2026-01-07'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [13/219] NAZIM - - MUHAMM (90003)
  SELECT id INTO uid_12 FROM profiles WHERE email = 'nazim.muhamm@company.com';
  IF uid_12 IS NULL THEN
    uid_12 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_12,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'nazim.muhamm@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"NAZIM - - MUHAMM"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_12,
      uid_12::text,
      json_build_object('sub', uid_12::text, 'email', 'nazim.muhamm@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_12, 'NAZIM - - MUHAMM', 'nazim.muhamm@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_12,
    '90003',
    '2211983826',
    'X4110204',
    'bupa-1602',
    'Maintenance Supervisor',
    '1969-01-01',
    '2034-03-05',
    '2026-06-09',
    '2034-03-05'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [14/219] SOHID MIAH - - MUSLEM UDDIN (90004)
  SELECT id INTO uid_13 FROM profiles WHERE email = 'sohid.uddin@company.com';
  IF uid_13 IS NULL THEN
    uid_13 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_13,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sohid.uddin@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SOHID MIAH - - MUSLEM UDDIN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_13,
      uid_13::text,
      json_build_object('sub', uid_13::text, 'email', 'sohid.uddin@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_13, 'SOHID MIAH - - MUSLEM UDDIN', 'sohid.uddin@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_13,
    '90004',
    '2215036829',
    'EN0201719',
    'bupa-1603',
    'Manufacturing officer',
    '1978-01-01',
    '2030-02-09',
    '2026-06-29',
    '2030-02-09'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [15/219] ABUHANIF MUSLEMUDDIN (90005)
  SELECT id INTO uid_14 FROM profiles WHERE email = 'abuhanif.muslemuddin@company.com';
  IF uid_14 IS NULL THEN
    uid_14 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_14,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'abuhanif.muslemuddin@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ABUHANIF MUSLEMUDDIN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_14,
      uid_14::text,
      json_build_object('sub', uid_14::text, 'email', 'abuhanif.muslemuddin@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_14, 'ABUHANIF MUSLEMUDDIN', 'abuhanif.muslemuddin@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_14,
    '90005',
    '2215725116',
    'EN0074801',
    'bupa-1604',
    'Manufacturing officer',
    '1977-07-20',
    '2029-12-20',
    '2026-08-26',
    '2029-12-20'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [16/219] SAJJAD HUSSAIN RASHID (90006)
  SELECT id INTO uid_15 FROM profiles WHERE email = 'sajjad.rashid@company.com';
  IF uid_15 IS NULL THEN
    uid_15 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_15,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sajjad.rashid@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SAJJAD HUSSAIN RASHID"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_15,
      uid_15::text,
      json_build_object('sub', uid_15::text, 'email', 'sajjad.rashid@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_15, 'SAJJAD HUSSAIN RASHID', 'sajjad.rashid@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_15,
    '90006',
    '2216165064',
    'JG6901062',
    'bupa-1605',
    'Blacksmith',
    '1982-04-16',
    '2034-09-09',
    '2026-08-19',
    '2034-09-09'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [17/219] IMRAN - - KHAN (90007)
  SELECT id INTO uid_16 FROM profiles WHERE email = 'imran.khan@company.com';
  IF uid_16 IS NULL THEN
    uid_16 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_16,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'imran.khan@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"IMRAN - - KHAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_16,
      uid_16::text,
      json_build_object('sub', uid_16::text, 'email', 'imran.khan@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_16, 'IMRAN - - KHAN', 'imran.khan@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_16,
    '90007',
    '2221048404',
    'X4108999',
    'bupa-1606',
    'Maintenance Supervisor',
    '1982-01-01',
    '2034-03-04',
    '2026-08-19',
    '2034-03-04'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [18/219] ABDUL - - SALIM (90008)
  SELECT id INTO uid_17 FROM profiles WHERE email = 'abdul.salim@company.com';
  IF uid_17 IS NULL THEN
    uid_17 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_17,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'abdul.salim@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ABDUL - - SALIM"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_17,
      uid_17::text,
      json_build_object('sub', uid_17::text, 'email', 'abdul.salim@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_17, 'ABDUL - - SALIM', 'abdul.salim@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_17,
    '90008',
    '2222493401',
    'X4110236',
    'bupa-1607',
    'Bus  Driver',
    '1969-04-18',
    '2034-03-05',
    '2026-03-22',
    '2034-03-05'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [19/219] MOHAMMAD MANSOOR - ALAM (90009)
  SELECT id INTO uid_18 FROM profiles WHERE email = 'mohammad.alam@company.com';
  IF uid_18 IS NULL THEN
    uid_18 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_18,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohammad.alam@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MOHAMMAD MANSOOR - ALAM"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_18,
      uid_18::text,
      json_build_object('sub', uid_18::text, 'email', 'mohammad.alam@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_18, 'MOHAMMAD MANSOOR - ALAM', 'mohammad.alam@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_18,
    '90009',
    '2224391108',
    'V9317343',
    'bupa-1608',
    'Manufacturing officer',
    '1977-01-03',
    '2032-07-12',
    '2026-07-16',
    '2032-07-12'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [20/219] SURESH BABU PANDATH (90010)
  SELECT id INTO uid_19 FROM profiles WHERE email = 'suresh.pandath@company.com';
  IF uid_19 IS NULL THEN
    uid_19 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_19,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'suresh.pandath@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SURESH BABU PANDATH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_19,
      uid_19::text,
      json_build_object('sub', uid_19::text, 'email', 'suresh.pandath@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_19, 'SURESH BABU PANDATH', 'suresh.pandath@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_19,
    '90010',
    '2233939434',
    'V1874055',
    'bupa-1609',
    'Maintenance Supervisor',
    '1980-05-05',
    '2031-07-27',
    '2026-07-26',
    '2031-07-27'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [21/219] MUHAMMAD JAHANGIR JAN MUHAMMAD (90011)
  SELECT id INTO uid_20 FROM profiles WHERE email = 'muhammad.muhammad@company.com';
  IF uid_20 IS NULL THEN
    uid_20 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_20,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'muhammad.muhammad@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MUHAMMAD JAHANGIR JAN MUHAMMAD"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_20,
      uid_20::text,
      json_build_object('sub', uid_20::text, 'email', 'muhammad.muhammad@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_20, 'MUHAMMAD JAHANGIR JAN MUHAMMAD', 'muhammad.muhammad@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_20,
    '90011',
    '2234185763',
    'AF8109164',
    'bupa-1610',
    'Pipe installer',
    '1976-01-01',
    '2035-09-02',
    '2026-03-15',
    '2035-09-02'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [22/219] SADAQUR RAHMAN TORAB ALI (90012)
  SELECT id INTO uid_21 FROM profiles WHERE email = 'sadaqur.ali@company.com';
  IF uid_21 IS NULL THEN
    uid_21 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_21,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sadaqur.ali@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SADAQUR RAHMAN TORAB ALI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_21,
      uid_21::text,
      json_build_object('sub', uid_21::text, 'email', 'sadaqur.ali@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_21, 'SADAQUR RAHMAN TORAB ALI', 'sadaqur.ali@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_21,
    '90012',
    '2238312355',
    'EN0191702',
    'bupa-1611',
    'Manufacturing officer',
    '1975-01-02',
    '2030-01-05',
    '2026-07-15',
    '2030-01-05'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [23/219] NAZI - - NASAR (90013)
  SELECT id INTO uid_22 FROM profiles WHERE email = 'nazi.nasar@company.com';
  IF uid_22 IS NULL THEN
    uid_22 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_22,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'nazi.nasar@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"NAZI - - NASAR"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_22,
      uid_22::text,
      json_build_object('sub', uid_22::text, 'email', 'nazi.nasar@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_22, 'NAZI - - NASAR', 'nazi.nasar@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_22,
    '90013',
    '2244305583',
    'C8698109',
    'bupa-1612',
    'Manufacturing officer',
    '1986-05-20',
    '2035-05-21',
    '2026-04-19',
    '2035-05-21'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [24/219] KAMRUL HASAN HALIM AKHON (90014)
  SELECT id INTO uid_23 FROM profiles WHERE email = 'kamrul.akhon@company.com';
  IF uid_23 IS NULL THEN
    uid_23 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_23,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'kamrul.akhon@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"KAMRUL HASAN HALIM AKHON"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_23,
      uid_23::text,
      json_build_object('sub', uid_23::text, 'email', 'kamrul.akhon@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_23, 'KAMRUL HASAN HALIM AKHON', 'kamrul.akhon@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_23,
    '90014',
    '2245207739',
    'EN0219522',
    'bupa-1613',
    'Load and unload worker',
    '1978-12-02',
    '2030-02-19',
    '2026-06-23',
    '2030-02-19'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [25/219] SHOHIDUL ISLAM SATTAR MIA (90015)
  SELECT id INTO uid_24 FROM profiles WHERE email = 'shohidul.mia@company.com';
  IF uid_24 IS NULL THEN
    uid_24 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_24,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'shohidul.mia@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SHOHIDUL ISLAM SATTAR MIA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_24,
      uid_24::text,
      json_build_object('sub', uid_24::text, 'email', 'shohidul.mia@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_24, 'SHOHIDUL ISLAM SATTAR MIA', 'shohidul.mia@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_24,
    '90015',
    '2246341354',
    'EM0963224',
    'bupa-1614',
    'Manufacturing officer',
    '1983-05-10',
    '2030-01-06',
    '2026-06-08',
    '2030-01-06'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [26/219] MASUM MOHAMMED MAHATAB MASUM (90016)
  SELECT id INTO uid_25 FROM profiles WHERE email = 'masum.masum@company.com';
  IF uid_25 IS NULL THEN
    uid_25 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_25,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'masum.masum@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MASUM MOHAMMED MAHATAB MASUM"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_25,
      uid_25::text,
      json_build_object('sub', uid_25::text, 'email', 'masum.masum@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_25, 'MASUM MOHAMMED MAHATAB MASUM', 'masum.masum@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_25,
    '90016',
    '2247500669',
    'EM0811891',
    'bupa-1615',
    'Maintenance Supervisor',
    '1977-08-06',
    '2029-08-28',
    '2026-08-24',
    '2029-08-28'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [27/219] AHAED ALI SOWKAT MONDAL (90017)
  SELECT id INTO uid_26 FROM profiles WHERE email = 'ahaed.mondal@company.com';
  IF uid_26 IS NULL THEN
    uid_26 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_26,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'ahaed.mondal@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"AHAED ALI SOWKAT MONDAL"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_26,
      uid_26::text,
      json_build_object('sub', uid_26::text, 'email', 'ahaed.mondal@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_26, 'AHAED ALI SOWKAT MONDAL', 'ahaed.mondal@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_26,
    '90017',
    '2252939323',
    'EN0407528',
    'bupa-1616',
    'Workshop worker',
    '1982-01-10',
    '2030-08-03',
    '2026-04-22',
    '2030-08-03'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [28/219] BHIM BAHADUR KHADKA O (90018)
  SELECT id INTO uid_27 FROM profiles WHERE email = 'bhim.o@company.com';
  IF uid_27 IS NULL THEN
    uid_27 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_27,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'bhim.o@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"BHIM BAHADUR KHADKA O"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_27,
      uid_27::text,
      json_build_object('sub', uid_27::text, 'email', 'bhim.o@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_27, 'BHIM BAHADUR KHADKA O', 'bhim.o@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_27,
    '90018',
    '2253348995',
    'PA3755097',
    'bupa-1617',
    'Heavy Equipment Mechanic',
    '1974-09-23',
    '2035-01-24',
    '2026-09-05',
    '2035-01-24'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [29/219] SHAHAB UDDIN CHAN MIAH (90019)
  SELECT id INTO uid_28 FROM profiles WHERE email = 'shahab.miah@company.com';
  IF uid_28 IS NULL THEN
    uid_28 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_28,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'shahab.miah@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SHAHAB UDDIN CHAN MIAH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_28,
      uid_28::text,
      json_build_object('sub', uid_28::text, 'email', 'shahab.miah@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_28, 'SHAHAB UDDIN CHAN MIAH', 'shahab.miah@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_28,
    '90019',
    '2255291383',
    'EN0139112',
    'bupa-1618',
    'Manufacturing officer',
    '1972-02-03',
    '2029-12-30',
    '2026-03-10',
    '2029-12-30'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [30/219] MOHAMMED AMINUL - - HASAN (90020)
  SELECT id INTO uid_29 FROM profiles WHERE email = 'mohammed.hasan@company.com';
  IF uid_29 IS NULL THEN
    uid_29 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_29,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohammed.hasan@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MOHAMMED AMINUL - - HASAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_29,
      uid_29::text,
      json_build_object('sub', uid_29::text, 'email', 'mohammed.hasan@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_29, 'MOHAMMED AMINUL - - HASAN', 'mohammed.hasan@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_29,
    '90020',
    '2255345155',
    'R7722292',
    'bupa-1619',
    'Maintenance Supervisor',
    '1984-12-31',
    '2027-06-13',
    '2026-09-05',
    '2027-06-13'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [31/219] HAREEF HAMZA (90021)
  SELECT id INTO uid_30 FROM profiles WHERE email = 'hareef.hamza@company.com';
  IF uid_30 IS NULL THEN
    uid_30 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_30,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'hareef.hamza@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"HAREEF HAMZA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_30,
      uid_30::text,
      json_build_object('sub', uid_30::text, 'email', 'hareef.hamza@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_30, 'HAREEF HAMZA', 'hareef.hamza@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_30,
    '90021',
    '2258608229',
    'V1879942',
    'bupa-1620',
    'Manufacturing officer',
    '1983-10-10',
    '2031-08-17',
    '2026-04-18',
    '2031-08-17'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [32/219] MAHFOOZ ALAM MAKSOOD AHMAD (90022)
  SELECT id INTO uid_31 FROM profiles WHERE email = 'mahfooz.ahmad@company.com';
  IF uid_31 IS NULL THEN
    uid_31 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_31,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mahfooz.ahmad@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MAHFOOZ ALAM MAKSOOD AHMAD"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_31,
      uid_31::text,
      json_build_object('sub', uid_31::text, 'email', 'mahfooz.ahmad@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_31, 'MAHFOOZ ALAM MAKSOOD AHMAD', 'mahfooz.ahmad@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_31,
    '90022',
    '2259833974',
    'C7084674',
    'bupa-1621',
    'Constructing worker',
    '1977-10-03',
    '2035-03-12',
    '2026-04-03',
    '2035-03-12'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [33/219] MUHAMMAD NAWAZ CHAUDHRY MUHAMMAD ALI (90023)
  SELECT id INTO uid_32 FROM profiles WHERE email = 'muhammad.ali@company.com';
  IF uid_32 IS NULL THEN
    uid_32 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_32,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'muhammad.ali@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MUHAMMAD NAWAZ CHAUDHRY MUHAMMAD ALI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_32,
      uid_32::text,
      json_build_object('sub', uid_32::text, 'email', 'muhammad.ali@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_32, 'MUHAMMAD NAWAZ CHAUDHRY MUHAMMAD ALI', 'muhammad.ali@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_32,
    '90023',
    '2276901739',
    'AK9617154',
    'bupa-1622',
    'Building Electrician',
    '1985-05-10',
    '2026-03-29',
    '2026-08-12',
    '2026-03-29'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [34/219] PURAN SAH - TELI (90024)
  SELECT id INTO uid_33 FROM profiles WHERE email = 'puran.teli@company.com';
  IF uid_33 IS NULL THEN
    uid_33 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_33,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'puran.teli@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"PURAN SAH - TELI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_33,
      uid_33::text,
      json_build_object('sub', uid_33::text, 'email', 'puran.teli@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_33, 'PURAN SAH - TELI', 'puran.teli@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_33,
    '90024',
    '2277555922',
    'PA2729505',
    'bupa-1623',
    'Manufacturing officer',
    '1981-05-28',
    '2034-05-01',
    '2026-08-11',
    '2034-05-01'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [35/219] MOHAMMAD RAHEEMUDDIN MOHAMMAD YOUSUFUDDIN (90025)
  SELECT id INTO uid_34 FROM profiles WHERE email = 'mohammad.yousufuddin@company.com';
  IF uid_34 IS NULL THEN
    uid_34 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_34,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohammad.yousufuddin@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MOHAMMAD RAHEEMUDDIN MOHAMMAD YOUSUFUDDIN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_34,
      uid_34::text,
      json_build_object('sub', uid_34::text, 'email', 'mohammad.yousufuddin@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_34, 'MOHAMMAD RAHEEMUDDIN MOHAMMAD YOUSUFUDDIN', 'mohammad.yousufuddin@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_34,
    '90025',
    '2279575217',
    'R8194591',
    'bupa-1624',
    'Manufacturing officer',
    '1975-05-15',
    '2027-07-23',
    '2026-03-18',
    '2027-07-23'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [36/219] SHUKRA BAHADUR - GURMACHHAN (90026)
  SELECT id INTO uid_35 FROM profiles WHERE email = 'shukra.gurmachhan@company.com';
  IF uid_35 IS NULL THEN
    uid_35 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_35,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'shukra.gurmachhan@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SHUKRA BAHADUR - GURMACHHAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_35,
      uid_35::text,
      json_build_object('sub', uid_35::text, 'email', 'shukra.gurmachhan@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_35, 'SHUKRA BAHADUR - GURMACHHAN', 'shukra.gurmachhan@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_35,
    '90026',
    '2279927327',
    'BA0283094',
    'bupa-1625',
    'Manufacturing officer',
    '1984-10-05',
    '2033-08-30',
    '2026-08-21',
    '2033-08-30'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [37/219] FAREED AHMED ABDUL SATTAR (90027)
  SELECT id INTO uid_36 FROM profiles WHERE email = 'fareed.sattar@company.com';
  IF uid_36 IS NULL THEN
    uid_36 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_36,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'fareed.sattar@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"FAREED AHMED ABDUL SATTAR"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_36,
      uid_36::text,
      json_build_object('sub', uid_36::text, 'email', 'fareed.sattar@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_36, 'FAREED AHMED ABDUL SATTAR', 'fareed.sattar@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_36,
    '90027',
    '2286966086',
    'KZ1152603',
    'bupa-1626',
    'Manufacturing officer',
    '1977-01-12',
    '2027-06-14',
    '2026-04-29',
    '2027-06-14'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [38/219] مامون سليمان بخيت سعد (90028)
  SELECT id INTO uid_37 FROM profiles WHERE email = 'user@company.com';
  IF uid_37 IS NULL THEN
    uid_37 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_37,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'user@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"مامون سليمان بخيت سعد"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_37,
      uid_37::text,
      json_build_object('sub', uid_37::text, 'email', 'user@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_37, 'مامون سليمان بخيت سعد', 'user@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_37,
    '90028',
    '2287116038',
    'P13425523',
    'bupa-1627',
    'Bus  Driver',
    '1958-07-13',
    '2035-03-17',
    '2026-04-21',
    '2035-03-17'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [39/219] MOHAMMED RAZIK AHAMED BAVA (90029)
  SELECT id INTO uid_38 FROM profiles WHERE email = 'mohammed.bava@company.com';
  IF uid_38 IS NULL THEN
    uid_38 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_38,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohammed.bava@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MOHAMMED RAZIK AHAMED BAVA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_38,
      uid_38::text,
      json_build_object('sub', uid_38::text, 'email', 'mohammed.bava@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_38, 'MOHAMMED RAZIK AHAMED BAVA', 'mohammed.bava@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_38,
    '90029',
    '2288278803',
    'R7722674',
    'bupa-1628',
    'Manufacturing officer',
    '1985-07-31',
    '2027-06-14',
    '2026-03-16',
    '2027-06-14'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [40/219] MOHAMMED ISMAIL BARKUR (90030)
  SELECT id INTO uid_39 FROM profiles WHERE email = 'mohammed.barkur@company.com';
  IF uid_39 IS NULL THEN
    uid_39 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_39,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohammed.barkur@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MOHAMMED ISMAIL BARKUR"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_39,
      uid_39::text,
      json_build_object('sub', uid_39::text, 'email', 'mohammed.barkur@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_39, 'MOHAMMED ISMAIL BARKUR', 'mohammed.barkur@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_39,
    '90030',
    '2290321591',
    'V6097547',
    'bupa-1629',
    'Bus  Driver',
    '1966-03-17',
    '2031-05-08',
    '2026-09-14',
    '2031-05-08'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [41/219] TIRTHA RAJ GIRI PREM (90031)
  SELECT id INTO uid_40 FROM profiles WHERE email = 'tirtha.prem@company.com';
  IF uid_40 IS NULL THEN
    uid_40 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_40,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'tirtha.prem@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"TIRTHA RAJ GIRI PREM"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_40,
      uid_40::text,
      json_build_object('sub', uid_40::text, 'email', 'tirtha.prem@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_40, 'TIRTHA RAJ GIRI PREM', 'tirtha.prem@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_40,
    '90031',
    '2291058119',
    'PA0736432',
    'bupa-1630',
    'Chemical Procesing Machin Oper',
    '1983-07-31',
    '2032-09-19',
    '2026-04-27',
    '2032-09-19'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [42/219] ALTHAF ALAVUDEEN EBRAHIM (90032)
  SELECT id INTO uid_41 FROM profiles WHERE email = 'althaf.ebrahim@company.com';
  IF uid_41 IS NULL THEN
    uid_41 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_41,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'althaf.ebrahim@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ALTHAF ALAVUDEEN EBRAHIM"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_41,
      uid_41::text,
      json_build_object('sub', uid_41::text, 'email', 'althaf.ebrahim@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_41, 'ALTHAF ALAVUDEEN EBRAHIM', 'althaf.ebrahim@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_41,
    '90032',
    '2298261476',
    'S9861934',
    'bupa-1631',
    'Occ Health & Safety Supervisor',
    '1989-07-12',
    '2029-03-03',
    '2026-04-27',
    '2029-03-03'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [43/219] RIYAS ABDUL KHAREEM (90033)
  SELECT id INTO uid_42 FROM profiles WHERE email = 'riyas.khareem@company.com';
  IF uid_42 IS NULL THEN
    uid_42 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_42,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'riyas.khareem@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"RIYAS ABDUL KHAREEM"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_42,
      uid_42::text,
      json_build_object('sub', uid_42::text, 'email', 'riyas.khareem@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_42, 'RIYAS ABDUL KHAREEM', 'riyas.khareem@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_42,
    '90033',
    '2299400446',
    'T1915876',
    'bupa-1632',
    'Maintenance Supervisor',
    '1989-05-24',
    '2028-12-26',
    '2026-04-07',
    '2028-12-26'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [44/219] SHAHID MEHMOOD MUHAMMAD FARMAN (90034)
  SELECT id INTO uid_43 FROM profiles WHERE email = 'shahid.farman@company.com';
  IF uid_43 IS NULL THEN
    uid_43 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_43,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'shahid.farman@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SHAHID MEHMOOD MUHAMMAD FARMAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_43,
      uid_43::text,
      json_build_object('sub', uid_43::text, 'email', 'shahid.farman@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_43, 'SHAHID MEHMOOD MUHAMMAD FARMAN', 'shahid.farman@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_43,
    '90034',
    '2302066523',
    'MQ0150983',
    'bupa-1633',
    'Constructing worker',
    '1986-09-18',
    '2034-08-09',
    '2026-08-26',
    '2034-08-09'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [45/219] JOY MICHAEL (90035)
  SELECT id INTO uid_44 FROM profiles WHERE email = 'joy.michael@company.com';
  IF uid_44 IS NULL THEN
    uid_44 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_44,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'joy.michael@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"JOY MICHAEL"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_44,
      uid_44::text,
      json_build_object('sub', uid_44::text, 'email', 'joy.michael@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_44, 'JOY MICHAEL', 'joy.michael@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_44,
    '90035',
    '2302290958',
    'V9324708',
    'bupa-1634',
    'Pipe installer',
    '1973-09-17',
    '2032-08-03',
    '2026-07-10',
    '2032-08-03'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [46/219] DYLON DERICK COELHO (90036)
  SELECT id INTO uid_45 FROM profiles WHERE email = 'dylon.coelho@company.com';
  IF uid_45 IS NULL THEN
    uid_45 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_45,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'dylon.coelho@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DYLON DERICK COELHO"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_45,
      uid_45::text,
      json_build_object('sub', uid_45::text, 'email', 'dylon.coelho@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_45, 'DYLON DERICK COELHO', 'dylon.coelho@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_45,
    '90036',
    '2320741644',
    'B6328314',
    'bupa-1635',
    'Maintenance Supervisor',
    '1986-03-09',
    '2033-11-14',
    '2026-05-16',
    '2033-11-14'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [47/219] BELLUR MUHAMMAD ANSAR (90037)
  SELECT id INTO uid_46 FROM profiles WHERE email = 'bellur.ansar@company.com';
  IF uid_46 IS NULL THEN
    uid_46 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_46,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'bellur.ansar@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"BELLUR MUHAMMAD ANSAR"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_46,
      uid_46::text,
      json_build_object('sub', uid_46::text, 'email', 'bellur.ansar@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_46, 'BELLUR MUHAMMAD ANSAR', 'bellur.ansar@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_46,
    '90037',
    '2324083688',
    'P6289050',
    'bupa-1636',
    'Manufacturing officer',
    '1988-03-27',
    '2027-05-20',
    '2026-08-25',
    '2027-05-20'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [48/219] MOHAMMED HAMED MOHAMMED GHOUSE (90038)
  SELECT id INTO uid_47 FROM profiles WHERE email = 'mohammed.ghouse@company.com';
  IF uid_47 IS NULL THEN
    uid_47 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_47,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohammed.ghouse@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MOHAMMED HAMED MOHAMMED GHOUSE"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_47,
      uid_47::text,
      json_build_object('sub', uid_47::text, 'email', 'mohammed.ghouse@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_47, 'MOHAMMED HAMED MOHAMMED GHOUSE', 'mohammed.ghouse@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_47,
    '90038',
    '2329027367',
    'S4721591',
    'bupa-1637',
    'Manufacturing officer',
    '1978-04-18',
    '2028-04-28',
    '2026-03-26',
    '2028-04-28'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [49/219] SHAFEEK KUNJU MON (90039)
  SELECT id INTO uid_48 FROM profiles WHERE email = 'shafeek.mon@company.com';
  IF uid_48 IS NULL THEN
    uid_48 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_48,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'shafeek.mon@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SHAFEEK KUNJU MON"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_48,
      uid_48::text,
      json_build_object('sub', uid_48::text, 'email', 'shafeek.mon@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_48, 'SHAFEEK KUNJU MON', 'shafeek.mon@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_48,
    '90039',
    '2332653399',
    'S3865952',
    'bupa-1638',
    'Manufacturing officer',
    '1986-05-23',
    '2028-03-17',
    '2026-07-26',
    '2028-03-17'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [50/219] SHIBU KHAN MOHAMMAD ISHRAIL (90040)
  SELECT id INTO uid_49 FROM profiles WHERE email = 'shibu.ishrail@company.com';
  IF uid_49 IS NULL THEN
    uid_49 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_49,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'shibu.ishrail@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SHIBU KHAN MOHAMMAD ISHRAIL"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_49,
      uid_49::text,
      json_build_object('sub', uid_49::text, 'email', 'shibu.ishrail@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_49, 'SHIBU KHAN MOHAMMAD ISHRAIL', 'shibu.ishrail@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_49,
    '90040',
    '2335556102',
    'T8231183',
    'bupa-1639',
    'Heavy Equipment Mechanic',
    '1986-04-25',
    '2029-08-27',
    '2026-08-13',
    '2029-08-27'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [51/219] HUSSAIN FAKHRUDDIN FAKHRUDDIN (90041)
  SELECT id INTO uid_50 FROM profiles WHERE email = 'hussain.fakhruddin@company.com';
  IF uid_50 IS NULL THEN
    uid_50 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_50,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'hussain.fakhruddin@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"HUSSAIN FAKHRUDDIN FAKHRUDDIN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_50,
      uid_50::text,
      json_build_object('sub', uid_50::text, 'email', 'hussain.fakhruddin@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_50, 'HUSSAIN FAKHRUDDIN FAKHRUDDIN', 'hussain.fakhruddin@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_50,
    '90041',
    '2336028986',
    'AD8348203',
    'bupa-1640',
    'Maintenance Supervisor',
    '1986-05-13',
    '2026-04-21',
    '2026-08-06',
    '2026-04-21'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [52/219] SYED ILYAS SYED ASLAM (90042)
  SELECT id INTO uid_51 FROM profiles WHERE email = 'syed.aslam@company.com';
  IF uid_51 IS NULL THEN
    uid_51 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_51,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'syed.aslam@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SYED ILYAS SYED ASLAM"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_51,
      uid_51::text,
      json_build_object('sub', uid_51::text, 'email', 'syed.aslam@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_51, 'SYED ILYAS SYED ASLAM', 'syed.aslam@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_51,
    '90042',
    '2338360130',
    'T3925677',
    'bupa-1641',
    'Maintenance Supervisor',
    '1988-10-22',
    '2029-03-31',
    '2026-03-10',
    '2029-03-31'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [53/219] CHETTIYAN THODI ABDUL NASAR (90043)
  SELECT id INTO uid_52 FROM profiles WHERE email = 'chettiyan.nasar@company.com';
  IF uid_52 IS NULL THEN
    uid_52 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_52,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'chettiyan.nasar@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"CHETTIYAN THODI ABDUL NASAR"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_52,
      uid_52::text,
      json_build_object('sub', uid_52::text, 'email', 'chettiyan.nasar@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_52, 'CHETTIYAN THODI ABDUL NASAR', 'chettiyan.nasar@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_52,
    '90043',
    '2348542578',
    'P7148550',
    'bupa-1642',
    'Building Electrician',
    '1985-01-02',
    '2027-02-08',
    '2026-04-26',
    '2027-02-08'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [54/219] SHAFEEK ALIYARUKUTTY ALIYARUKUTTY (90044)
  SELECT id INTO uid_53 FROM profiles WHERE email = 'shafeek.aliyarukutty@company.com';
  IF uid_53 IS NULL THEN
    uid_53 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_53,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'shafeek.aliyarukutty@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SHAFEEK ALIYARUKUTTY ALIYARUKUTTY"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_53,
      uid_53::text,
      json_build_object('sub', uid_53::text, 'email', 'shafeek.aliyarukutty@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_53, 'SHAFEEK ALIYARUKUTTY ALIYARUKUTTY', 'shafeek.aliyarukutty@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_53,
    '90044',
    '2351405689',
    'V3663751',
    'bupa-1643',
    'Power Cable Connector',
    '1990-03-21',
    '2032-02-08',
    '2026-03-22',
    '2032-02-08'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [55/219] RESHAMSINGH SHNGARA SINGH BHATT (90045)
  SELECT id INTO uid_54 FROM profiles WHERE email = 'reshamsingh.bhatt@company.com';
  IF uid_54 IS NULL THEN
    uid_54 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_54,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'reshamsingh.bhatt@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"RESHAMSINGH SHNGARA SINGH BHATT"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_54,
      uid_54::text,
      json_build_object('sub', uid_54::text, 'email', 'reshamsingh.bhatt@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_54, 'RESHAMSINGH SHNGARA SINGH BHATT', 'reshamsingh.bhatt@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_54,
    '90045',
    '2351720038',
    'V6795212',
    'bupa-1644',
    'Maintenance Supervisor',
    '1960-06-28',
    '2027-04-27',
    '2026-08-05',
    '2027-04-27'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [56/219] DIL AFSAR KHAN MAQBOOL UR REHMAN (90046)
  SELECT id INTO uid_55 FROM profiles WHERE email = 'dil.rehman@company.com';
  IF uid_55 IS NULL THEN
    uid_55 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_55,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'dil.rehman@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DIL AFSAR KHAN MAQBOOL UR REHMAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_55,
      uid_55::text,
      json_build_object('sub', uid_55::text, 'email', 'dil.rehman@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_55, 'DIL AFSAR KHAN MAQBOOL UR REHMAN', 'dil.rehman@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_55,
    '90046',
    '2352536573',
    'TN4111503',
    'bupa-1645',
    'Maintenance Supervisor',
    '1984-03-25',
    '2032-07-03',
    '2026-04-14',
    '2032-07-03'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [57/219] ANVAR SADIK POOLAKKAMPOYIL MUHAMMED (90047)
  SELECT id INTO uid_56 FROM profiles WHERE email = 'anvar.muhammed@company.com';
  IF uid_56 IS NULL THEN
    uid_56 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_56,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'anvar.muhammed@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ANVAR SADIK POOLAKKAMPOYIL MUHAMMED"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_56,
      uid_56::text,
      json_build_object('sub', uid_56::text, 'email', 'anvar.muhammed@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_56, 'ANVAR SADIK POOLAKKAMPOYIL MUHAMMED', 'anvar.muhammed@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_56,
    '90047',
    '2356734315',
    'P8063374',
    'bupa-1646',
    'Chemical Engineer',
    '1986-04-24',
    '2027-04-09',
    '2026-06-14',
    '2027-04-09'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [58/219] HAMEED GUL AJAB GUL (90048)
  SELECT id INTO uid_57 FROM profiles WHERE email = 'hameed.gul@company.com';
  IF uid_57 IS NULL THEN
    uid_57 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_57,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'hameed.gul@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"HAMEED GUL AJAB GUL"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_57,
      uid_57::text,
      json_build_object('sub', uid_57::text, 'email', 'hameed.gul@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_57, 'HAMEED GUL AJAB GUL', 'hameed.gul@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_57,
    '90048',
    '2360481317',
    'CQ4797763',
    'bupa-1647',
    'Boilers Blacksmith',
    '1991-06-27',
    '2029-09-30',
    '2026-04-29',
    '2029-09-30'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [59/219] SHAHID ALI MUHAMMAD RAFIQUE (90049)
  SELECT id INTO uid_58 FROM profiles WHERE email = 'shahid.rafique@company.com';
  IF uid_58 IS NULL THEN
    uid_58 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_58,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'shahid.rafique@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SHAHID ALI MUHAMMAD RAFIQUE"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_58,
      uid_58::text,
      json_build_object('sub', uid_58::text, 'email', 'shahid.rafique@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_58, 'SHAHID ALI MUHAMMAD RAFIQUE', 'shahid.rafique@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_58,
    '90049',
    '2361161744',
    'VM1791754',
    'bupa-1648',
    'Workshop worker',
    '1989-04-01',
    '2035-04-23',
    '2026-05-18',
    '2035-04-23'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [60/219] GANESH PRASAD POUDEL (90050)
  SELECT id INTO uid_59 FROM profiles WHERE email = 'ganesh.poudel@company.com';
  IF uid_59 IS NULL THEN
    uid_59 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_59,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'ganesh.poudel@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"GANESH PRASAD POUDEL"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_59,
      uid_59::text,
      json_build_object('sub', uid_59::text, 'email', 'ganesh.poudel@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_59, 'GANESH PRASAD POUDEL', 'ganesh.poudel@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_59,
    '90050',
    '2370638591',
    'PA3118328',
    'bupa-1649',
    'Manufacturing officer',
    '1975-09-17',
    '2034-07-27',
    '2026-07-12',
    '2034-07-27'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [61/219] شكير وعدودي (90051)
  SELECT id INTO uid_60 FROM profiles WHERE email = 'user2@company.com';
  IF uid_60 IS NULL THEN
    uid_60 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_60,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'user2@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"شكير وعدودي"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_60,
      uid_60::text,
      json_build_object('sub', uid_60::text, 'email', 'user2@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_60, 'شكير وعدودي', 'user2@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_60,
    '90051',
    '2374939920',
    'DK8352869',
    'bupa-1650',
    'Wood Mchn&Tool Oprtr & Prepar',
    '1966-12-02',
    '2029-05-21',
    '2026-04-13',
    '2029-05-21'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [62/219] MUHAMMAD TAHIR FAZAL AHMAD (90052)
  SELECT id INTO uid_61 FROM profiles WHERE email = 'muhammad.ahmad@company.com';
  IF uid_61 IS NULL THEN
    uid_61 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_61,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'muhammad.ahmad@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MUHAMMAD TAHIR FAZAL AHMAD"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_61,
      uid_61::text,
      json_build_object('sub', uid_61::text, 'email', 'muhammad.ahmad@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_61, 'MUHAMMAD TAHIR FAZAL AHMAD', 'muhammad.ahmad@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_61,
    '90052',
    '2374980502',
    'CR7128852',
    'bupa-1651',
    'Pipe installer',
    '1990-12-26',
    '2028-03-11',
    '2026-05-14',
    '2028-03-11'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [63/219] BASHARAT AMIN MUHAMMAD AMIN (90053)
  SELECT id INTO uid_62 FROM profiles WHERE email = 'basharat.amin@company.com';
  IF uid_62 IS NULL THEN
    uid_62 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_62,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'basharat.amin@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"BASHARAT AMIN MUHAMMAD AMIN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_62,
      uid_62::text,
      json_build_object('sub', uid_62::text, 'email', 'basharat.amin@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_62, 'BASHARAT AMIN MUHAMMAD AMIN', 'basharat.amin@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_62,
    '90053',
    '2375082845',
    'CN1209783',
    'bupa-1652',
    'Pipe installer',
    '1982-01-01',
    '2031-07-13',
    '2026-03-08',
    '2031-07-13'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [64/219] SHAFQAT AMIN MUHAMMAD AMIN (90054)
  SELECT id INTO uid_63 FROM profiles WHERE email = 'shafqat.amin@company.com';
  IF uid_63 IS NULL THEN
    uid_63 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_63,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'shafqat.amin@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SHAFQAT AMIN MUHAMMAD AMIN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_63,
      uid_63::text,
      json_build_object('sub', uid_63::text, 'email', 'shafqat.amin@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_63, 'SHAFQAT AMIN MUHAMMAD AMIN', 'shafqat.amin@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_63,
    '90054',
    '2377060906',
    'AR1206373',
    'bupa-1653',
    'Pipe installer',
    '1976-01-01',
    '2026-04-14',
    '2026-08-09',
    '2026-04-14'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [65/219] WAQAR UDDIN SHAIKH MOHIUDDIN (90055)
  SELECT id INTO uid_64 FROM profiles WHERE email = 'waqar.mohiuddin@company.com';
  IF uid_64 IS NULL THEN
    uid_64 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_64,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'waqar.mohiuddin@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"WAQAR UDDIN SHAIKH MOHIUDDIN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_64,
      uid_64::text,
      json_build_object('sub', uid_64::text, 'email', 'waqar.mohiuddin@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_64, 'WAQAR UDDIN SHAIKH MOHIUDDIN', 'waqar.mohiuddin@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_64,
    '90055',
    '2378423632',
    'CF5191763',
    'bupa-1654',
    'Occ Health & Safety Supervisor',
    '1969-04-17',
    '2033-03-27',
    '2026-03-11',
    '2033-03-27'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [66/219] EMMANUEL ESCULTOS TUBILAN (90056)
  SELECT id INTO uid_65 FROM profiles WHERE email = 'emmanuel.tubilan@company.com';
  IF uid_65 IS NULL THEN
    uid_65 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_65,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'emmanuel.tubilan@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"EMMANUEL ESCULTOS TUBILAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_65,
      uid_65::text,
      json_build_object('sub', uid_65::text, 'email', 'emmanuel.tubilan@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_65, 'EMMANUEL ESCULTOS TUBILAN', 'emmanuel.tubilan@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_65,
    '90056',
    '2382989842',
    'P8057500A',
    'bupa-1655',
    'Truck Driver',
    '1979-12-21',
    '2028-07-23',
    '2026-08-18',
    '2028-07-23'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [67/219] ARWIN SUMAGUI MAXIMO (90057)
  SELECT id INTO uid_66 FROM profiles WHERE email = 'arwin.maximo@company.com';
  IF uid_66 IS NULL THEN
    uid_66 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_66,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'arwin.maximo@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ARWIN SUMAGUI MAXIMO"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_66,
      uid_66::text,
      json_build_object('sub', uid_66::text, 'email', 'arwin.maximo@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_66, 'ARWIN SUMAGUI MAXIMO', 'arwin.maximo@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_66,
    '90057',
    '2382990089',
    'P9418033A',
    'bupa-1656',
    'Maintenance Supervisor',
    '1987-03-13',
    '2028-11-05',
    '2026-05-20',
    '2028-11-05'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [68/219] MOHAMED NUSRI MOHAMED LAFIR (90058)
  SELECT id INTO uid_67 FROM profiles WHERE email = 'mohamed.lafir@company.com';
  IF uid_67 IS NULL THEN
    uid_67 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_67,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohamed.lafir@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MOHAMED NUSRI MOHAMED LAFIR"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_67,
      uid_67::text,
      json_build_object('sub', uid_67::text, 'email', 'mohamed.lafir@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_67, 'MOHAMED NUSRI MOHAMED LAFIR', 'mohamed.lafir@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_67,
    '90058',
    '2383629751',
    'N8912908',
    'bupa-1657',
    'Mechanical Maintenance Tech.',
    '1978-11-05',
    '2031-03-19',
    '2026-08-17',
    '2031-03-19'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [69/219] MUHAMMAD WAQAS MUHAMMAD SHABBIR (90059)
  SELECT id INTO uid_68 FROM profiles WHERE email = 'muhammad.shabbir@company.com';
  IF uid_68 IS NULL THEN
    uid_68 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_68,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'muhammad.shabbir@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MUHAMMAD WAQAS MUHAMMAD SHABBIR"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_68,
      uid_68::text,
      json_build_object('sub', uid_68::text, 'email', 'muhammad.shabbir@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_68, 'MUHAMMAD WAQAS MUHAMMAD SHABBIR', 'muhammad.shabbir@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_68,
    '90059',
    '2384257016',
    'BD6314682',
    'bupa-1658',
    'Chemical Engineer',
    '1989-07-12',
    '2028-06-10',
    '2026-04-20',
    '2028-06-10'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [70/219] RICARDO JR ROXAS JAVIER (90060)
  SELECT id INTO uid_69 FROM profiles WHERE email = 'ricardo.javier@company.com';
  IF uid_69 IS NULL THEN
    uid_69 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_69,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'ricardo.javier@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"RICARDO JR ROXAS JAVIER"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_69,
      uid_69::text,
      json_build_object('sub', uid_69::text, 'email', 'ricardo.javier@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_69, 'RICARDO JR ROXAS JAVIER', 'ricardo.javier@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_69,
    '90060',
    '2385840307',
    'P8886053A',
    'bupa-1659',
    'Maintenance Supervisor',
    '1977-09-06',
    '2028-09-24',
    '2026-04-09',
    '2028-09-24'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [71/219] BALACHANDIRAN RAMAYIA (90061)
  SELECT id INTO uid_70 FROM profiles WHERE email = 'balachandiran.ramayia@company.com';
  IF uid_70 IS NULL THEN
    uid_70 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_70,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'balachandiran.ramayia@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"BALACHANDIRAN RAMAYIA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_70,
      uid_70::text,
      json_build_object('sub', uid_70::text, 'email', 'balachandiran.ramayia@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_70, 'BALACHANDIRAN RAMAYIA', 'balachandiran.ramayia@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_70,
    '90061',
    '2389249406',
    'N7429658',
    'bupa-1660',
    'Mechanical Maintenance Tech.',
    '1985-12-06',
    '2028-05-08',
    '2026-08-19',
    '2028-05-08'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [72/219] HARI SHANKAR PARIDAS (90062)
  SELECT id INTO uid_71 FROM profiles WHERE email = 'hari.paridas@company.com';
  IF uid_71 IS NULL THEN
    uid_71 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_71,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'hari.paridas@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"HARI SHANKAR PARIDAS"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_71,
      uid_71::text,
      json_build_object('sub', uid_71::text, 'email', 'hari.paridas@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_71, 'HARI SHANKAR PARIDAS', 'hari.paridas@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_71,
    '90062',
    '2394135350',
    'PA3672044',
    'bupa-1661',
    'Manufacturing officer',
    '1989-07-21',
    '2035-01-04',
    '2026-08-17',
    '2035-01-04'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [73/219] INDRA BAHADUR KHATRI (90063)
  SELECT id INTO uid_72 FROM profiles WHERE email = 'indra.khatri@company.com';
  IF uid_72 IS NULL THEN
    uid_72 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_72,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'indra.khatri@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"INDRA BAHADUR KHATRI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_72,
      uid_72::text,
      json_build_object('sub', uid_72::text, 'email', 'indra.khatri@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_72, 'INDRA BAHADUR KHATRI', 'indra.khatri@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_72,
    '90063',
    '2394136903',
    'PA0769589',
    'bupa-1662',
    'Maintenance Supervisor',
    '1993-12-13',
    '2032-09-07',
    '2026-08-11',
    '2032-09-07'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [74/219] MOHAMMAD NASRUDDIN TAIYAB HUSSAIN (90064)
  SELECT id INTO uid_73 FROM profiles WHERE email = 'mohammad.hussain@company.com';
  IF uid_73 IS NULL THEN
    uid_73 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_73,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohammad.hussain@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MOHAMMAD NASRUDDIN TAIYAB HUSSAIN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_73,
      uid_73::text,
      json_build_object('sub', uid_73::text, 'email', 'mohammad.hussain@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_73, 'MOHAMMAD NASRUDDIN TAIYAB HUSSAIN', 'mohammad.hussain@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_73,
    '90064',
    '2397177896',
    'V3658236',
    'bupa-1663',
    'Maintenance Supervisor',
    '1971-05-02',
    '2032-01-18',
    '2026-03-11',
    '2032-01-18'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [75/219] KHURRAM ABBAS MUHAMMAD BOOTA (90065)
  SELECT id INTO uid_74 FROM profiles WHERE email = 'khurram.boota@company.com';
  IF uid_74 IS NULL THEN
    uid_74 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_74,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'khurram.boota@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"KHURRAM ABBAS MUHAMMAD BOOTA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_74,
      uid_74::text,
      json_build_object('sub', uid_74::text, 'email', 'khurram.boota@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_74, 'KHURRAM ABBAS MUHAMMAD BOOTA', 'khurram.boota@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_74,
    '90065',
    '2397657202',
    'GA1010013',
    'bupa-1664',
    'Manufacturing Supervisor',
    '1992-04-15',
    '2031-11-30',
    '2026-06-20',
    '2031-11-30'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [76/219] ADNAN SHAFIQUE MUHAMMAD SHAFIQUE (90066)
  SELECT id INTO uid_75 FROM profiles WHERE email = 'adnan.shafique@company.com';
  IF uid_75 IS NULL THEN
    uid_75 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_75,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'adnan.shafique@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ADNAN SHAFIQUE MUHAMMAD SHAFIQUE"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_75,
      uid_75::text,
      json_build_object('sub', uid_75::text, 'email', 'adnan.shafique@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_75, 'ADNAN SHAFIQUE MUHAMMAD SHAFIQUE', 'adnan.shafique@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_75,
    '90066',
    '2397897733',
    'DD5184942',
    'bupa-1665',
    'Manufacturing Supervisor',
    '1992-07-15',
    '2029-01-30',
    '2026-06-08',
    '2029-01-30'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [77/219] BINU ABRAHAM VADAKKEETTIL THOMAS (90067)
  SELECT id INTO uid_76 FROM profiles WHERE email = 'binu.thomas@company.com';
  IF uid_76 IS NULL THEN
    uid_76 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_76,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'binu.thomas@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"BINU ABRAHAM VADAKKEETTIL THOMAS"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_76,
      uid_76::text,
      json_build_object('sub', uid_76::text, 'email', 'binu.thomas@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_76, 'BINU ABRAHAM VADAKKEETTIL THOMAS', 'binu.thomas@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_76,
    '90067',
    '2400630253',
    'T9283225',
    'bupa-1666',
    'Building Electrician',
    '1979-06-18',
    '2030-08-11',
    '2026-05-21',
    '2030-08-11'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [78/219] RANA AFZAAL AHMAD GULZAR AHMAD (90068)
  SELECT id INTO uid_77 FROM profiles WHERE email = 'rana.ahmad@company.com';
  IF uid_77 IS NULL THEN
    uid_77 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_77,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'rana.ahmad@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"RANA AFZAAL AHMAD GULZAR AHMAD"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_77,
      uid_77::text,
      json_build_object('sub', uid_77::text, 'email', 'rana.ahmad@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_77, 'RANA AFZAAL AHMAD GULZAR AHMAD', 'rana.ahmad@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_77,
    '90068',
    '2404543346',
    'WP1168822',
    'bupa-1667',
    'Occ Health & Safety Supervisor',
    '1993-12-23',
    '2030-08-19',
    '2026-04-13',
    '2030-08-19'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [79/219] NIKHIL NARAYANA PILLAI (90069)
  SELECT id INTO uid_78 FROM profiles WHERE email = 'nikhil.pillai@company.com';
  IF uid_78 IS NULL THEN
    uid_78 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_78,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'nikhil.pillai@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"NIKHIL NARAYANA PILLAI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_78,
      uid_78::text,
      json_build_object('sub', uid_78::text, 'email', 'nikhil.pillai@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_78, 'NIKHIL NARAYANA PILLAI', 'nikhil.pillai@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_78,
    '90069',
    '2425780216',
    'X3692305',
    'bupa-1668',
    'Mechanical Engineer',
    '1986-10-07',
    '2034-02-05',
    '2026-08-15',
    '2034-02-05'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [80/219] ARUN KUMAR LIMBU (90070)
  SELECT id INTO uid_79 FROM profiles WHERE email = 'arun.limbu@company.com';
  IF uid_79 IS NULL THEN
    uid_79 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_79,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'arun.limbu@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ARUN KUMAR LIMBU"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_79,
      uid_79::text,
      json_build_object('sub', uid_79::text, 'email', 'arun.limbu@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_79, 'ARUN KUMAR LIMBU', 'arun.limbu@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_79,
    '90070',
    '2431124383',
    'PA0349585',
    'bupa-1669',
    'Manufacturing officer',
    '1993-09-07',
    '2032-05-16',
    '2026-06-17',
    '2032-05-16'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [81/219] GOPAL SHRESTHA (90071)
  SELECT id INTO uid_80 FROM profiles WHERE email = 'gopal.shrestha@company.com';
  IF uid_80 IS NULL THEN
    uid_80 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_80,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'gopal.shrestha@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"GOPAL SHRESTHA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_80,
      uid_80::text,
      json_build_object('sub', uid_80::text, 'email', 'gopal.shrestha@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_80, 'GOPAL SHRESTHA', 'gopal.shrestha@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_80,
    '90071',
    '2431408067',
    'BA0283391',
    'bupa-1670',
    'Manufacturing officer',
    '1981-11-15',
    '2033-08-30',
    '2026-03-19',
    '2033-08-30'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [82/219] BASANTA SHRESTHA (90072)
  SELECT id INTO uid_81 FROM profiles WHERE email = 'basanta.shrestha@company.com';
  IF uid_81 IS NULL THEN
    uid_81 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_81,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'basanta.shrestha@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"BASANTA SHRESTHA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_81,
      uid_81::text,
      json_build_object('sub', uid_81::text, 'email', 'basanta.shrestha@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_81, 'BASANTA SHRESTHA', 'basanta.shrestha@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_81,
    '90072',
    '2431419726',
    'PA0769587',
    'bupa-1671',
    'Manufacturing officer',
    '1989-06-22',
    '2032-09-07',
    '2026-03-19',
    '2032-09-07'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [83/219] DIPAK JIREL (90073)
  SELECT id INTO uid_82 FROM profiles WHERE email = 'dipak.jirel@company.com';
  IF uid_82 IS NULL THEN
    uid_82 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_82,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'dipak.jirel@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DIPAK JIREL"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_82,
      uid_82::text,
      json_build_object('sub', uid_82::text, 'email', 'dipak.jirel@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_82, 'DIPAK JIREL', 'dipak.jirel@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_82,
    '90073',
    '2431419981',
    'PA3919355',
    'bupa-1672',
    'Manufacturing officer',
    '1984-09-28',
    '2035-12-16',
    '2026-03-18',
    '2035-12-16'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [84/219] RAM KUMAR LIMBU (90074)
  SELECT id INTO uid_83 FROM profiles WHERE email = 'ram.limbu@company.com';
  IF uid_83 IS NULL THEN
    uid_83 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_83,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'ram.limbu@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"RAM KUMAR LIMBU"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_83,
      uid_83::text,
      json_build_object('sub', uid_83::text, 'email', 'ram.limbu@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_83, 'RAM KUMAR LIMBU', 'ram.limbu@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_83,
    '90074',
    '2431464136',
    'PA3420543',
    'bupa-1673',
    'Manufacturing officer',
    '1989-03-22',
    '2034-10-28',
    '2026-03-18',
    '2034-10-28'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [85/219] EDMUNDO PARAGATOS PADILLA (90075)
  SELECT id INTO uid_84 FROM profiles WHERE email = 'edmundo.padilla@company.com';
  IF uid_84 IS NULL THEN
    uid_84 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_84,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'edmundo.padilla@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"EDMUNDO PARAGATOS PADILLA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_84,
      uid_84::text,
      json_build_object('sub', uid_84::text, 'email', 'edmundo.padilla@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_84, 'EDMUNDO PARAGATOS PADILLA', 'edmundo.padilla@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_84,
    '90075',
    '2432380810',
    'P5852699B',
    'bupa-1674',
    'Occ Health & Safety Supervisor',
    '1973-02-15',
    '2030-11-24',
    '2026-04-01',
    '2030-11-24'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [86/219] ROLANDO HIPOLITO POLINTAN (90076)
  SELECT id INTO uid_85 FROM profiles WHERE email = 'rolando.polintan@company.com';
  IF uid_85 IS NULL THEN
    uid_85 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_85,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'rolando.polintan@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ROLANDO HIPOLITO POLINTAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_85,
      uid_85::text,
      json_build_object('sub', uid_85::text, 'email', 'rolando.polintan@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_85, 'ROLANDO HIPOLITO POLINTAN', 'rolando.polintan@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_85,
    '90076',
    '2432381057',
    'P7417603B',
    'bupa-1675',
    'Heavy Equipment Mechanic',
    '1984-07-24',
    '2031-08-16',
    '2026-04-01',
    '2031-08-16'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [87/219] JOHN DARWIN MESA GUANES (90077)
  SELECT id INTO uid_86 FROM profiles WHERE email = 'john.guanes@company.com';
  IF uid_86 IS NULL THEN
    uid_86 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_86,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'john.guanes@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"JOHN DARWIN MESA GUANES"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_86,
      uid_86::text,
      json_build_object('sub', uid_86::text, 'email', 'john.guanes@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_86, 'JOHN DARWIN MESA GUANES', 'john.guanes@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_86,
    '90077',
    '2432381396',
    'P6556772B',
    'bupa-1676',
    'Maintenance Supervisor',
    '1978-04-19',
    '2031-03-23',
    '2026-04-01',
    '2031-03-23'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [88/219] RONALDO LEANO NACION (90078)
  SELECT id INTO uid_87 FROM profiles WHERE email = 'ronaldo.nacion@company.com';
  IF uid_87 IS NULL THEN
    uid_87 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_87,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'ronaldo.nacion@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"RONALDO LEANO NACION"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_87,
      uid_87::text,
      json_build_object('sub', uid_87::text, 'email', 'ronaldo.nacion@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_87, 'RONALDO LEANO NACION', 'ronaldo.nacion@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_87,
    '90078',
    '2432381511',
    'P6452088B',
    'bupa-1677',
    'Maintenance Supervisor',
    '1975-08-16',
    '2031-03-07',
    '2026-10-04',
    '2031-03-07'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [89/219] ALBERTO JR DUYAO TANDOC (90079)
  SELECT id INTO uid_88 FROM profiles WHERE email = 'alberto.tandoc@company.com';
  IF uid_88 IS NULL THEN
    uid_88 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_88,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'alberto.tandoc@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ALBERTO JR DUYAO TANDOC"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_88,
      uid_88::text,
      json_build_object('sub', uid_88::text, 'email', 'alberto.tandoc@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_88, 'ALBERTO JR DUYAO TANDOC', 'alberto.tandoc@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_88,
    '90079',
    '2433070782',
    'P7417898B',
    'bupa-1678',
    'Maintenance Supervisor',
    '1972-05-18',
    '2031-08-16',
    '2026-04-27',
    '2031-08-16'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [90/219] KALIRAM THARU (90080)
  SELECT id INTO uid_89 FROM profiles WHERE email = 'kaliram.tharu@company.com';
  IF uid_89 IS NULL THEN
    uid_89 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_89,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'kaliram.tharu@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"KALIRAM THARU"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_89,
      uid_89::text,
      json_build_object('sub', uid_89::text, 'email', 'kaliram.tharu@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_89, 'KALIRAM THARU', 'kaliram.tharu@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_89,
    '90080',
    '2433359813',
    'PA0561509',
    'bupa-1679',
    'Manufacturing officer',
    '1985-11-25',
    '2032-07-24',
    '2026-04-27',
    '2032-07-24'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [91/219] DEEPAK KAMI (90081)
  SELECT id INTO uid_90 FROM profiles WHERE email = 'deepak.kami@company.com';
  IF uid_90 IS NULL THEN
    uid_90 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_90,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'deepak.kami@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DEEPAK KAMI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_90,
      uid_90::text,
      json_build_object('sub', uid_90::text, 'email', 'deepak.kami@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_90, 'DEEPAK KAMI', 'deepak.kami@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_90,
    '90081',
    '2437217785',
    'PA2862456',
    'bupa-1680',
    'Truck Driver',
    '1976-05-22',
    '2034-06-03',
    '2026-09-06',
    '2034-06-03'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [92/219] TIL BAHADUR DARAI (90082)
  SELECT id INTO uid_91 FROM profiles WHERE email = 'til.darai@company.com';
  IF uid_91 IS NULL THEN
    uid_91 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_91,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'til.darai@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"TIL BAHADUR DARAI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_91,
      uid_91::text,
      json_build_object('sub', uid_91::text, 'email', 'til.darai@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_91, 'TIL BAHADUR DARAI', 'til.darai@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_91,
    '90082',
    '2438042729',
    'PA3575587',
    'bupa-1681',
    'Truck Driver',
    '1978-10-03',
    '2034-12-17',
    '2026-04-11',
    '2034-12-17'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [93/219] SHER BAHADUR RANA (90083)
  SELECT id INTO uid_92 FROM profiles WHERE email = 'sher.rana@company.com';
  IF uid_92 IS NULL THEN
    uid_92 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_92,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sher.rana@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SHER BAHADUR RANA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_92,
      uid_92::text,
      json_build_object('sub', uid_92::text, 'email', 'sher.rana@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_92, 'SHER BAHADUR RANA', 'sher.rana@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_92,
    '90083',
    '2438225670',
    'PA2097328',
    'bupa-1682',
    'Bus  Driver',
    '1976-06-28',
    '2033-11-25',
    '2026-04-11',
    '2033-11-25'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [94/219] LALSAHEB SHAIK VALI (90084)
  SELECT id INTO uid_93 FROM profiles WHERE email = 'lalsaheb.vali@company.com';
  IF uid_93 IS NULL THEN
    uid_93 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_93,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'lalsaheb.vali@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"LALSAHEB SHAIK VALI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_93,
      uid_93::text,
      json_build_object('sub', uid_93::text, 'email', 'lalsaheb.vali@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_93, 'LALSAHEB SHAIK VALI', 'lalsaheb.vali@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_93,
    '90084',
    '2454100476',
    'U0060313',
    'bupa-1683',
    'Manufacturing officer',
    '1981-06-04',
    '2030-11-01',
    '2026-08-18',
    '2030-11-01'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [95/219] MD FARUK (90085)
  SELECT id INTO uid_94 FROM profiles WHERE email = 'md.faruk@company.com';
  IF uid_94 IS NULL THEN
    uid_94 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_94,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'md.faruk@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MD FARUK"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_94,
      uid_94::text,
      json_build_object('sub', uid_94::text, 'email', 'md.faruk@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_94, 'MD FARUK', 'md.faruk@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_94,
    '90085',
    '2463312559',
    '11076636',
    'bupa-1684',
    'Manufacturing officer',
    '1996-09-17',
    '2028-09-03',
    '2026-08-22',
    '2028-09-03'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [96/219] MOHAMMAD AMANULLAH (90086)
  SELECT id INTO uid_95 FROM profiles WHERE email = 'mohammad.amanullah@company.com';
  IF uid_95 IS NULL THEN
    uid_95 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_95,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohammad.amanullah@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MOHAMMAD AMANULLAH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_95,
      uid_95::text,
      json_build_object('sub', uid_95::text, 'email', 'mohammad.amanullah@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_95, 'MOHAMMAD AMANULLAH', 'mohammad.amanullah@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_95,
    '90086',
    '2469213728',
    'EL0781151',
    'bupa-1685',
    'Manufacturing officer',
    '1991-01-01',
    '2028-07-18',
    '2026-10-21',
    '2028-07-18'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [97/219] SADOK SADOK RUSTOM ALI (90087)
  SELECT id INTO uid_96 FROM profiles WHERE email = 'sadok.ali@company.com';
  IF uid_96 IS NULL THEN
    uid_96 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_96,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sadok.ali@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SADOK SADOK RUSTOM ALI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_96,
      uid_96::text,
      json_build_object('sub', uid_96::text, 'email', 'sadok.ali@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_96, 'SADOK SADOK RUSTOM ALI', 'sadok.ali@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_96,
    '90087',
    '2472391032',
    'EM0245941',
    'bupa-1686',
    'Blacksmith',
    '1969-06-12',
    '2028-12-04',
    '2026-08-19',
    '2028-12-04'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [98/219] PRATAP KUMAR RAY (90088)
  SELECT id INTO uid_97 FROM profiles WHERE email = 'pratap.ray@company.com';
  IF uid_97 IS NULL THEN
    uid_97 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_97,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'pratap.ray@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"PRATAP KUMAR RAY"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_97,
      uid_97::text,
      json_build_object('sub', uid_97::text, 'email', 'pratap.ray@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_97, 'PRATAP KUMAR RAY', 'pratap.ray@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_97,
    '90088',
    '2473722193',
    'S4246161',
    'bupa-1687',
    'Mechanical Maintenance Tech.',
    '1977-01-16',
    '2028-11-25',
    '2026-09-12',
    '2028-11-25'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [99/219] ROHIT SINGH DHAMI (90089)
  SELECT id INTO uid_98 FROM profiles WHERE email = 'rohit.dhami@company.com';
  IF uid_98 IS NULL THEN
    uid_98 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_98,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'rohit.dhami@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ROHIT SINGH DHAMI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_98,
      uid_98::text,
      json_build_object('sub', uid_98::text, 'email', 'rohit.dhami@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_98, 'ROHIT SINGH DHAMI', 'rohit.dhami@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_98,
    '90089',
    '2473722284',
    'S4641088',
    'bupa-1688',
    'Mechanical Maintenance Tech.',
    '1993-05-06',
    '2028-07-23',
    '2026-06-14',
    '2028-07-23'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [100/219] DHARAM SINGH DHAMI (90090)
  SELECT id INTO uid_99 FROM profiles WHERE email = 'dharam.dhami@company.com';
  IF uid_99 IS NULL THEN
    uid_99 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_99,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'dharam.dhami@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DHARAM SINGH DHAMI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_99,
      uid_99::text,
      json_build_object('sub', uid_99::text, 'email', 'dharam.dhami@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_99, 'DHARAM SINGH DHAMI', 'dharam.dhami@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_99,
    '90090',
    '2473723662',
    'S0222998',
    'bupa-1689',
    'Mechanical Maintenance Tech.',
    '1996-07-13',
    '2028-04-02',
    '2026-03-16',
    '2028-04-02'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [101/219] PAWAN SINGH DHAMI (90091)
  SELECT id INTO uid_100 FROM profiles WHERE email = 'pawan.dhami@company.com';
  IF uid_100 IS NULL THEN
    uid_100 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_100,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'pawan.dhami@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"PAWAN SINGH DHAMI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_100,
      uid_100::text,
      json_build_object('sub', uid_100::text, 'email', 'pawan.dhami@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_100, 'PAWAN SINGH DHAMI', 'pawan.dhami@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_100,
    '90091',
    '2473802599',
    'R7561267',
    'bupa-1690',
    'Mechanical Maintenance Tech.',
    '1995-07-06',
    '2028-01-21',
    '2026-03-16',
    '2028-01-21'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [102/219] ANWAR KOPPALA ABDUL KADER (90092)
  SELECT id INTO uid_101 FROM profiles WHERE email = 'anwar.kader@company.com';
  IF uid_101 IS NULL THEN
    uid_101 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_101,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'anwar.kader@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ANWAR KOPPALA ABDUL KADER"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_101,
      uid_101::text,
      json_build_object('sub', uid_101::text, 'email', 'anwar.kader@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_101, 'ANWAR KOPPALA ABDUL KADER', 'anwar.kader@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_101,
    '90092',
    '2474468960',
    'P4619687',
    'bupa-1691',
    'Mechanical Maintenance Tech.',
    '1987-01-05',
    '2026-10-27',
    '2026-03-29',
    '2026-10-27'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [103/219] SACHIN TEJRAO KAD (90093)
  SELECT id INTO uid_102 FROM profiles WHERE email = 'sachin.kad@company.com';
  IF uid_102 IS NULL THEN
    uid_102 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_102,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sachin.kad@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SACHIN TEJRAO KAD"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_102,
      uid_102::text,
      json_build_object('sub', uid_102::text, 'email', 'sachin.kad@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_102, 'SACHIN TEJRAO KAD', 'sachin.kad@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_102,
    '90093',
    '2474742976',
    'S0466835',
    'bupa-1692',
    'Mechanical Maintenance Tech.',
    '1997-08-29',
    '2028-04-01',
    '2026-04-03',
    '2028-04-01'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [104/219] ARSHAD IQUBAL INSAF ALI (90094)
  SELECT id INTO uid_103 FROM profiles WHERE email = 'arshad.ali@company.com';
  IF uid_103 IS NULL THEN
    uid_103 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_103,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'arshad.ali@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ARSHAD IQUBAL INSAF ALI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_103,
      uid_103::text,
      json_build_object('sub', uid_103::text, 'email', 'arshad.ali@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_103, 'ARSHAD IQUBAL INSAF ALI', 'arshad.ali@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_103,
    '90094',
    '2475735128',
    'Y1411588',
    'bupa-1693',
    'Maintenance Supervisor',
    '1991-03-01',
    '2034-05-07',
    '2026-04-13',
    '2034-05-07'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [105/219] VIKRAM SINGH DHAMI (90095)
  SELECT id INTO uid_104 FROM profiles WHERE email = 'vikram.dhami@company.com';
  IF uid_104 IS NULL THEN
    uid_104 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_104,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'vikram.dhami@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"VIKRAM SINGH DHAMI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_104,
      uid_104::text,
      json_build_object('sub', uid_104::text, 'email', 'vikram.dhami@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_104, 'VIKRAM SINGH DHAMI', 'vikram.dhami@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_104,
    '90095',
    '2476590993',
    'T4166084',
    'bupa-1694',
    'Maintenance Supervisor',
    '1994-07-01',
    '2029-07-29',
    '2026-04-19',
    '2029-07-29'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [106/219] SARAFAT WHIDULLAH (90096)
  SELECT id INTO uid_105 FROM profiles WHERE email = 'sarafat.whidullah@company.com';
  IF uid_105 IS NULL THEN
    uid_105 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_105,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sarafat.whidullah@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SARAFAT WHIDULLAH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_105,
      uid_105::text,
      json_build_object('sub', uid_105::text, 'email', 'sarafat.whidullah@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_105, 'SARAFAT WHIDULLAH', 'sarafat.whidullah@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_105,
    '90096',
    '2476591173',
    'C8690099',
    'bupa-1695',
    'Maintenance Supervisor',
    '1995-08-03',
    '2035-05-09',
    '2026-04-29',
    '2035-05-09'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [107/219] SERAJUDDIN MAJAHAR ALI (90097)
  SELECT id INTO uid_106 FROM profiles WHERE email = 'serajuddin.ali@company.com';
  IF uid_106 IS NULL THEN
    uid_106 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_106,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'serajuddin.ali@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SERAJUDDIN MAJAHAR ALI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_106,
      uid_106::text,
      json_build_object('sub', uid_106::text, 'email', 'serajuddin.ali@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_106, 'SERAJUDDIN MAJAHAR ALI', 'serajuddin.ali@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_106,
    '90097',
    '2476965666',
    'C5024979',
    'bupa-1696',
    'Mechanical Maintenance Tech.',
    '1995-08-28',
    '2035-01-04',
    '2026-04-13',
    '2035-01-04'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [108/219] MOHAMMED ARSHAD ZAINULABDIN (90098)
  SELECT id INTO uid_107 FROM profiles WHERE email = 'mohammed.zainulabdin@company.com';
  IF uid_107 IS NULL THEN
    uid_107 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_107,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohammed.zainulabdin@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MOHAMMED ARSHAD ZAINULABDIN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_107,
      uid_107::text,
      json_build_object('sub', uid_107::text, 'email', 'mohammed.zainulabdin@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_107, 'MOHAMMED ARSHAD ZAINULABDIN', 'mohammed.zainulabdin@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_107,
    '90098',
    '2478927391',
    'R9265587',
    'bupa-1697',
    'Chemical Engineer',
    '1990-01-30',
    '2028-02-06',
    '2026-03-05',
    '2028-02-06'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [109/219] NAGARAJAN ALAGAN PITCHAI ALAGAN (90099)
  SELECT id INTO uid_108 FROM profiles WHERE email = 'nagarajan.alagan@company.com';
  IF uid_108 IS NULL THEN
    uid_108 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_108,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'nagarajan.alagan@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"NAGARAJAN ALAGAN PITCHAI ALAGAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_108,
      uid_108::text,
      json_build_object('sub', uid_108::text, 'email', 'nagarajan.alagan@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_108, 'NAGARAJAN ALAGAN PITCHAI ALAGAN', 'nagarajan.alagan@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_108,
    '90099',
    '2481320964',
    'V1871355',
    'bupa-1698',
    'Maintenance Supervisor',
    '1965-05-03',
    '2031-07-13',
    '2026-04-16',
    '2031-07-13'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [110/219] AKHILESH KUSHWAHA NAGESHWAR KUSHWAHA (90100)
  SELECT id INTO uid_109 FROM profiles WHERE email = 'akhilesh.kushwaha@company.com';
  IF uid_109 IS NULL THEN
    uid_109 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_109,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'akhilesh.kushwaha@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"AKHILESH KUSHWAHA NAGESHWAR KUSHWAHA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_109,
      uid_109::text,
      json_build_object('sub', uid_109::text, 'email', 'akhilesh.kushwaha@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_109, 'AKHILESH KUSHWAHA NAGESHWAR KUSHWAHA', 'akhilesh.kushwaha@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_109,
    '90100',
    '2482667520',
    'P1490019',
    'bupa-1699',
    'Maintenance Supervisor',
    '1994-06-14',
    '2026-08-18',
    '2026-08-22',
    '2026-08-18'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [111/219] MIFTAHUL HASAN SIDDIQUI (90101)
  SELECT id INTO uid_110 FROM profiles WHERE email = 'miftahul.siddiqui@company.com';
  IF uid_110 IS NULL THEN
    uid_110 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_110,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'miftahul.siddiqui@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MIFTAHUL HASAN SIDDIQUI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_110,
      uid_110::text,
      json_build_object('sub', uid_110::text, 'email', 'miftahul.siddiqui@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_110, 'MIFTAHUL HASAN SIDDIQUI', 'miftahul.siddiqui@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_110,
    '90101',
    '2482840093',
    'C7088620',
    'bupa-1700',
    'Mechanical Engineer',
    '1990-07-25',
    '2035-03-19',
    '2026-03-08',
    '2035-03-19'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [112/219] MUHAMMED KUNJU NOUFAL (90102)
  SELECT id INTO uid_111 FROM profiles WHERE email = 'muhammed.noufal@company.com';
  IF uid_111 IS NULL THEN
    uid_111 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_111,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'muhammed.noufal@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MUHAMMED KUNJU NOUFAL"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_111,
      uid_111::text,
      json_build_object('sub', uid_111::text, 'email', 'muhammed.noufal@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_111, 'MUHAMMED KUNJU NOUFAL', 'muhammed.noufal@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_111,
    '90102',
    '2483249146',
    'V3601240',
    'bupa-1701',
    'Power Cable Connector',
    '1992-05-24',
    '2031-11-13',
    '2026-09-02',
    '2031-11-13'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [113/219] SAJID AMIN MUHAMMAD AMIN (90103)
  SELECT id INTO uid_112 FROM profiles WHERE email = 'sajid.amin@company.com';
  IF uid_112 IS NULL THEN
    uid_112 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_112,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sajid.amin@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SAJID AMIN MUHAMMAD AMIN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_112,
      uid_112::text,
      json_build_object('sub', uid_112::text, 'email', 'sajid.amin@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_112, 'SAJID AMIN MUHAMMAD AMIN', 'sajid.amin@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_112,
    '90103',
    '2485822320',
    'AF1204425',
    'bupa-1702',
    'Scaffold Laborer',
    '1981-07-10',
    '2034-09-10',
    '2026-03-15',
    '2034-09-10'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [114/219] MD SOHEL RANA MD MOFIZ UDDIN (90104)
  SELECT id INTO uid_113 FROM profiles WHERE email = 'md.uddin@company.com';
  IF uid_113 IS NULL THEN
    uid_113 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_113,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'md.uddin@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MD SOHEL RANA MD MOFIZ UDDIN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_113,
      uid_113::text,
      json_build_object('sub', uid_113::text, 'email', 'md.uddin@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_113, 'MD SOHEL RANA MD MOFIZ UDDIN', 'md.uddin@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_113,
    '90104',
    '2497009296',
    'EK0422873',
    'bupa-1703',
    'Load and unload worker',
    '1999-03-28',
    '2027-04-04',
    '2026-08-02',
    '2027-04-04'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [115/219] DIDAR ABDUL MOTALEB (90105)
  SELECT id INTO uid_114 FROM profiles WHERE email = 'didar.motaleb@company.com';
  IF uid_114 IS NULL THEN
    uid_114 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_114,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'didar.motaleb@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DIDAR ABDUL MOTALEB"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_114,
      uid_114::text,
      json_build_object('sub', uid_114::text, 'email', 'didar.motaleb@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_114, 'DIDAR ABDUL MOTALEB', 'didar.motaleb@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_114,
    '90105',
    '2497018271',
    'EK0278737',
    'bupa-1704',
    'Workshop worker',
    '1988-07-01',
    '2027-03-05',
    '2026-08-02',
    '2027-03-05'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [116/219] IQBAL HOSSAIN (90106)
  SELECT id INTO uid_115 FROM profiles WHERE email = 'iqbal.hossain@company.com';
  IF uid_115 IS NULL THEN
    uid_115 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_115,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'iqbal.hossain@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"IQBAL HOSSAIN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_115,
      uid_115::text,
      json_build_object('sub', uid_115::text, 'email', 'iqbal.hossain@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_115, 'IQBAL HOSSAIN', 'iqbal.hossain@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_115,
    '90106',
    '2498797204',
    'EM0471016',
    'bupa-1705',
    'Manufacturing officer',
    '1977-07-01',
    '2029-02-26',
    '2026-05-15',
    '2029-02-26'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [117/219] FOYSAL SARKER (90107)
  SELECT id INTO uid_116 FROM profiles WHERE email = 'foysal.sarker@company.com';
  IF uid_116 IS NULL THEN
    uid_116 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_116,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'foysal.sarker@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"FOYSAL SARKER"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_116,
      uid_116::text,
      json_build_object('sub', uid_116::text, 'email', 'foysal.sarker@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_116, 'FOYSAL SARKER', 'foysal.sarker@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_116,
    '90107',
    '2504087392',
    'EM0629121',
    'bupa-1706',
    'Manufacturing officer',
    '1989-03-01',
    '2029-05-12',
    '2026-07-06',
    '2029-05-12'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [118/219] ABDUL OHAB MIA (90108)
  SELECT id INTO uid_117 FROM profiles WHERE email = 'abdul.mia@company.com';
  IF uid_117 IS NULL THEN
    uid_117 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_117,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'abdul.mia@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ABDUL OHAB MIA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_117,
      uid_117::text,
      json_build_object('sub', uid_117::text, 'email', 'abdul.mia@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_117, 'ABDUL OHAB MIA', 'abdul.mia@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_117,
    '90108',
    '2504087673',
    'EH0951886',
    'bupa-1707',
    'Manufacturing officer',
    '1998-04-17',
    '2026-04-28',
    '2026-04-07',
    '2026-04-28'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [119/219] MANNAN SAYED ALI (90109)
  SELECT id INTO uid_118 FROM profiles WHERE email = 'mannan.ali@company.com';
  IF uid_118 IS NULL THEN
    uid_118 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_118,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mannan.ali@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MANNAN SAYED ALI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_118,
      uid_118::text,
      json_build_object('sub', uid_118::text, 'email', 'mannan.ali@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_118, 'MANNAN SAYED ALI', 'mannan.ali@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_118,
    '90109',
    '2504088002',
    'A00493309',
    'bupa-1708',
    'Manufacturing officer',
    '1985-04-21',
    '2031-03-23',
    '2026-04-07',
    '2031-03-23'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [120/219] MD SHIPON MIAH (90110)
  SELECT id INTO uid_119 FROM profiles WHERE email = 'md.miah@company.com';
  IF uid_119 IS NULL THEN
    uid_119 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_119,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'md.miah@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MD SHIPON MIAH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_119,
      uid_119::text,
      json_build_object('sub', uid_119::text, 'email', 'md.miah@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_119, 'MD SHIPON MIAH', 'md.miah@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_119,
    '90110',
    '2504392438',
    'EH0779423',
    'bupa-1709',
    'Manufacturing officer',
    '1999-06-01',
    '2026-03-23',
    '2026-07-10',
    '2026-03-23'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [121/219] AZAD MIAH (90111)
  SELECT id INTO uid_120 FROM profiles WHERE email = 'azad.miah@company.com';
  IF uid_120 IS NULL THEN
    uid_120 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_120,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'azad.miah@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"AZAD MIAH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_120,
      uid_120::text,
      json_build_object('sub', uid_120::text, 'email', 'azad.miah@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_120, 'AZAD MIAH', 'azad.miah@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_120,
    '90111',
    '2504392867',
    'EK0806118',
    'bupa-1710',
    'Manufacturing officer',
    '1989-07-12',
    '2027-08-20',
    '2026-07-10',
    '2027-08-20'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [122/219] ARIFUL ISLAM (90112)
  SELECT id INTO uid_121 FROM profiles WHERE email = 'ariful.islam@company.com';
  IF uid_121 IS NULL THEN
    uid_121 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_121,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'ariful.islam@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ARIFUL ISLAM"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_121,
      uid_121::text,
      json_build_object('sub', uid_121::text, 'email', 'ariful.islam@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_121, 'ARIFUL ISLAM', 'ariful.islam@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_121,
    '90112',
    '2504393071',
    'EN0309483',
    'bupa-1711',
    'Manufacturing officer',
    '1997-01-01',
    '2030-05-11',
    '2026-04-11',
    '2030-05-11'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [123/219] MD AKHIR KHAN (90113)
  SELECT id INTO uid_122 FROM profiles WHERE email = 'md.khan@company.com';
  IF uid_122 IS NULL THEN
    uid_122 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_122,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'md.khan@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MD AKHIR KHAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_122,
      uid_122::text,
      json_build_object('sub', uid_122::text, 'email', 'md.khan@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_122, 'MD AKHIR KHAN', 'md.khan@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_122,
    '90113',
    '2504393212',
    'A00449823',
    'bupa-1712',
    'Manufacturing officer',
    '1985-07-05',
    '2026-02-28',
    '2026-04-11',
    '2026-02-28'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [124/219] ARUN DEV RAM (90114)
  SELECT id INTO uid_123 FROM profiles WHERE email = 'arun.ram@company.com';
  IF uid_123 IS NULL THEN
    uid_123 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_123,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'arun.ram@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ARUN DEV RAM"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_123,
      uid_123::text,
      json_build_object('sub', uid_123::text, 'email', 'arun.ram@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_123, 'ARUN DEV RAM', 'arun.ram@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_123,
    '90114',
    '2504593563',
    'PA4170765',
    'bupa-1713',
    'Manufacturing officer',
    '1991-11-07',
    '2035-05-08',
    '2026-04-12',
    '2035-05-08'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [125/219] BINOD MAHATO (90115)
  SELECT id INTO uid_124 FROM profiles WHERE email = 'binod.mahato@company.com';
  IF uid_124 IS NULL THEN
    uid_124 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_124,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'binod.mahato@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"BINOD MAHATO"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_124,
      uid_124::text,
      json_build_object('sub', uid_124::text, 'email', 'binod.mahato@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_124, 'BINOD MAHATO', 'binod.mahato@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_124,
    '90115',
    '2504593829',
    'PA2231090',
    'bupa-1714',
    'Manufacturing officer',
    '1994-01-01',
    '2033-12-22',
    '2026-04-12',
    '2033-12-22'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [126/219] MAHESH RAM MOCHI (90116)
  SELECT id INTO uid_125 FROM profiles WHERE email = 'mahesh.mochi@company.com';
  IF uid_125 IS NULL THEN
    uid_125 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_125,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mahesh.mochi@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MAHESH RAM MOCHI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_125,
      uid_125::text,
      json_build_object('sub', uid_125::text, 'email', 'mahesh.mochi@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_125, 'MAHESH RAM MOCHI', 'mahesh.mochi@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_125,
    '90116',
    '2504594157',
    'PA0524870',
    'bupa-1715',
    'Manufacturing officer',
    '1990-03-24',
    '2032-07-23',
    '2026-04-12',
    '2032-07-23'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [127/219] RAMESH KUMAR MAHARA (90117)
  SELECT id INTO uid_126 FROM profiles WHERE email = 'ramesh.mahara@company.com';
  IF uid_126 IS NULL THEN
    uid_126 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_126,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'ramesh.mahara@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"RAMESH KUMAR MAHARA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_126,
      uid_126::text,
      json_build_object('sub', uid_126::text, 'email', 'ramesh.mahara@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_126, 'RAMESH KUMAR MAHARA', 'ramesh.mahara@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_126,
    '90117',
    '2505019279',
    'PA3804932',
    'bupa-1716',
    'Manufacturing officer',
    '1997-08-20',
    '2035-02-06',
    '2026-04-12',
    '2035-02-06'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [128/219] MD ALAMGIR SHEIKH (90118)
  SELECT id INTO uid_127 FROM profiles WHERE email = 'md.sheikh@company.com';
  IF uid_127 IS NULL THEN
    uid_127 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_127,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'md.sheikh@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MD ALAMGIR SHEIKH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_127,
      uid_127::text,
      json_build_object('sub', uid_127::text, 'email', 'md.sheikh@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_127, 'MD ALAMGIR SHEIKH', 'md.sheikh@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_127,
    '90118',
    '2505019956',
    'A00511144',
    'bupa-1717',
    'Workshop worker',
    '1985-02-24',
    '2026-03-06',
    '2026-04-11',
    '2026-03-06'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [129/219] MOHAMMAD ANIS SARKER (90119)
  SELECT id INTO uid_128 FROM profiles WHERE email = 'mohammad.sarker@company.com';
  IF uid_128 IS NULL THEN
    uid_128 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_128,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohammad.sarker@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MOHAMMAD ANIS SARKER"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_128,
      uid_128::text,
      json_build_object('sub', uid_128::text, 'email', 'mohammad.sarker@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_128, 'MOHAMMAD ANIS SARKER', 'mohammad.sarker@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_128,
    '90119',
    '2505213468',
    'A20992767',
    'bupa-1718',
    'Workshop worker',
    '1983-04-08',
    '2035-11-26',
    '2026-04-29',
    '2035-11-26'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [130/219] CHANDRA DAS (90120)
  SELECT id INTO uid_129 FROM profiles WHERE email = 'chandra.das@company.com';
  IF uid_129 IS NULL THEN
    uid_129 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_129,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'chandra.das@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"CHANDRA DAS"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_129,
      uid_129::text,
      json_build_object('sub', uid_129::text, 'email', 'chandra.das@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_129, 'CHANDRA DAS', 'chandra.das@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_129,
    '90120',
    '2505776944',
    'EL0600433',
    'bupa-1719',
    'Workshop worker',
    '1993-07-07',
    '2028-05-20',
    '2026-04-23',
    '2028-05-20'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [131/219] ASRAFUL ALOM (90121)
  SELECT id INTO uid_130 FROM profiles WHERE email = 'asraful.alom@company.com';
  IF uid_130 IS NULL THEN
    uid_130 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_130,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'asraful.alom@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ASRAFUL ALOM"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_130,
      uid_130::text,
      json_build_object('sub', uid_130::text, 'email', 'asraful.alom@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_130, 'ASRAFUL ALOM', 'asraful.alom@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_130,
    '90121',
    '2505777181',
    'EM0248856',
    'bupa-1720',
    'Workshop worker',
    '1985-01-01',
    '2028-12-04',
    '2026-10-20',
    '2028-12-04'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [132/219] MOHAMMAD RASHAL (90122)
  SELECT id INTO uid_131 FROM profiles WHERE email = 'mohammad.rashal@company.com';
  IF uid_131 IS NULL THEN
    uid_131 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_131,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohammad.rashal@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MOHAMMAD RASHAL"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_131,
      uid_131::text,
      json_build_object('sub', uid_131::text, 'email', 'mohammad.rashal@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_131, 'MOHAMMAD RASHAL', 'mohammad.rashal@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_131,
    '90122',
    '2505777504',
    'EK0440494',
    'bupa-1721',
    'Workshop worker',
    '1988-01-01',
    '2027-04-10',
    '2026-04-23',
    '2027-04-10'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [133/219] SUJON MAZNU (90123)
  SELECT id INTO uid_132 FROM profiles WHERE email = 'sujon.maznu@company.com';
  IF uid_132 IS NULL THEN
    uid_132 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_132,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sujon.maznu@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SUJON MAZNU"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_132,
      uid_132::text,
      json_build_object('sub', uid_132::text, 'email', 'sujon.maznu@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_132, 'SUJON MAZNU', 'sujon.maznu@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_132,
    '90123',
    '2505778080',
    'EM0629151',
    'bupa-1722',
    'Load and unload worker',
    '1987-07-07',
    '2029-05-12',
    '2026-08-01',
    '2029-05-12'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [134/219] SHAMIM ABDUR ROUF MIAH (90124)
  SELECT id INTO uid_133 FROM profiles WHERE email = 'shamim.miah@company.com';
  IF uid_133 IS NULL THEN
    uid_133 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_133,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'shamim.miah@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SHAMIM ABDUR ROUF MIAH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_133,
      uid_133::text,
      json_build_object('sub', uid_133::text, 'email', 'shamim.miah@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_133, 'SHAMIM ABDUR ROUF MIAH', 'shamim.miah@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_133,
    '90124',
    '2506531843',
    'EH0779183',
    'bupa-1723',
    'Workshop worker',
    '1999-07-01',
    '2026-03-23',
    '2026-04-11',
    '2026-03-23'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [135/219] RASHID IQBAL MURAD SHAH (90125)
  SELECT id INTO uid_134 FROM profiles WHERE email = 'rashid.shah@company.com';
  IF uid_134 IS NULL THEN
    uid_134 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_134,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'rashid.shah@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"RASHID IQBAL MURAD SHAH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_134,
      uid_134::text,
      json_build_object('sub', uid_134::text, 'email', 'rashid.shah@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_134, 'RASHID IQBAL MURAD SHAH', 'rashid.shah@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_134,
    '90125',
    '2507943765',
    'MM1338962',
    'bupa-1724',
    'Manufacturing officer',
    '1990-04-01',
    '2033-03-20',
    '2026-08-14',
    '2033-03-20'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [136/219] MUHAMMAD MUJTABA NAZIR AHMAD (90126)
  SELECT id INTO uid_135 FROM profiles WHERE email = 'muhammad.ahmad2@company.com';
  IF uid_135 IS NULL THEN
    uid_135 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_135,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'muhammad.ahmad2@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MUHAMMAD MUJTABA NAZIR AHMAD"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_135,
      uid_135::text,
      json_build_object('sub', uid_135::text, 'email', 'muhammad.ahmad2@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_135, 'MUHAMMAD MUJTABA NAZIR AHMAD', 'muhammad.ahmad2@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_135,
    '90126',
    '2507943807',
    'BX0573932',
    'bupa-1725',
    'Manufacturing officer',
    '1989-07-31',
    '2033-02-02',
    '2026-08-14',
    '2033-02-02'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [137/219] MUHAMMAD SHAHBAZ MUHAMMAD YOUNAS (90127)
  SELECT id INTO uid_136 FROM profiles WHERE email = 'muhammad.younas@company.com';
  IF uid_136 IS NULL THEN
    uid_136 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_136,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'muhammad.younas@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MUHAMMAD SHAHBAZ MUHAMMAD YOUNAS"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_136,
      uid_136::text,
      json_build_object('sub', uid_136::text, 'email', 'muhammad.younas@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_136, 'MUHAMMAD SHAHBAZ MUHAMMAD YOUNAS', 'muhammad.younas@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_136,
    '90127',
    '2507943864',
    'SV5151562',
    'bupa-1726',
    'Maintenance Supervisor',
    '1999-06-20',
    '2034-05-23',
    '2026-08-14',
    '2034-05-23'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [138/219] HAFIZ MUHAMMAD FARHAN FAQEER MUHAMMAD (90128)
  SELECT id INTO uid_137 FROM profiles WHERE email = 'hafiz.muhammad@company.com';
  IF uid_137 IS NULL THEN
    uid_137 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_137,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'hafiz.muhammad@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"HAFIZ MUHAMMAD FARHAN FAQEER MUHAMMAD"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_137,
      uid_137::text,
      json_build_object('sub', uid_137::text, 'email', 'hafiz.muhammad@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_137, 'HAFIZ MUHAMMAD FARHAN FAQEER MUHAMMAD', 'hafiz.muhammad@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_137,
    '90128',
    '2507943914',
    'CA8948162',
    'bupa-1727',
    'Manufacturing officer',
    '1994-05-17',
    '2033-01-05',
    '2026-05-16',
    '2033-01-05'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [139/219] DEEPAK KUNWAR (90129)
  SELECT id INTO uid_138 FROM profiles WHERE email = 'deepak.kunwar@company.com';
  IF uid_138 IS NULL THEN
    uid_138 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_138,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'deepak.kunwar@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DEEPAK KUNWAR"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_138,
      uid_138::text,
      json_build_object('sub', uid_138::text, 'email', 'deepak.kunwar@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_138, 'DEEPAK KUNWAR', 'deepak.kunwar@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_138,
    '90129',
    '2508175748',
    '10184432',
    'bupa-1728',
    'Truck Driver',
    '1991-08-11',
    '2027-01-05',
    '2026-03-02',
    '2027-01-05'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [140/219] BISHNU BAHADUR GAHA MAGAR (90130)
  SELECT id INTO uid_139 FROM profiles WHERE email = 'bishnu.magar@company.com';
  IF uid_139 IS NULL THEN
    uid_139 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_139,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'bishnu.magar@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"BISHNU BAHADUR GAHA MAGAR"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_139,
      uid_139::text,
      json_build_object('sub', uid_139::text, 'email', 'bishnu.magar@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_139, 'BISHNU BAHADUR GAHA MAGAR', 'bishnu.magar@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_139,
    '90130',
    '2508176076',
    '12170391',
    'bupa-1729',
    'Truck Driver',
    '1990-02-16',
    '2031-03-17',
    '2026-08-29',
    '2031-03-17'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [141/219] SUBASH GURUNG (90131)
  SELECT id INTO uid_140 FROM profiles WHERE email = 'subash.gurung@company.com';
  IF uid_140 IS NULL THEN
    uid_140 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_140,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'subash.gurung@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SUBASH GURUNG"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_140,
      uid_140::text,
      json_build_object('sub', uid_140::text, 'email', 'subash.gurung@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_140, 'SUBASH GURUNG', 'subash.gurung@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_140,
    '90131',
    '2508176258',
    'BA0215788',
    'bupa-1730',
    'Truck Driver',
    '1983-07-21',
    '2033-08-13',
    '2026-08-29',
    '2033-08-13'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [142/219] LIAQUAT ALI RAJPUT AKBAR ALI RAJPUT (90132)
  SELECT id INTO uid_141 FROM profiles WHERE email = 'liaquat.rajput@company.com';
  IF uid_141 IS NULL THEN
    uid_141 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_141,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'liaquat.rajput@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"LIAQUAT ALI RAJPUT AKBAR ALI RAJPUT"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_141,
      uid_141::text,
      json_build_object('sub', uid_141::text, 'email', 'liaquat.rajput@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_141, 'LIAQUAT ALI RAJPUT AKBAR ALI RAJPUT', 'liaquat.rajput@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_141,
    '90132',
    '2509499741',
    'AT9530993',
    'bupa-1731',
    'Workshop worker',
    '1992-01-01',
    '2035-06-02',
    '2026-03-05',
    '2035-06-02'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [143/219] SANG DORJEE TAMANG (90133)
  SELECT id INTO uid_142 FROM profiles WHERE email = 'sang.tamang@company.com';
  IF uid_142 IS NULL THEN
    uid_142 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_142,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sang.tamang@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SANG DORJEE TAMANG"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_142,
      uid_142::text,
      json_build_object('sub', uid_142::text, 'email', 'sang.tamang@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_142, 'SANG DORJEE TAMANG', 'sang.tamang@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_142,
    '90133',
    '2509500167',
    'BA0283089',
    'bupa-1732',
    'Truck Driver',
    '1979-11-21',
    '2033-08-30',
    '2026-09-10',
    '2033-08-30'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [144/219] SALIM HOSSAIN MAZIBUR RAHMAN (90134)
  SELECT id INTO uid_143 FROM profiles WHERE email = 'salim.rahman@company.com';
  IF uid_143 IS NULL THEN
    uid_143 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_143,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'salim.rahman@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SALIM HOSSAIN MAZIBUR RAHMAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_143,
      uid_143::text,
      json_build_object('sub', uid_143::text, 'email', 'salim.rahman@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_143, 'SALIM HOSSAIN MAZIBUR RAHMAN', 'salim.rahman@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_143,
    '90134',
    '2511749299',
    'EM0560736',
    'bupa-1733',
    'Manufacturing officer',
    '1997-02-01',
    '2029-04-03',
    '2026-03-16',
    '2029-04-03'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [145/219] MASUD RANA (90135)
  SELECT id INTO uid_144 FROM profiles WHERE email = 'masud.rana@company.com';
  IF uid_144 IS NULL THEN
    uid_144 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_144,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'masud.rana@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MASUD RANA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_144,
      uid_144::text,
      json_build_object('sub', uid_144::text, 'email', 'masud.rana@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_144, 'MASUD RANA', 'masud.rana@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_144,
    '90135',
    '2512547601',
    'EL0896280',
    'bupa-1734',
    'Workshop worker',
    '1996-06-02',
    '2028-08-21',
    '2026-04-06',
    '2028-08-21'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [146/219] GANGA PRASAD SHRESTHA (90136)
  SELECT id INTO uid_145 FROM profiles WHERE email = 'ganga.shrestha@company.com';
  IF uid_145 IS NULL THEN
    uid_145 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_145,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'ganga.shrestha@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"GANGA PRASAD SHRESTHA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_145,
      uid_145::text,
      json_build_object('sub', uid_145::text, 'email', 'ganga.shrestha@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_145, 'GANGA PRASAD SHRESTHA', 'ganga.shrestha@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_145,
    '90136',
    '2520578580',
    'PA4169967',
    'bupa-1735',
    'Workshop worker',
    '1995-07-26',
    '2035-05-09',
    '2026-10-13',
    '2035-05-09'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [147/219] BISHAL SHRESTHA (90137)
  SELECT id INTO uid_146 FROM profiles WHERE email = 'bishal.shrestha@company.com';
  IF uid_146 IS NULL THEN
    uid_146 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_146,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'bishal.shrestha@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"BISHAL SHRESTHA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_146,
      uid_146::text,
      json_build_object('sub', uid_146::text, 'email', 'bishal.shrestha@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_146, 'BISHAL SHRESTHA', 'bishal.shrestha@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_146,
    '90137',
    '2520578853',
    '11246658',
    'bupa-1736',
    'Workshop worker',
    '2000-11-22',
    '2029-01-05',
    '2026-04-22',
    '2029-01-05'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [148/219] DHAN PRASAD SHARMA (90138)
  SELECT id INTO uid_147 FROM profiles WHERE email = 'dhan.sharma@company.com';
  IF uid_147 IS NULL THEN
    uid_147 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_147,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'dhan.sharma@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DHAN PRASAD SHARMA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_147,
      uid_147::text,
      json_build_object('sub', uid_147::text, 'email', 'dhan.sharma@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_147, 'DHAN PRASAD SHARMA', 'dhan.sharma@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_147,
    '90138',
    '2520578945',
    'PA0769588',
    'bupa-1737',
    'Truck Driver',
    '1993-03-16',
    '2032-09-07',
    '2026-04-16',
    '2032-09-07'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [149/219] THAMAN SING SARKI (90139)
  SELECT id INTO uid_148 FROM profiles WHERE email = 'thaman.sarki@company.com';
  IF uid_148 IS NULL THEN
    uid_148 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_148,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'thaman.sarki@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"THAMAN SING SARKI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_148,
      uid_148::text,
      json_build_object('sub', uid_148::text, 'email', 'thaman.sarki@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_148, 'THAMAN SING SARKI', 'thaman.sarki@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_148,
    '90139',
    '2521095543',
    'BA0208192',
    'bupa-1738',
    'Workshop worker',
    '1986-03-05',
    '2033-08-13',
    '2026-04-22',
    '2033-08-13'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [150/219] DOL PRASAD SHRESTHA (90140)
  SELECT id INTO uid_149 FROM profiles WHERE email = 'dol.shrestha@company.com';
  IF uid_149 IS NULL THEN
    uid_149 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_149,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'dol.shrestha@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DOL PRASAD SHRESTHA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_149,
      uid_149::text,
      json_build_object('sub', uid_149::text, 'email', 'dol.shrestha@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_149, 'DOL PRASAD SHRESTHA', 'dol.shrestha@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_149,
    '90140',
    '2521096202',
    '09276856',
    'bupa-1739',
    'Workshop worker',
    '1991-12-24',
    '2025-11-03',
    '2026-04-16',
    '2025-11-03'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [151/219] SHER PRASAD SHRESTHA (90141)
  SELECT id INTO uid_150 FROM profiles WHERE email = 'sher.shrestha@company.com';
  IF uid_150 IS NULL THEN
    uid_150 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_150,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sher.shrestha@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SHER PRASAD SHRESTHA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_150,
      uid_150::text,
      json_build_object('sub', uid_150::text, 'email', 'sher.shrestha@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_150, 'SHER PRASAD SHRESTHA', 'sher.shrestha@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_150,
    '90141',
    '2521097499',
    '12299389',
    'bupa-1740',
    'Workshop worker',
    '1996-01-24',
    '2031-07-29',
    '2026-07-26',
    '2031-07-29'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [152/219] RAJ KUMAR B K (90142)
  SELECT id INTO uid_151 FROM profiles WHERE email = 'raj.k@company.com';
  IF uid_151 IS NULL THEN
    uid_151 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_151,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'raj.k@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"RAJ KUMAR B K"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_151,
      uid_151::text,
      json_build_object('sub', uid_151::text, 'email', 'raj.k@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_151, 'RAJ KUMAR B K', 'raj.k@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_151,
    '90142',
    '2521097630',
    '09746099',
    'bupa-1741',
    'Workshop worker',
    '1991-11-03',
    '2026-05-01',
    '2026-04-27',
    '2026-05-01'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [153/219] SUDIP SHRESTHA (90143)
  SELECT id INTO uid_152 FROM profiles WHERE email = 'sudip.shrestha@company.com';
  IF uid_152 IS NULL THEN
    uid_152 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_152,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sudip.shrestha@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SUDIP SHRESTHA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_152,
      uid_152::text,
      json_build_object('sub', uid_152::text, 'email', 'sudip.shrestha@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_152, 'SUDIP SHRESTHA', 'sudip.shrestha@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_152,
    '90143',
    '2521097762',
    'PA3968628',
    'bupa-1742',
    'Workshop worker',
    '1992-03-28',
    '2035-02-27',
    '2026-04-27',
    '2035-02-27'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [154/219] DOL RAJ G T (90144)
  SELECT id INTO uid_153 FROM profiles WHERE email = 'dol.t@company.com';
  IF uid_153 IS NULL THEN
    uid_153 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_153,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'dol.t@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DOL RAJ G T"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_153,
      uid_153::text,
      json_build_object('sub', uid_153::text, 'email', 'dol.t@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_153, 'DOL RAJ G T', 'dol.t@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_153,
    '90144',
    '2521097929',
    'PA4162868',
    'bupa-1743',
    'Truck Driver',
    '1995-12-02',
    '2035-05-08',
    '2026-04-21',
    '2035-05-08'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [155/219] DINESH SHRESTHA (90145)
  SELECT id INTO uid_154 FROM profiles WHERE email = 'dinesh.shrestha@company.com';
  IF uid_154 IS NULL THEN
    uid_154 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_154,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'dinesh.shrestha@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DINESH SHRESTHA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_154,
      uid_154::text,
      json_build_object('sub', uid_154::text, 'email', 'dinesh.shrestha@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_154, 'DINESH SHRESTHA', 'dinesh.shrestha@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_154,
    '90145',
    '2521436762',
    'BA0283093',
    'bupa-1744',
    'Maintenance Supervisor',
    '1984-12-31',
    '2033-08-30',
    '2026-04-28',
    '2033-08-30'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [156/219] SUJIN SARKI (90146)
  SELECT id INTO uid_155 FROM profiles WHERE email = 'sujin.sarki@company.com';
  IF uid_155 IS NULL THEN
    uid_155 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_155,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sujin.sarki@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SUJIN SARKI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_155,
      uid_155::text,
      json_build_object('sub', uid_155::text, 'email', 'sujin.sarki@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_155, 'SUJIN SARKI', 'sujin.sarki@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_155,
    '90146',
    '2521436994',
    '12618322',
    'bupa-1745',
    'Load and unload worker',
    '1990-12-18',
    '2032-01-11',
    '2026-08-02',
    '2032-01-11'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [157/219] TUK BAHADUR SINGJALI (90147)
  SELECT id INTO uid_156 FROM profiles WHERE email = 'tuk.singjali@company.com';
  IF uid_156 IS NULL THEN
    uid_156 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_156,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'tuk.singjali@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"TUK BAHADUR SINGJALI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_156,
      uid_156::text,
      json_build_object('sub', uid_156::text, 'email', 'tuk.singjali@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_156, 'TUK BAHADUR SINGJALI', 'tuk.singjali@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_156,
    '90147',
    '2522459177',
    '12130250',
    'bupa-1746',
    'Truck Driver',
    '1987-11-25',
    '2031-02-27',
    '2026-08-09',
    '2031-02-27'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [158/219] SIEHMON FRANCIS ANTIDO MENDOZA (90148)
  SELECT id INTO uid_157 FROM profiles WHERE email = 'siehmon.mendoza@company.com';
  IF uid_157 IS NULL THEN
    uid_157 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_157,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'siehmon.mendoza@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SIEHMON FRANCIS ANTIDO MENDOZA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_157,
      uid_157::text,
      json_build_object('sub', uid_157::text, 'email', 'siehmon.mendoza@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_157, 'SIEHMON FRANCIS ANTIDO MENDOZA', 'siehmon.mendoza@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_157,
    '90148',
    '2524352701',
    'P9884610A',
    'bupa-1747',
    'Load and unload worker',
    '1979-09-11',
    '2028-12-10',
    '2026-05-16',
    '2028-12-10'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [159/219] ISHFAQ AHMAD MUSHTAQ AHMAD (90149)
  SELECT id INTO uid_158 FROM profiles WHERE email = 'ishfaq.ahmad@company.com';
  IF uid_158 IS NULL THEN
    uid_158 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_158,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'ishfaq.ahmad@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ISHFAQ AHMAD MUSHTAQ AHMAD"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_158,
      uid_158::text,
      json_build_object('sub', uid_158::text, 'email', 'ishfaq.ahmad@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_158, 'ISHFAQ AHMAD MUSHTAQ AHMAD', 'ishfaq.ahmad@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_158,
    '90149',
    '2534291600',
    'BT1174382',
    'bupa-1748',
    'Occ Health & Safety Supervisor',
    '1997-05-03',
    '2028-11-13',
    '2026-08-08',
    '2028-11-13'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [160/219] FAISAL MEHBOOB MEHBOOB ALI (90150)
  SELECT id INTO uid_159 FROM profiles WHERE email = 'faisal.ali@company.com';
  IF uid_159 IS NULL THEN
    uid_159 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_159,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'faisal.ali@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"FAISAL MEHBOOB MEHBOOB ALI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_159,
      uid_159::text,
      json_build_object('sub', uid_159::text, 'email', 'faisal.ali@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_159, 'FAISAL MEHBOOB MEHBOOB ALI', 'faisal.ali@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_159,
    '90150',
    '2545024792',
    'BK0130012',
    'bupa-1749',
    'Load and unload worker',
    '1998-02-05',
    '2035-11-30',
    '2026-04-23',
    '2035-11-30'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [161/219] SURYA BAHADUR TAMANG (90151)
  SELECT id INTO uid_160 FROM profiles WHERE email = 'surya.tamang@company.com';
  IF uid_160 IS NULL THEN
    uid_160 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_160,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'surya.tamang@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SURYA BAHADUR TAMANG"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_160,
      uid_160::text,
      json_build_object('sub', uid_160::text, 'email', 'surya.tamang@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_160, 'SURYA BAHADUR TAMANG', 'surya.tamang@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_160,
    '90151',
    '2545759397',
    'PA3336645',
    'bupa-1750',
    'Truck Driver',
    '1988-10-31',
    '2034-09-12',
    '2026-07-17',
    '2034-09-12'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [162/219] DIPAK KUMAR SHRESTHA (90152)
  SELECT id INTO uid_161 FROM profiles WHERE email = 'dipak.shrestha@company.com';
  IF uid_161 IS NULL THEN
    uid_161 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_161,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'dipak.shrestha@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DIPAK KUMAR SHRESTHA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_161,
      uid_161::text,
      json_build_object('sub', uid_161::text, 'email', 'dipak.shrestha@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_161, 'DIPAK KUMAR SHRESTHA', 'dipak.shrestha@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_161,
    '90152',
    '2545760205',
    'PA4008704',
    'bupa-1751',
    'Truck Driver',
    '1987-04-15',
    '2035-03-21',
    '2026-10-15',
    '2035-03-21'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [163/219] ISWOR POKHREL (90153)
  SELECT id INTO uid_162 FROM profiles WHERE email = 'iswor.pokhrel@company.com';
  IF uid_162 IS NULL THEN
    uid_162 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_162,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'iswor.pokhrel@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ISWOR POKHREL"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_162,
      uid_162::text,
      json_build_object('sub', uid_162::text, 'email', 'iswor.pokhrel@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_162, 'ISWOR POKHREL', 'iswor.pokhrel@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_162,
    '90153',
    '2545760973',
    'PA4008700',
    'bupa-1752',
    'Truck Driver',
    '1990-01-30',
    '2035-03-20',
    '2026-04-18',
    '2035-03-20'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [164/219] AMRIT BAHADUR KUMAL (90154)
  SELECT id INTO uid_163 FROM profiles WHERE email = 'amrit.kumal@company.com';
  IF uid_163 IS NULL THEN
    uid_163 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_163,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'amrit.kumal@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"AMRIT BAHADUR KUMAL"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_163,
      uid_163::text,
      json_build_object('sub', uid_163::text, 'email', 'amrit.kumal@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_163, 'AMRIT BAHADUR KUMAL', 'amrit.kumal@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_163,
    '90154',
    '2545761203',
    'PA4008710',
    'bupa-1753',
    'Forklift driver',
    '1982-03-12',
    '2035-03-21',
    '2026-04-18',
    '2035-03-21'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [165/219] HAFIZ KHAN LAYEEQUE KHAN (90155)
  SELECT id INTO uid_164 FROM profiles WHERE email = 'hafiz.khan@company.com';
  IF uid_164 IS NULL THEN
    uid_164 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_164,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'hafiz.khan@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"HAFIZ KHAN LAYEEQUE KHAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_164,
      uid_164::text,
      json_build_object('sub', uid_164::text, 'email', 'hafiz.khan@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_164, 'HAFIZ KHAN LAYEEQUE KHAN', 'hafiz.khan@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_164,
    '90155',
    '2546043205',
    'C7039060',
    'bupa-1754',
    'Truck Driver',
    '1978-05-01',
    '2035-02-26',
    '2026-04-20',
    '2035-02-26'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [166/219] PRINCE ALOYSIUS RAJ (90156)
  SELECT id INTO uid_165 FROM profiles WHERE email = 'prince.raj@company.com';
  IF uid_165 IS NULL THEN
    uid_165 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_165,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'prince.raj@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"PRINCE ALOYSIUS RAJ"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_165,
      uid_165::text,
      json_build_object('sub', uid_165::text, 'email', 'prince.raj@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_165, 'PRINCE ALOYSIUS RAJ', 'prince.raj@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_165,
    '90156',
    '2553510823',
    'W9643187',
    'bupa-1755',
    'Constructing worker',
    '1994-07-07',
    '2033-03-30',
    '2026-08-12',
    '2033-03-30'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [167/219] DAYARAM CHAUDHARY (90157)
  SELECT id INTO uid_166 FROM profiles WHERE email = 'dayaram.chaudhary@company.com';
  IF uid_166 IS NULL THEN
    uid_166 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_166,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'dayaram.chaudhary@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DAYARAM CHAUDHARY"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_166,
      uid_166::text,
      json_build_object('sub', uid_166::text, 'email', 'dayaram.chaudhary@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_166, 'DAYARAM CHAUDHARY', 'dayaram.chaudhary@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_166,
    '90157',
    '2553657673',
    'PA1087704',
    'bupa-1756',
    'Truck Driver',
    '1986-02-19',
    '2032-12-21',
    '2026-04-30',
    '2032-12-21'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [168/219] MUHAMMAD HARIS NAZIR MUHAMMAD (90158)
  SELECT id INTO uid_167 FROM profiles WHERE email = 'muhammad.muhammad2@company.com';
  IF uid_167 IS NULL THEN
    uid_167 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_167,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'muhammad.muhammad2@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MUHAMMAD HARIS NAZIR MUHAMMAD"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_167,
      uid_167::text,
      json_build_object('sub', uid_167::text, 'email', 'muhammad.muhammad2@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_167, 'MUHAMMAD HARIS NAZIR MUHAMMAD', 'muhammad.muhammad2@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_167,
    '90158',
    '2554012704',
    'GU6913622',
    'bupa-1757',
    'Construction worker',
    '1997-03-10',
    '2034-05-22',
    '2026-08-04',
    '2034-05-22'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [169/219] NIRMAL KUMAR NEUPANE (90159)
  SELECT id INTO uid_168 FROM profiles WHERE email = 'nirmal.neupane@company.com';
  IF uid_168 IS NULL THEN
    uid_168 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_168,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'nirmal.neupane@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"NIRMAL KUMAR NEUPANE"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_168,
      uid_168::text,
      json_build_object('sub', uid_168::text, 'email', 'nirmal.neupane@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_168, 'NIRMAL KUMAR NEUPANE', 'nirmal.neupane@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_168,
    '90159',
    '2555423066',
    'PA3159841',
    'bupa-1758',
    'Truck Driver',
    '1983-07-12',
    '2034-07-29',
    '2026-09-01',
    '2034-07-29'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [170/219] BIKAS THING (90160)
  SELECT id INTO uid_169 FROM profiles WHERE email = 'bikas.thing@company.com';
  IF uid_169 IS NULL THEN
    uid_169 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_169,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'bikas.thing@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"BIKAS THING"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_169,
      uid_169::text,
      json_build_object('sub', uid_169::text, 'email', 'bikas.thing@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_169, 'BIKAS THING', 'bikas.thing@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_169,
    '90160',
    '2555423181',
    'BA0164303',
    'bupa-1759',
    'Truck Driver',
    '1996-04-24',
    '2033-08-08',
    '2026-03-05',
    '2033-08-08'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [171/219] LOK BAHADUR KSHETRI (90161)
  SELECT id INTO uid_170 FROM profiles WHERE email = 'lok.kshetri@company.com';
  IF uid_170 IS NULL THEN
    uid_170 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_170,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'lok.kshetri@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"LOK BAHADUR KSHETRI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_170,
      uid_170::text,
      json_build_object('sub', uid_170::text, 'email', 'lok.kshetri@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_170, 'LOK BAHADUR KSHETRI', 'lok.kshetri@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_170,
    '90161',
    '2555423306',
    '09853182',
    'bupa-1760',
    'Truck Driver',
    '1994-02-24',
    '2026-06-22',
    '2026-03-05',
    '2026-06-22'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [172/219] SHAH ZEB MUHAMMAD AYAZ (90162)
  SELECT id INTO uid_171 FROM profiles WHERE email = 'shah.ayaz@company.com';
  IF uid_171 IS NULL THEN
    uid_171 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_171,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'shah.ayaz@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SHAH ZEB MUHAMMAD AYAZ"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_171,
      uid_171::text,
      json_build_object('sub', uid_171::text, 'email', 'shah.ayaz@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_171, 'SHAH ZEB MUHAMMAD AYAZ', 'shah.ayaz@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_171,
    '90162',
    '2557621170',
    'EB5091782',
    'bupa-1761',
    'Occ Health & Safety Supervisor',
    '1997-03-11',
    '2028-01-16',
    '2026-03-24',
    '2028-01-16'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [173/219] ANIL KUMAR JAI RAM (90163)
  SELECT id INTO uid_172 FROM profiles WHERE email = 'anil.ram@company.com';
  IF uid_172 IS NULL THEN
    uid_172 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_172,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'anil.ram@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ANIL KUMAR JAI RAM"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_172,
      uid_172::text,
      json_build_object('sub', uid_172::text, 'email', 'anil.ram@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_172, 'ANIL KUMAR JAI RAM', 'anil.ram@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_172,
    '90163',
    '2560837516',
    'T1193288',
    'bupa-1762',
    'Truck Driver',
    '1988-01-18',
    '2029-06-06',
    '2026-08-02',
    '2029-06-06'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [174/219] JASVINDAR SINGH JASRAM SINGH (90164)
  SELECT id INTO uid_173 FROM profiles WHERE email = 'jasvindar.singh@company.com';
  IF uid_173 IS NULL THEN
    uid_173 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_173,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'jasvindar.singh@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"JASVINDAR SINGH JASRAM SINGH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_173,
      uid_173::text,
      json_build_object('sub', uid_173::text, 'email', 'jasvindar.singh@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_173, 'JASVINDAR SINGH JASRAM SINGH', 'jasvindar.singh@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_173,
    '90164',
    '2560837599',
    'V5669074',
    'bupa-1763',
    'Manufacturing officer',
    '1986-06-10',
    '2032-02-20',
    '2026-08-02',
    '2032-02-20'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [175/219] SHAILESH BHARAT SUVARNA (90165)
  SELECT id INTO uid_174 FROM profiles WHERE email = 'shailesh.suvarna@company.com';
  IF uid_174 IS NULL THEN
    uid_174 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_174,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'shailesh.suvarna@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SHAILESH BHARAT SUVARNA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_174,
      uid_174::text,
      json_build_object('sub', uid_174::text, 'email', 'shailesh.suvarna@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_174, 'SHAILESH BHARAT SUVARNA', 'shailesh.suvarna@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_174,
    '90165',
    '2560837706',
    'W9180147',
    'bupa-1764',
    'Manufacturing officer',
    '1982-01-26',
    '2032-12-27',
    '2026-08-03',
    '2032-12-27'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [176/219] HARKESH SINGH MUSADDI SINGH (90166)
  SELECT id INTO uid_175 FROM profiles WHERE email = 'harkesh.singh@company.com';
  IF uid_175 IS NULL THEN
    uid_175 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_175,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'harkesh.singh@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"HARKESH SINGH MUSADDI SINGH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_175,
      uid_175::text,
      json_build_object('sub', uid_175::text, 'email', 'harkesh.singh@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_175, 'HARKESH SINGH MUSADDI SINGH', 'harkesh.singh@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_175,
    '90166',
    '2560837896',
    'V7507126',
    'bupa-1765',
    'Manufacturing officer',
    '1991-04-09',
    '2032-04-26',
    '2026-05-04',
    '2032-04-26'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [177/219] SHWETANK KUMAR SINGH (90167)
  SELECT id INTO uid_176 FROM profiles WHERE email = 'shwetank.singh@company.com';
  IF uid_176 IS NULL THEN
    uid_176 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_176,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'shwetank.singh@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SHWETANK KUMAR SINGH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_176,
      uid_176::text,
      json_build_object('sub', uid_176::text, 'email', 'shwetank.singh@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_176, 'SHWETANK KUMAR SINGH', 'shwetank.singh@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_176,
    '90167',
    '2560838696',
    'C8698894',
    'bupa-1766',
    'Manufacturing officer',
    '1976-01-24',
    '2035-05-21',
    '2026-08-12',
    '2035-05-21'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [178/219] STALIN RAJAPPA RAJAPPA (90168)
  SELECT id INTO uid_177 FROM profiles WHERE email = 'stalin.rajappa@company.com';
  IF uid_177 IS NULL THEN
    uid_177 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_177,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'stalin.rajappa@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"STALIN RAJAPPA RAJAPPA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_177,
      uid_177::text,
      json_build_object('sub', uid_177::text, 'email', 'stalin.rajappa@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_177, 'STALIN RAJAPPA RAJAPPA', 'stalin.rajappa@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_177,
    '90168',
    '2560962496',
    'S0568468',
    'bupa-1767',
    'Manufacturing officer',
    '1987-05-29',
    '2028-06-18',
    '2026-08-02',
    '2028-06-18'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [179/219] RAM KUMAR BABU RAM (90169)
  SELECT id INTO uid_178 FROM profiles WHERE email = 'ram.ram@company.com';
  IF uid_178 IS NULL THEN
    uid_178 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_178,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'ram.ram@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"RAM KUMAR BABU RAM"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_178,
      uid_178::text,
      json_build_object('sub', uid_178::text, 'email', 'ram.ram@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_178, 'RAM KUMAR BABU RAM', 'ram.ram@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_178,
    '90169',
    '2562639134',
    'V3362911',
    'bupa-1768',
    'Manufacturing officer',
    '1999-01-01',
    '2031-10-06',
    '2026-08-08',
    '2031-10-06'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [180/219] SACHIN KUMAR JAYPAL SINGH (90170)
  SELECT id INTO uid_179 FROM profiles WHERE email = 'sachin.singh@company.com';
  IF uid_179 IS NULL THEN
    uid_179 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_179,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sachin.singh@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SACHIN KUMAR JAYPAL SINGH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_179,
      uid_179::text,
      json_build_object('sub', uid_179::text, 'email', 'sachin.singh@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_179, 'SACHIN KUMAR JAYPAL SINGH', 'sachin.singh@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_179,
    '90170',
    '2562639258',
    'V3373523',
    'bupa-1769',
    'Manufacturing officer',
    '1998-01-01',
    '2031-11-23',
    '2026-08-08',
    '2031-11-23'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [181/219] MD RASEL KHAN (90171)
  SELECT id INTO uid_180 FROM profiles WHERE email = 'md.khan2@company.com';
  IF uid_180 IS NULL THEN
    uid_180 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_180,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'md.khan2@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MD RASEL KHAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_180,
      uid_180::text,
      json_build_object('sub', uid_180::text, 'email', 'md.khan2@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_180, 'MD RASEL KHAN', 'md.khan2@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_180,
    '90171',
    '2562903886',
    'B00192667',
    'bupa-1770',
    'Load and unload worker',
    '1991-12-05',
    '2032-08-14',
    '2026-08-21',
    '2032-08-14'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [182/219] SUBASH CHANDRA GANGA (90172)
  SELECT id INTO uid_181 FROM profiles WHERE email = 'subash.ganga@company.com';
  IF uid_181 IS NULL THEN
    uid_181 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_181,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'subash.ganga@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SUBASH CHANDRA GANGA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_181,
      uid_181::text,
      json_build_object('sub', uid_181::text, 'email', 'subash.ganga@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_181, 'SUBASH CHANDRA GANGA', 'subash.ganga@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_181,
    '90172',
    '2564088389',
    'Y8763928',
    'bupa-1771',
    'Truck Driver',
    '1977-03-11',
    '2033-11-16',
    '2026-03-01',
    '2033-11-16'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [183/219] MUJAHID KHAN AKBAR KHAN (90173)
  SELECT id INTO uid_182 FROM profiles WHERE email = 'mujahid.khan@company.com';
  IF uid_182 IS NULL THEN
    uid_182 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_182,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mujahid.khan@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MUJAHID KHAN AKBAR KHAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_182,
      uid_182::text,
      json_build_object('sub', uid_182::text, 'email', 'mujahid.khan@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_182, 'MUJAHID KHAN AKBAR KHAN', 'mujahid.khan@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_182,
    '90173',
    '2564997381',
    'W3549562',
    'bupa-1772',
    'Manufacturing officer',
    '1989-12-19',
    '2032-08-16',
    '2026-08-22',
    '2032-08-16'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [184/219] ARNOLD SHARWIN AIMAN (90174)
  SELECT id INTO uid_183 FROM profiles WHERE email = 'arnold.aiman@company.com';
  IF uid_183 IS NULL THEN
    uid_183 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_183,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'arnold.aiman@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ARNOLD SHARWIN AIMAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_183,
      uid_183::text,
      json_build_object('sub', uid_183::text, 'email', 'arnold.aiman@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_183, 'ARNOLD SHARWIN AIMAN', 'arnold.aiman@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_183,
    '90174',
    '2565547755',
    'V9316096',
    'bupa-1773',
    'Occ Health & Safety Supervisor',
    '1993-06-02',
    '2032-07-09',
    '2026-04-06',
    '2032-07-09'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [185/219] SACHIN SANJEEVA POOJARY (90175)
  SELECT id INTO uid_184 FROM profiles WHERE email = 'sachin.poojary@company.com';
  IF uid_184 IS NULL THEN
    uid_184 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_184,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sachin.poojary@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SACHIN SANJEEVA POOJARY"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_184,
      uid_184::text,
      json_build_object('sub', uid_184::text, 'email', 'sachin.poojary@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_184, 'SACHIN SANJEEVA POOJARY', 'sachin.poojary@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_184,
    '90175',
    '2565548134',
    'S9356994',
    'bupa-1774',
    'Occ Health & Safety Supervisor',
    '1993-05-15',
    '2028-11-13',
    '2026-04-10',
    '2028-11-13'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [186/219] MD YAMIN (90176)
  SELECT id INTO uid_185 FROM profiles WHERE email = 'md.yamin@company.com';
  IF uid_185 IS NULL THEN
    uid_185 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_185,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'md.yamin@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MD YAMIN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_185,
      uid_185::text,
      json_build_object('sub', uid_185::text, 'email', 'md.yamin@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_185, 'MD YAMIN', 'md.yamin@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_185,
    '90176',
    '2565549009',
    'A03025069',
    'bupa-1775',
    'Manufacturing officer',
    '2000-05-01',
    '2032-04-02',
    '2026-04-10',
    '2032-04-02'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [187/219] MD JULHAS MIAH (90177)
  SELECT id INTO uid_186 FROM profiles WHERE email = 'md.miah2@company.com';
  IF uid_186 IS NULL THEN
    uid_186 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_186,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'md.miah2@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MD JULHAS MIAH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_186,
      uid_186::text,
      json_build_object('sub', uid_186::text, 'email', 'md.miah2@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_186, 'MD JULHAS MIAH', 'md.miah2@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_186,
    '90177',
    '2565549330',
    'EL0030054',
    'bupa-1776',
    'Manufacturing officer',
    '1987-09-18',
    '2027-10-24',
    '2026-04-10',
    '2027-10-24'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [188/219] RAJINDER SINGH (90178)
  SELECT id INTO uid_187 FROM profiles WHERE email = 'rajinder.singh@company.com';
  IF uid_187 IS NULL THEN
    uid_187 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_187,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'rajinder.singh@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"RAJINDER SINGH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_187,
      uid_187::text,
      json_build_object('sub', uid_187::text, 'email', 'rajinder.singh@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_187, 'RAJINDER SINGH', 'rajinder.singh@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_187,
    '90178',
    '2565645948',
    'Z5179053',
    'bupa-1777',
    'Trailer Truck Driver',
    '1983-02-18',
    '2028-11-05',
    '2026-04-06',
    '2028-11-05'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [189/219] ASHITH SUNDARA POOJARY (90179)
  SELECT id INTO uid_188 FROM profiles WHERE email = 'ashith.poojary@company.com';
  IF uid_188 IS NULL THEN
    uid_188 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_188,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'ashith.poojary@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ASHITH SUNDARA POOJARY"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_188,
      uid_188::text,
      json_build_object('sub', uid_188::text, 'email', 'ashith.poojary@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_188, 'ASHITH SUNDARA POOJARY', 'ashith.poojary@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_188,
    '90179',
    '2566007502',
    'S1639685',
    'bupa-1778',
    'Maintenance Supervisor',
    '1993-06-17',
    '2028-04-18',
    '2026-03-04',
    '2028-04-18'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [190/219] MD SHOUROB ALI (90180)
  SELECT id INTO uid_189 FROM profiles WHERE email = 'md.ali@company.com';
  IF uid_189 IS NULL THEN
    uid_189 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_189,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'md.ali@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MD SHOUROB ALI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_189,
      uid_189::text,
      json_build_object('sub', uid_189::text, 'email', 'md.ali@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_189, 'MD SHOUROB ALI', 'md.ali@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_189,
    '90180',
    '2567371881',
    'EN0219779',
    'bupa-1779',
    'Carpenter',
    '1998-01-03',
    '2030-02-19',
    '2026-04-18',
    '2030-02-19'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [191/219] SARAVANAKUMAR SUBRAMANIAN SUBRAMANIAN (90181)
  SELECT id INTO uid_190 FROM profiles WHERE email = 'saravanakumar.subramanian@company.com';
  IF uid_190 IS NULL THEN
    uid_190 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_190,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'saravanakumar.subramanian@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SARAVANAKUMAR SUBRAMANIAN SUBRAMANIAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_190,
      uid_190::text,
      json_build_object('sub', uid_190::text, 'email', 'saravanakumar.subramanian@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_190, 'SARAVANAKUMAR SUBRAMANIAN SUBRAMANIAN', 'saravanakumar.subramanian@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_190,
    '90181',
    '2568561142',
    'U0370955',
    'bupa-1780',
    'Chemical Engineer',
    '1981-07-28',
    '2031-02-13',
    '2026-04-22',
    '2031-02-13'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [192/219] SULAKSHAN JEGATHEESWARAN (90182)
  SELECT id INTO uid_191 FROM profiles WHERE email = 'sulakshan.jegatheeswaran@company.com';
  IF uid_191 IS NULL THEN
    uid_191 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_191,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sulakshan.jegatheeswaran@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SULAKSHAN JEGATHEESWARAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_191,
      uid_191::text,
      json_build_object('sub', uid_191::text, 'email', 'sulakshan.jegatheeswaran@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_191, 'SULAKSHAN JEGATHEESWARAN', 'sulakshan.jegatheeswaran@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_191,
    '90182',
    '2570176368',
    'N6812565',
    'bupa-1781',
    'Manufacturing officer',
    '1997-06-30',
    '2026-09-15',
    '2026-08-03',
    '2026-09-15'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [193/219] NEERAJ MAHENDRA PAL (90183)
  SELECT id INTO uid_192 FROM profiles WHERE email = 'neeraj.pal@company.com';
  IF uid_192 IS NULL THEN
    uid_192 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_192,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'neeraj.pal@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"NEERAJ MAHENDRA PAL"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_192,
      uid_192::text,
      json_build_object('sub', uid_192::text, 'email', 'neeraj.pal@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_192, 'NEERAJ MAHENDRA PAL', 'neeraj.pal@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_192,
    '90183',
    '2570176830',
    'U7101467',
    'bupa-1782',
    'Maintenance Supervisor',
    '1997-01-23',
    '2030-12-07',
    '2026-03-04',
    '2030-12-07'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [194/219] THEJAS KUSHALAPPA GOWDA (90184)
  SELECT id INTO uid_193 FROM profiles WHERE email = 'thejas.gowda@company.com';
  IF uid_193 IS NULL THEN
    uid_193 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_193,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'thejas.gowda@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"THEJAS KUSHALAPPA GOWDA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_193,
      uid_193::text,
      json_build_object('sub', uid_193::text, 'email', 'thejas.gowda@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_193, 'THEJAS KUSHALAPPA GOWDA', 'thejas.gowda@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_193,
    '90184',
    '2579130713',
    'V8678747',
    'bupa-1783',
    'Maintenance Supervisor',
    '2000-10-23',
    '2032-03-31',
    '2026-04-03',
    '2032-03-31'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [195/219] THASLEEM MUKRI HASAINAR RAHIMAN (90185)
  SELECT id INTO uid_194 FROM profiles WHERE email = 'thasleem.rahiman@company.com';
  IF uid_194 IS NULL THEN
    uid_194 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_194,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'thasleem.rahiman@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"THASLEEM MUKRI HASAINAR RAHIMAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_194,
      uid_194::text,
      json_build_object('sub', uid_194::text, 'email', 'thasleem.rahiman@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_194, 'THASLEEM MUKRI HASAINAR RAHIMAN', 'thasleem.rahiman@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_194,
    '90185',
    '2579283215',
    'Y1191678',
    'bupa-1784',
    'Maintenance Supervisor',
    '1991-09-30',
    '2034-03-25',
    '2026-07-05',
    '2034-03-25'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [196/219] MOHAMMED HAFEEZ SALEEM HYDER (90186)
  SELECT id INTO uid_195 FROM profiles WHERE email = 'mohammed.hyder@company.com';
  IF uid_195 IS NULL THEN
    uid_195 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_195,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohammed.hyder@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MOHAMMED HAFEEZ SALEEM HYDER"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_195,
      uid_195::text,
      json_build_object('sub', uid_195::text, 'email', 'mohammed.hyder@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_195, 'MOHAMMED HAFEEZ SALEEM HYDER', 'mohammed.hyder@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_195,
    '90186',
    '2579412434',
    'U5770248',
    'bupa-1785',
    'Manufacturing officer',
    '1999-07-22',
    '2030-02-03',
    '2026-04-06',
    '2030-02-03'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [197/219] MONIR HOSSAIN (90187)
  SELECT id INTO uid_196 FROM profiles WHERE email = 'monir.hossain@company.com';
  IF uid_196 IS NULL THEN
    uid_196 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_196,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'monir.hossain@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MONIR HOSSAIN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_196,
      uid_196::text,
      json_build_object('sub', uid_196::text, 'email', 'monir.hossain@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_196, 'MONIR HOSSAIN', 'monir.hossain@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_196,
    '90187',
    '2579610771',
    'A07425868',
    'bupa-1786',
    'Packing the shelves worker',
    '1992-01-01',
    '2033-04-02',
    '2026-08-22',
    '2033-04-02'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [198/219] MOHAMMAD IKBAL ABBETTU HAMMAD (90188)
  SELECT id INTO uid_197 FROM profiles WHERE email = 'mohammad.hammad@company.com';
  IF uid_197 IS NULL THEN
    uid_197 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_197,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohammad.hammad@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MOHAMMAD IKBAL ABBETTU HAMMAD"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_197,
      uid_197::text,
      json_build_object('sub', uid_197::text, 'email', 'mohammad.hammad@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_197, 'MOHAMMAD IKBAL ABBETTU HAMMAD', 'mohammad.hammad@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_197,
    '90188',
    '2580750079',
    'V6093181',
    'bupa-1787',
    'Manufacturing Supervisor',
    '1991-08-12',
    '2031-04-17',
    '2026-04-22',
    '2031-04-17'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [199/219] ABDUL AZEEZ ABDUL SATTAR (90189)
  SELECT id INTO uid_198 FROM profiles WHERE email = 'abdul.sattar@company.com';
  IF uid_198 IS NULL THEN
    uid_198 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_198,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'abdul.sattar@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ABDUL AZEEZ ABDUL SATTAR"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_198,
      uid_198::text,
      json_build_object('sub', uid_198::text, 'email', 'abdul.sattar@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_198, 'ABDUL AZEEZ ABDUL SATTAR', 'abdul.sattar@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_198,
    '90189',
    '2580750400',
    'U3842178',
    'bupa-1788',
    'Manufacturing officer',
    '1989-12-30',
    '2030-09-09',
    '2026-04-22',
    '2030-09-09'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [200/219] LOKENDRA SINGH HAR SINGH (90190)
  SELECT id INTO uid_199 FROM profiles WHERE email = 'lokendra.singh@company.com';
  IF uid_199 IS NULL THEN
    uid_199 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_199,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'lokendra.singh@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"LOKENDRA SINGH HAR SINGH"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_199,
      uid_199::text,
      json_build_object('sub', uid_199::text, 'email', 'lokendra.singh@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_199, 'LOKENDRA SINGH HAR SINGH', 'lokendra.singh@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_199,
    '90190',
    '2581267214',
    'P6308257',
    'bupa-1789',
    'Manufacturing officer',
    '1987-06-01',
    '2027-01-03',
    '2026-04-28',
    '2027-01-03'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [201/219] DHEERAJ UMESHA BELCHADA (90191)
  SELECT id INTO uid_200 FROM profiles WHERE email = 'dheeraj.belchada@company.com';
  IF uid_200 IS NULL THEN
    uid_200 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_200,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'dheeraj.belchada@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DHEERAJ UMESHA BELCHADA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_200,
      uid_200::text,
      json_build_object('sub', uid_200::text, 'email', 'dheeraj.belchada@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_200, 'DHEERAJ UMESHA BELCHADA', 'dheeraj.belchada@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_200,
    '90191',
    '2581327877',
    'Y4321634',
    'bupa-1790',
    'Manufacturing Supervisor',
    '1990-10-20',
    '2034-07-02',
    '2026-08-04',
    '2034-07-02'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [202/219] KAMAL KISHOR YADAV (90192)
  SELECT id INTO uid_201 FROM profiles WHERE email = 'kamal.yadav@company.com';
  IF uid_201 IS NULL THEN
    uid_201 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_201,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'kamal.yadav@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"KAMAL KISHOR YADAV"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_201,
      uid_201::text,
      json_build_object('sub', uid_201::text, 'email', 'kamal.yadav@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_201, 'KAMAL KISHOR YADAV', 'kamal.yadav@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_201,
    '90192',
    '2581328099',
    '09740461',
    'bupa-1791',
    'Manufacturing officer',
    '1990-05-27',
    '2026-04-27',
    '2026-05-04',
    '2026-04-27'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [203/219] MOHAMMAD AKRAM KHAN (90193)
  SELECT id INTO uid_202 FROM profiles WHERE email = 'mohammad.khan@company.com';
  IF uid_202 IS NULL THEN
    uid_202 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_202,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohammad.khan@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MOHAMMAD AKRAM KHAN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_202,
      uid_202::text,
      json_build_object('sub', uid_202::text, 'email', 'mohammad.khan@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_202, 'MOHAMMAD AKRAM KHAN', 'mohammad.khan@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_202,
    '90193',
    '2584618819',
    'S9419144',
    'bupa-1792',
    'Manufacturing officer',
    '1993-02-25',
    '2029-04-08',
    '2026-03-18',
    '2029-04-08'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [204/219] RIZWAN AHMED ZUBAID AHMED (90194)
  SELECT id INTO uid_203 FROM profiles WHERE email = 'rizwan.ahmed@company.com';
  IF uid_203 IS NULL THEN
    uid_203 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_203,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'rizwan.ahmed@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"RIZWAN AHMED ZUBAID AHMED"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_203,
      uid_203::text,
      json_build_object('sub', uid_203::text, 'email', 'rizwan.ahmed@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_203, 'RIZWAN AHMED ZUBAID AHMED', 'rizwan.ahmed@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_203,
    '90194',
    '2587868478',
    'TW1168722',
    'bupa-1793',
    'Manufacturing officer',
    '1985-09-18',
    '2030-05-04',
    '2026-04-18',
    '2030-05-04'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [205/219] NISHITH ANNARAM (90195)
  SELECT id INTO uid_204 FROM profiles WHERE email = 'nishith.annaram@company.com';
  IF uid_204 IS NULL THEN
    uid_204 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_204,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'nishith.annaram@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"NISHITH ANNARAM"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_204,
      uid_204::text,
      json_build_object('sub', uid_204::text, 'email', 'nishith.annaram@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_204, 'NISHITH ANNARAM', 'nishith.annaram@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_204,
    '90195',
    '2588575213',
    'R1602739',
    'bupa-1794',
    'Occ Health & Safety Supervisor',
    '1998-12-02',
    '2027-07-16',
    '2026-04-28',
    '2027-07-16'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [206/219] HASIM SIROHA (90196)
  SELECT id INTO uid_205 FROM profiles WHERE email = 'hasim.siroha@company.com';
  IF uid_205 IS NULL THEN
    uid_205 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_205,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'hasim.siroha@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"HASIM SIROHA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_205,
      uid_205::text,
      json_build_object('sub', uid_205::text, 'email', 'hasim.siroha@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_205, 'HASIM SIROHA', 'hasim.siroha@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_205,
    '90196',
    '2589332853',
    'W7120531',
    'bupa-1795',
    'Manufacturing officer',
    '2002-10-06',
    '2032-12-01',
    '2026-08-10',
    '2032-12-01'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [207/219] ARJUN BARAL (90197)
  SELECT id INTO uid_206 FROM profiles WHERE email = 'arjun.baral@company.com';
  IF uid_206 IS NULL THEN
    uid_206 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_206,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'arjun.baral@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"ARJUN BARAL"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_206,
      uid_206::text,
      json_build_object('sub', uid_206::text, 'email', 'arjun.baral@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_206, 'ARJUN BARAL', 'arjun.baral@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_206,
    '90197',
    '2591648957',
    'PA2705809',
    'bupa-1796',
    'Manufacturing officer',
    '1988-11-17',
    '2034-04-27',
    '2026-06-05',
    '2034-04-27'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [208/219] KRISHNA PRASAD BARAL (90198)
  SELECT id INTO uid_207 FROM profiles WHERE email = 'krishna.baral@company.com';
  IF uid_207 IS NULL THEN
    uid_207 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_207,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'krishna.baral@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"KRISHNA PRASAD BARAL"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_207,
      uid_207::text,
      json_build_object('sub', uid_207::text, 'email', 'krishna.baral@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_207, 'KRISHNA PRASAD BARAL', 'krishna.baral@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_207,
    '90198',
    '2591649336',
    '12575695',
    'bupa-1797',
    'Manufacturing officer',
    '1989-06-23',
    '2031-12-11',
    '2026-06-04',
    '2031-12-11'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [209/219] NETRA BAHADUR RANA (90199)
  SELECT id INTO uid_208 FROM profiles WHERE email = 'netra.rana@company.com';
  IF uid_208 IS NULL THEN
    uid_208 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_208,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'netra.rana@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"NETRA BAHADUR RANA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_208,
      uid_208::text,
      json_build_object('sub', uid_208::text, 'email', 'netra.rana@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_208, 'NETRA BAHADUR RANA', 'netra.rana@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_208,
    '90199',
    '2591780628',
    'PA3181560',
    'bupa-1798',
    'Manufacturing officer',
    '1990-09-07',
    '2034-08-20',
    '2026-03-07',
    '2034-08-20'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [210/219] PRATAP NEPALI (90200)
  SELECT id INTO uid_209 FROM profiles WHERE email = 'pratap.nepali@company.com';
  IF uid_209 IS NULL THEN
    uid_209 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_209,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'pratap.nepali@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"PRATAP NEPALI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_209,
      uid_209::text,
      json_build_object('sub', uid_209::text, 'email', 'pratap.nepali@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_209, 'PRATAP NEPALI', 'pratap.nepali@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_209,
    '90200',
    '2591781592',
    '09719586',
    'bupa-1799',
    'Manufacturing officer',
    '1996-11-12',
    '2026-04-17',
    '2026-03-07',
    '2026-04-17'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [211/219] PRABIN KHADKA (90201)
  SELECT id INTO uid_210 FROM profiles WHERE email = 'prabin.khadka@company.com';
  IF uid_210 IS NULL THEN
    uid_210 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_210,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'prabin.khadka@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"PRABIN KHADKA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_210,
      uid_210::text,
      json_build_object('sub', uid_210::text, 'email', 'prabin.khadka@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_210, 'PRABIN KHADKA', 'prabin.khadka@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_210,
    '90201',
    '2591781816',
    '12198797',
    'bupa-1800',
    'Manufacturing officer',
    '2000-09-18',
    '2031-04-03',
    '2026-09-03',
    '2031-04-03'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [212/219] DANISH TAHIR TAHIR MEHMOOD (90202)
  SELECT id INTO uid_211 FROM profiles WHERE email = 'danish.mehmood@company.com';
  IF uid_211 IS NULL THEN
    uid_211 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_211,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'danish.mehmood@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"DANISH TAHIR TAHIR MEHMOOD"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_211,
      uid_211::text,
      json_build_object('sub', uid_211::text, 'email', 'danish.mehmood@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_211, 'DANISH TAHIR TAHIR MEHMOOD', 'danish.mehmood@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_211,
    '90202',
    '2592692020',
    'EU7124111',
    'bupa-1801',
    'Warehouse worker',
    '2000-06-12',
    '2028-02-28',
    '2026-03-17',
    '2028-02-28'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [213/219] YASHWANTH KRISHNA NAIK (90203)
  SELECT id INTO uid_212 FROM profiles WHERE email = 'yashwanth.naik@company.com';
  IF uid_212 IS NULL THEN
    uid_212 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_212,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'yashwanth.naik@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"YASHWANTH KRISHNA NAIK"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_212,
      uid_212::text,
      json_build_object('sub', uid_212::text, 'email', 'yashwanth.naik@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_212, 'YASHWANTH KRISHNA NAIK', 'yashwanth.naik@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_212,
    '90203',
    '2595369220',
    'Y6667261',
    'bupa-1802',
    'Maintenance Supervisor',
    '1987-07-10',
    '2033-07-11',
    '2026-07-09',
    '2033-07-11'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [214/219] SUNIL RAI (90204)
  SELECT id INTO uid_213 FROM profiles WHERE email = 'sunil.rai@company.com';
  IF uid_213 IS NULL THEN
    uid_213 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_213,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'sunil.rai@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"SUNIL RAI"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_213,
      uid_213::text,
      json_build_object('sub', uid_213::text, 'email', 'sunil.rai@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_213, 'SUNIL RAI', 'sunil.rai@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_213,
    '90204',
    '2598601538',
    '10053909',
    'bupa-1803',
    'Manufacturing officer',
    '1996-05-17',
    '2026-10-23',
    '2026-10-25',
    '2026-10-23'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [215/219] UMAN SHARIF MUHAMMAD SHARIF (90205)
  SELECT id INTO uid_214 FROM profiles WHERE email = 'uman.sharif@company.com';
  IF uid_214 IS NULL THEN
    uid_214 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_214,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'uman.sharif@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"UMAN SHARIF MUHAMMAD SHARIF"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_214,
      uid_214::text,
      json_build_object('sub', uid_214::text, 'email', 'uman.sharif@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_214, 'UMAN SHARIF MUHAMMAD SHARIF', 'uman.sharif@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_214,
    '90205',
    '2602659647',
    'DQ5128873',
    'bupa-1804',
    'Manufacturing officer',
    '1991-10-06',
    '2029-01-07',
    '2026-04-09',
    '2029-01-07'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [216/219] STEEVAN RUZARIO (90206)
  SELECT id INTO uid_215 FROM profiles WHERE email = 'steevan.ruzario@company.com';
  IF uid_215 IS NULL THEN
    uid_215 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_215,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'steevan.ruzario@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"STEEVAN RUZARIO"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_215,
      uid_215::text,
      json_build_object('sub', uid_215::text, 'email', 'steevan.ruzario@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_215, 'STEEVAN RUZARIO', 'steevan.ruzario@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_215,
    '90206',
    '2602660660',
    'V1174361',
    'bupa-1805',
    'Manufacturing officer',
    '1987-11-28',
    '2031-07-25',
    '2026-04-06',
    '2031-07-25'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [217/219] RAMON JR CRISTOBAL CABALONGA (90207)
  SELECT id INTO uid_216 FROM profiles WHERE email = 'ramon.cabalonga@company.com';
  IF uid_216 IS NULL THEN
    uid_216 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_216,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'ramon.cabalonga@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"RAMON JR CRISTOBAL CABALONGA"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_216,
      uid_216::text,
      json_build_object('sub', uid_216::text, 'email', 'ramon.cabalonga@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_216, 'RAMON JR CRISTOBAL CABALONGA', 'ramon.cabalonga@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_216,
    '90207',
    '2602661437',
    'P5529214B',
    'bupa-1806',
    'Occ Health & Safety Supervisor',
    '1974-12-01',
    '2030-09-17',
    '2026-04-03',
    '2030-09-17'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [218/219] BAKHTIAR ZEB ZIGRAWAR SAID (90208)
  SELECT id INTO uid_217 FROM profiles WHERE email = 'bakhtiar.said@company.com';
  IF uid_217 IS NULL THEN
    uid_217 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_217,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'bakhtiar.said@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"BAKHTIAR ZEB ZIGRAWAR SAID"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_217,
      uid_217::text,
      json_build_object('sub', uid_217::text, 'email', 'bakhtiar.said@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_217, 'BAKHTIAR ZEB ZIGRAWAR SAID', 'bakhtiar.said@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_217,
    '90208',
    '2606062624',
    'DT5091672',
    'bupa-1807',
    'Manufacturing officer',
    '1982-03-15',
    '2033-12-13',
    '2026-08-12',
    '2033-12-13'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

  -- [219/219] MOHAMMAD NAZIM HUSSAIN (90209)
  SELECT id INTO uid_218 FROM profiles WHERE email = 'mohammad.hussain2@company.com';
  IF uid_218 IS NULL THEN
    uid_218 := gen_random_uuid();

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
    VALUES (
      uid_218,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mohammad.hussain2@company.com',
      crypt('Welcome@123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"MOHAMMAD NAZIM HUSSAIN"}'::jsonb
    );

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      uid_218,
      uid_218::text,
      json_build_object('sub', uid_218::text, 'email', 'mohammad.hussain2@company.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    INSERT INTO profiles (id, full_name, email, role, department, is_active)
    VALUES (uid_218, 'MOHAMMAD NAZIM HUSSAIN', 'mohammad.hussain2@company.com', 'employee', 'Operations', true);
  END IF;

  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)
  VALUES (
    uid_218,
    '90209',
    '2618912618',
    'W3290340',
    'bupa-1808',
    'Truck Driver',
    '1978-02-12',
    '2032-08-07',
    '2026-04-08',
    '2032-08-07'
  )
  ON CONFLICT (emp_code) DO UPDATE SET
    iqama_number     = EXCLUDED.iqama_number,
    passport_number  = EXCLUDED.passport_number,
    insurance_number = EXCLUDED.insurance_number,
    occupation       = EXCLUDED.occupation,
    birth_date       = EXCLUDED.birth_date,
    passport_expiry  = EXCLUDED.passport_expiry,
    iqama_expiry     = EXCLUDED.iqama_expiry,
    insurance_expiry = EXCLUDED.insurance_expiry,
    updated_at       = now();

END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Done! 219 employees seeded.
-- Default password for all accounts: Welcome@123
-- Default role: employee
-- Default department: Operations
-- You can update roles/departments/supervisors after import.