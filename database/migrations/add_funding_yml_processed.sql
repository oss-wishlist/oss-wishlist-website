-- Migration: Add funding_yml_processed column to wishlists table
-- Date: 2025-11-19
-- Purpose: Track whether FUNDING.yml has been processed/created for this wishlist

ALTER TABLE wishlists 
ADD COLUMN IF NOT EXISTS funding_yml_processed BOOLEAN DEFAULT FALSE;

-- Add index for querying unprocessed wishlists
CREATE INDEX IF NOT EXISTS idx_wishlists_funding_yml_processed 
ON wishlists(funding_yml_processed) 
WHERE funding_yml_processed = FALSE;

-- Add comment for documentation
COMMENT ON COLUMN wishlists.funding_yml_processed IS 'Indicates if FUNDING.yml file has been created/processed for this wishlist';
