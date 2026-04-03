-- Unique tag number per spa (e.g., tag32, tag140) for campaign identification
ALTER TABLE spas ADD COLUMN IF NOT EXISTS tag TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_spas_tag ON spas (tag) WHERE tag IS NOT NULL;
