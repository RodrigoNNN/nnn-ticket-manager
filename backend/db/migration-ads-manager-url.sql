-- Migration: Add ads manager URL per spa
-- Link to the Meta Ads Manager (or other ad platform) for quick access

ALTER TABLE spas ADD COLUMN IF NOT EXISTS ads_manager_url TEXT DEFAULT '';
