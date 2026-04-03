-- Adds payment_type to track how each spa pays:
-- credit_card = client uses their own CC (no follow-up needed)
-- invoice = uses our credit card, needs payment schedule + follow-up
ALTER TABLE spas ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'invoice'
  CHECK (payment_type IN ('credit_card', 'invoice'));
