-- 1. Add effective_date to adjustments (for scheduling +$/−$ and status changes)
ALTER TABLE spa_month_adjustments ADD COLUMN IF NOT EXISTS effective_date DATE;

-- 2. Add note_type to payment notes (regular vs critical)
ALTER TABLE spa_payment_notes ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'regular'
  CHECK (note_type IN ('regular', 'critical'));

-- 3. Add period column to payment tracking if not exists (for extra rows)
-- Already exists from prior migration, but ensure it's there
ALTER TABLE spa_payment_tracking ADD COLUMN IF NOT EXISTS period INTEGER DEFAULT 1;
