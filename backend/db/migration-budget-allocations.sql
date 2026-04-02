-- Migration: Budget Breakdown & Allocation
-- Allows accounting to break down a spa's monthly budget into line items per month

-- Budget allocation rows (one per line item)
CREATE TABLE IF NOT EXISTS spa_budget_allocations (
  id TEXT PRIMARY KEY DEFAULT ('ba-' || extract(epoch from now())::bigint || '-' || floor(random() * 1000)::int),
  spa_id TEXT NOT NULL REFERENCES spas(id) ON DELETE CASCADE,
  month TEXT NOT NULL,              -- 'YYYY-MM' format
  label TEXT NOT NULL DEFAULT '',   -- description e.g. "Botox Campaign"
  amount REAL NOT NULL DEFAULT 0,   -- dollar amount for this line
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by spa + month
CREATE INDEX IF NOT EXISTS idx_budget_alloc_spa_month ON spa_budget_allocations(spa_id, month);

-- Enable RLS
ALTER TABLE spa_budget_allocations ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated reads (marketing + accounting can see)
CREATE POLICY "Allow all reads on budget allocations"
  ON spa_budget_allocations FOR SELECT
  USING (true);

-- Allow all inserts (app handles permission logic)
CREATE POLICY "Allow all inserts on budget allocations"
  ON spa_budget_allocations FOR INSERT
  WITH CHECK (true);

-- Allow all updates
CREATE POLICY "Allow all updates on budget allocations"
  ON spa_budget_allocations FOR UPDATE
  USING (true);

-- Allow all deletes
CREATE POLICY "Allow all deletes on budget allocations"
  ON spa_budget_allocations FOR DELETE
  USING (true);

-- Budget instructions/notes per spa per month (separate from allocation rows)
CREATE TABLE IF NOT EXISTS spa_budget_notes (
  spa_id TEXT NOT NULL REFERENCES spas(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  updated_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (spa_id, month)
);

ALTER TABLE spa_budget_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all reads on budget notes"
  ON spa_budget_notes FOR SELECT USING (true);
CREATE POLICY "Allow all inserts on budget notes"
  ON spa_budget_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates on budget notes"
  ON spa_budget_notes FOR UPDATE USING (true);
