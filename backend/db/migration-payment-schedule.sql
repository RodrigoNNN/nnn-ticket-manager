-- Migration: Payment Schedule per spa
-- Adds a payment_schedule column to track how often each client pays

ALTER TABLE spas ADD COLUMN IF NOT EXISTS payment_schedule TEXT DEFAULT 'monthly'
  CHECK (payment_schedule IN ('weekly', 'biweekly', 'monthly'));
