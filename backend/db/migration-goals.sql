-- ============================================================
-- Goals Migration: Min/Target arrival goals + daily arrival tracking
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add min/target goal columns to spas (keep arrival_goal for backward compat)
ALTER TABLE spas ADD COLUMN IF NOT EXISTS arrival_goal_min INTEGER;
ALTER TABLE spas ADD COLUMN IF NOT EXISTS arrival_goal_target INTEGER;

-- Migrate existing arrival_goal data → target, compute min as 80% rounded
UPDATE spas
SET arrival_goal_target = arrival_goal,
    arrival_goal_min = ROUND(arrival_goal * 0.8)
WHERE arrival_goal IS NOT NULL AND arrival_goal > 0;

-- 2. Create daily arrivals table for tracking actual performance
CREATE TABLE IF NOT EXISTS spa_daily_arrivals (
  id TEXT PRIMARY KEY,
  spa_id TEXT NOT NULL REFERENCES spas(id) ON DELETE CASCADE,
  date TEXT NOT NULL,           -- YYYY-MM-DD
  arrivals INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  recorded_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(spa_id, date)         -- one entry per spa per day
);

-- Enable RLS
ALTER TABLE spa_daily_arrivals ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users (using anon key) to read/write
CREATE POLICY "Allow all access to spa_daily_arrivals" ON spa_daily_arrivals
  FOR ALL USING (true) WITH CHECK (true);

-- Index for fast lookups by spa + date range
CREATE INDEX IF NOT EXISTS idx_spa_daily_arrivals_spa_date ON spa_daily_arrivals(spa_id, date);
