-- Budget adjustments and credit holds per spa per month
-- Types: add_budget (+$), lower_budget (-$), credit_hold (reserve for later)
-- Status: active (in effect), applied (credit moved to another month), returned (credit given back)
CREATE TABLE IF NOT EXISTS spa_month_adjustments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  spa_id TEXT NOT NULL REFERENCES spas(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('add_budget', 'lower_budget', 'credit_hold')),
  amount NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'applied', 'returned')),
  applied_to_month TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spa_month_adjustments_lookup ON spa_month_adjustments (spa_id, month);
