-- ============================================================
-- 013 – Monthly Hour Settings (Regular hours threshold per month)
-- HR can configure how many hours count as "regular" per day;
-- anything above that becomes overtime in the consolidated view.
-- ============================================================

CREATE TABLE monthly_hour_settings (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month               INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year                INT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  regular_hours_limit NUMERIC(3,1) NOT NULL DEFAULT 8.0,
  set_by              UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(month, year)
);

CREATE INDEX idx_mhs_month_year ON monthly_hour_settings(month, year);

-- RLS: HR/managers read+write, others read
ALTER TABLE monthly_hour_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mhs_select_all" ON monthly_hour_settings
  FOR SELECT USING (true);

CREATE POLICY "mhs_all_hr" ON monthly_hour_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('hr','hr_director','manager')
    )
  );
