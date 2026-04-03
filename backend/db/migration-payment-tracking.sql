-- Payment Tracking: one record per spa per month
CREATE TABLE IF NOT EXISTS spa_payment_tracking (
  id TEXT PRIMARY KEY,
  spa_id TEXT NOT NULL REFERENCES spas(id) ON DELETE CASCADE,
  month TEXT NOT NULL,  -- 'yyyy-MM'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'paid', 'pending', 'overdue'
  amount_due NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  paid_at TIMESTAMPTZ,
  deadline DATE,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(spa_id, month)
);

-- Payment Notes: flat timeline of notes per spa per month
CREATE TABLE IF NOT EXISTS spa_payment_notes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  spa_id TEXT NOT NULL REFERENCES spas(id) ON DELETE CASCADE,
  month TEXT NOT NULL,  -- 'yyyy-MM'
  note TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_payment_tracking_spa_month ON spa_payment_tracking(spa_id, month);
CREATE INDEX IF NOT EXISTS idx_payment_notes_spa_month ON spa_payment_notes(spa_id, month);

-- RLS
ALTER TABLE spa_payment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE spa_payment_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON spa_payment_tracking FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON spa_payment_notes FOR ALL USING (true) WITH CHECK (true);
