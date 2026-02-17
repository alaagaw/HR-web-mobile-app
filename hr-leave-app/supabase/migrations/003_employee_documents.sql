-- ============================================================
-- 003 – Employee Documents (Iqama, Passport, Insurance, etc.)
-- ============================================================

CREATE TABLE employee_documents (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Identifiers
  emp_code          TEXT UNIQUE NOT NULL,
  iqama_number      TEXT,
  passport_number   TEXT,
  insurance_number  TEXT,

  -- Personal info
  occupation        TEXT,
  birth_date        DATE,

  -- Expiry dates
  passport_expiry   DATE,
  iqama_expiry      DATE,
  insurance_expiry  DATE,

  -- Verification workflow
  is_verified       BOOLEAN DEFAULT false,
  verified_by       UUID REFERENCES profiles(id),
  verified_at       TIMESTAMPTZ,

  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),

  UNIQUE(employee_id)
);

-- Indexes
CREATE INDEX idx_employee_documents_employee ON employee_documents(employee_id);
CREATE INDEX idx_employee_documents_emp_code ON employee_documents(emp_code);
CREATE INDEX idx_employee_documents_passport_expiry ON employee_documents(passport_expiry);
CREATE INDEX idx_employee_documents_iqama_expiry ON employee_documents(iqama_expiry);
CREATE INDEX idx_employee_documents_insurance_expiry ON employee_documents(insurance_expiry);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

-- Employees can view their own documents
CREATE POLICY "employee_read_own_documents"
  ON employee_documents FOR SELECT
  USING (employee_id = auth.uid());

-- Employees can insert their own documents
CREATE POLICY "employee_insert_own_documents"
  ON employee_documents FOR INSERT
  WITH CHECK (employee_id = auth.uid());

-- Employees can update their own documents (but NOT is_verified, verified_by, verified_at)
CREATE POLICY "employee_update_own_documents"
  ON employee_documents FOR UPDATE
  USING (employee_id = auth.uid());

-- HR and HR Director: full access to all documents
CREATE POLICY "hr_full_access_documents"
  ON employee_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('hr', 'hr_director')
    )
  );
