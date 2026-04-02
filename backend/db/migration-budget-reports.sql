-- Migration: 3-Stage Budget Reports
-- Marketing enters actual ad spend per stage each month
-- Stage 1: 1st-15th, Stage 2: 16th-25th, Stage 3: 26th-EOM

CREATE TABLE IF NOT EXISTS spa_budget_reports (
  id TEXT PRIMARY KEY DEFAULT ('br-' || extract(epoch from now())::bigint || '-' || floor(random() * 1000)::int),
  spa_id TEXT NOT NULL REFERENCES spas(id) ON DELETE CASCADE,
  month TEXT NOT NULL,           -- 'YYYY-MM' format
  stage INTEGER NOT NULL CHECK (stage IN (1, 2, 3)),
  actual_spend REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  reported_by TEXT REFERENCES users(id),
  reported_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (spa_id, month, stage)
);

CREATE INDEX IF NOT EXISTS idx_budget_reports_spa_month ON spa_budget_reports(spa_id, month);

ALTER TABLE spa_budget_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all reads on budget reports"
  ON spa_budget_reports FOR SELECT USING (true);
CREATE POLICY "Allow all inserts on budget reports"
  ON spa_budget_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates on budget reports"
  ON spa_budget_reports FOR UPDATE USING (true);
