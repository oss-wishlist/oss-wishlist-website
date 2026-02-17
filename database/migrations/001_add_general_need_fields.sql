-- Migration: Add general-need fields to wishlists table
-- Date: 2026-01-19
-- Description: Add fields to support general/custom need service requests

-- Add general-need fields
ALTER TABLE wishlists 
  ADD COLUMN IF NOT EXISTS general_need_short_description TEXT,
  ADD COLUMN IF NOT EXISTS general_need_full_description TEXT;

-- Add comments for documentation
COMMENT ON COLUMN wishlists.general_need_short_description IS 'Brief summary of custom need (shown when general-need service is selected)';
COMMENT ON COLUMN wishlists.general_need_full_description IS 'Detailed description with success criteria for custom need';
