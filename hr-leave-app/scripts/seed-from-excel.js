/**
 * seed-from-excel.js
 *
 * Reads "Active Residents2_10_2026.xlsx" and generates a SQL seed file
 * that inserts auth.users → profiles → employee_documents in one transaction.
 *
 * Usage:
 *   cd hr-leave-app
 *   node scripts/seed-from-excel.js
 *
 * Output:
 *   supabase/seed_employee_documents.sql
 *   (paste into Supabase SQL Editor and run)
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// ── Config ────────────────────────────────────────────────────
const EXCEL_PATH = path.resolve(__dirname, '../../Active Residents2_10_2026.xlsx');
const OUTPUT_PATH = path.resolve(__dirname, '../supabase/seed_employee_documents.sql');
const DEFAULT_PASSWORD = 'Welcome@123'; // change as needed
const DEFAULT_DEPARTMENT = 'Operations';
const DEFAULT_ROLE = 'employee';
const EMAIL_DOMAIN = 'company.com';

// ── Helpers ───────────────────────────────────────────────────

/** Convert Excel serial number to ISO date string */
function excelSerialToDate(serial) {
  if (typeof serial === 'string' && /^\d{4}-\d{2}-\d{2}/.test(serial)) {
    return serial.slice(0, 10); // already ISO
  }
  if (typeof serial === 'number') {
    // Excel epoch: Jan 0, 1900 (with the 1900 leap-year bug)
    const epoch = new Date(1899, 11, 30);
    const d = new Date(epoch.getTime() + serial * 86400000);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

/** Clean a string value for SQL — escape single quotes, trim */
function esc(val) {
  if (val == null || val === '') return 'NULL';
  return `'${String(val).replace(/'/g, "''").trim()}'`;
}

/** Generate a clean email from a full name */
function nameToEmail(fullName) {
  const parts = fullName
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[parts.length - 1]}@${EMAIL_DOMAIN}`;
  }
  return `${parts[0] || 'user'}@${EMAIL_DOMAIN}`;
}

/** Generate emp_code for rows missing one (use iqama as fallback) */
let autoCodeCounter = 90000;
function ensureEmpCode(row) {
  if (row.empCode) return String(row.empCode);
  return String(++autoCodeCounter);
}

// ── Parse Excel ───────────────────────────────────────────────

console.log('Reading Excel:', EXCEL_PATH);
const wb = XLSX.readFile(EXCEL_PATH);
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });

const headers = raw[0];
console.log('Headers:', headers);
console.log('Data rows:', raw.length - 1);

// Map each row
const employees = [];
const emailSet = new Set();

for (let i = 1; i < raw.length; i++) {
  const r = raw[i];
  if (!r || r.length === 0) continue; // skip empty rows

  const name = r[2] ? String(r[2]).trim() : null;
  if (!name) {
    console.warn(`Row ${i + 1}: skipping — no name`);
    continue;
  }

  const empCode = r[0] != null ? String(r[0]) : null;
  const iqamaNumber = r[1] ? String(r[1]).trim() : null;
  const occupation = r[3] ? String(r[3]).trim() : null;
  const passportNumber = r[4] ? String(r[4]).trim() : null;
  const passportExpiry = excelSerialToDate(r[5]);
  const iqamaExpiry = excelSerialToDate(r[6]);
  const insuranceNumber = r[7] ? String(r[7]).trim() : null;
  const insuranceExpiry = excelSerialToDate(r[8]);
  const birthDate = excelSerialToDate(r[9]);

  // Deduplicate emails
  let email = nameToEmail(name);
  if (emailSet.has(email)) {
    let n = 2;
    while (emailSet.has(email.replace('@', `${n}@`))) n++;
    email = email.replace('@', `${n}@`);
  }
  emailSet.add(email);

  employees.push({
    empCode: empCode || String(++autoCodeCounter),
    name,
    email,
    iqamaNumber,
    occupation,
    passportNumber,
    passportExpiry,
    iqamaExpiry,
    insuranceNumber,
    insuranceExpiry,
    birthDate,
  });
}

console.log(`Parsed ${employees.length} employees`);

// ── Generate SQL ──────────────────────────────────────────────

const lines = [];
lines.push('-- ============================================================');
lines.push('-- SEED: Employee Documents from Active Residents Excel');
lines.push(`-- Generated: ${new Date().toISOString()}`);
lines.push(`-- Source: Active Residents2_10_2026.xlsx (${employees.length} rows)`);
lines.push('-- ============================================================');
lines.push('-- Run this in Supabase SQL Editor (as postgres / service role)');
lines.push('-- ============================================================');
lines.push('');
lines.push('BEGIN;');
lines.push('');

// We use a DO block with a UUID variable per employee
// to link auth.users → profiles → employee_documents
lines.push('DO $$');
lines.push('DECLARE');

// Declare a UUID variable for each employee
employees.forEach((emp, idx) => {
  lines.push(`  uid_${idx} UUID;`);
});

lines.push('BEGIN');
lines.push('');

employees.forEach((emp, idx) => {
  const varName = `uid_${idx}`;
  lines.push(`  -- [${idx + 1}/${employees.length}] ${emp.name} (${emp.empCode})`);

  // Check if profile already exists by email (skip if so)
  lines.push(`  SELECT id INTO ${varName} FROM profiles WHERE email = ${esc(emp.email)};`);
  lines.push(`  IF ${varName} IS NULL THEN`);

  // Generate UUID
  lines.push(`    ${varName} := gen_random_uuid();`);
  lines.push('');

  // Insert into auth.users
  lines.push(`    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)`);
  lines.push(`    VALUES (`);
  lines.push(`      ${varName},`);
  lines.push(`      '00000000-0000-0000-0000-000000000000',`);
  lines.push(`      'authenticated',`);
  lines.push(`      'authenticated',`);
  lines.push(`      ${esc(emp.email)},`);
  lines.push(`      crypt(${esc(DEFAULT_PASSWORD)}, gen_salt('bf')),`);
  lines.push(`      now(),`);
  lines.push(`      now(),`);
  lines.push(`      now(),`);
  lines.push(`      '',`);
  lines.push(`      '{"provider":"email","providers":["email"]}'::jsonb,`);
  lines.push(`      ${esc(JSON.stringify({ full_name: emp.name }))}::jsonb`);
  lines.push(`    );`);
  lines.push('');

  // Insert into auth.identities (required by Supabase auth)
  lines.push(`    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)`);
  lines.push(`    VALUES (`);
  lines.push(`      gen_random_uuid(),`);
  lines.push(`      ${varName},`);
  lines.push(`      ${varName}::text,`);
  lines.push(`      json_build_object('sub', ${varName}::text, 'email', ${esc(emp.email)})::jsonb,`);
  lines.push(`      'email',`);
  lines.push(`      now(),`);
  lines.push(`      now(),`);
  lines.push(`      now()`);
  lines.push(`    );`);
  lines.push('');

  // Insert into profiles
  lines.push(`    INSERT INTO profiles (id, full_name, email, role, department, is_active)`);
  lines.push(`    VALUES (${varName}, ${esc(emp.name)}, ${esc(emp.email)}, ${esc(DEFAULT_ROLE)}, ${esc(DEFAULT_DEPARTMENT)}, true);`);

  lines.push(`  END IF;`);
  lines.push('');

  // Insert/upsert into employee_documents
  lines.push(`  INSERT INTO employee_documents (employee_id, emp_code, iqama_number, passport_number, insurance_number, occupation, birth_date, passport_expiry, iqama_expiry, insurance_expiry)`);
  lines.push(`  VALUES (`);
  lines.push(`    ${varName},`);
  lines.push(`    ${esc(emp.empCode)},`);
  lines.push(`    ${esc(emp.iqamaNumber)},`);
  lines.push(`    ${esc(emp.passportNumber)},`);
  lines.push(`    ${esc(emp.insuranceNumber)},`);
  lines.push(`    ${esc(emp.occupation)},`);
  lines.push(`    ${emp.birthDate ? esc(emp.birthDate) : 'NULL'},`);
  lines.push(`    ${emp.passportExpiry ? esc(emp.passportExpiry) : 'NULL'},`);
  lines.push(`    ${emp.iqamaExpiry ? esc(emp.iqamaExpiry) : 'NULL'},`);
  lines.push(`    ${emp.insuranceExpiry ? esc(emp.insuranceExpiry) : 'NULL'}`);
  lines.push(`  )`);
  lines.push(`  ON CONFLICT (emp_code) DO UPDATE SET`);
  lines.push(`    iqama_number     = EXCLUDED.iqama_number,`);
  lines.push(`    passport_number  = EXCLUDED.passport_number,`);
  lines.push(`    insurance_number = EXCLUDED.insurance_number,`);
  lines.push(`    occupation       = EXCLUDED.occupation,`);
  lines.push(`    birth_date       = EXCLUDED.birth_date,`);
  lines.push(`    passport_expiry  = EXCLUDED.passport_expiry,`);
  lines.push(`    iqama_expiry     = EXCLUDED.iqama_expiry,`);
  lines.push(`    insurance_expiry = EXCLUDED.insurance_expiry,`);
  lines.push(`    updated_at       = now();`);
  lines.push('');
});

lines.push('END;');
lines.push('$$ LANGUAGE plpgsql;');
lines.push('');
lines.push('COMMIT;');
lines.push('');
lines.push(`-- Done! ${employees.length} employees seeded.`);
lines.push('-- Default password for all accounts: ' + DEFAULT_PASSWORD);
lines.push('-- Default role: ' + DEFAULT_ROLE);
lines.push('-- Default department: ' + DEFAULT_DEPARTMENT);
lines.push('-- You can update roles/departments/supervisors after import.');

// ── Write output ──────────────────────────────────────────────
fs.writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf-8');
console.log(`\nSQL written to: ${OUTPUT_PATH}`);
console.log(`${employees.length} employees → auth.users + profiles + employee_documents`);
console.log(`Default password: ${DEFAULT_PASSWORD}`);
console.log('\nNext: paste the SQL into Supabase SQL Editor and run it.');
