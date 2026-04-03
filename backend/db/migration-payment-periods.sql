-- Add period support to payment tracking
-- Weekly clients have 4 periods/month, Biweekly have 2, Monthly has 1

-- 1. Add period column
ALTER TABLE spa_payment_tracking ADD COLUMN IF NOT EXISTS period INTEGER DEFAULT 1;

-- 2. Drop old unique constraint and add new one with period
ALTER TABLE spa_payment_tracking DROP CONSTRAINT IF EXISTS spa_payment_tracking_spa_id_month_key;
ALTER TABLE spa_payment_tracking ADD CONSTRAINT spa_payment_tracking_spa_id_month_period_key UNIQUE (spa_id, month, period);
