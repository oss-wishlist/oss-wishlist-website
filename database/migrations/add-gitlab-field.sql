-- Add gitlab field to practitioners table
-- Run this migration on production database

ALTER TABLE practitioners 
ADD COLUMN IF NOT EXISTS gitlab TEXT;

-- Create index for fast lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_practitioners_gitlab ON practitioners(gitlab);
