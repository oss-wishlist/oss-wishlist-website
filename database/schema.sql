-- PostgreSQL schema for OSS Wishlist
-- This replaces the markdown-based content collections with a proper database

-- The wishlists table was removed when wishlists were replaced by /fund and
-- /check. It is not recreated here. An existing deployment still has the table
-- and its rows: drop it deliberately once you are satisfied nothing needs the
-- data, rather than having a schema run do it silently.

-- Shared trigger function, used by the tables below.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'service', -- 'service' or 'resource'
  service_type VARCHAR(50), -- 'one-time', 'ongoing', 'workshop', 'consulting', 'audit', 'training', 'support', 'credit', 'budget', 'hosting', 'tool'
  target_audience VARCHAR(50), -- 'maintainer', 'company', 'both'
  available BOOLEAN DEFAULT TRUE,
  unavailable_reason TEXT,
  impact TEXT, -- Impact statement for sponsors
  playbook VARCHAR(255), -- Reference to playbook folder
  pricing_small INTEGER, -- Pricing by project size (in USD, nullable)
  pricing_medium INTEGER,
  pricing_large INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes on services
CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);
CREATE INDEX IF NOT EXISTS idx_services_available ON services(available);

-- Create trigger to auto-update services updated_at
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE services IS 'Service catalog - referenced by practitioners (services array)';
COMMENT ON COLUMN services.slug IS 'URL-friendly identifier matching content collection slugs';
COMMENT ON COLUMN services.type IS 'service (active help) or resource (passive offering)';
COMMENT ON COLUMN services.service_type IS 'Category of service delivery method';
COMMENT ON COLUMN services.pricing_small IS 'Price for small projects (in USD)';
COMMENT ON COLUMN services.pricing_medium IS 'Price for medium projects (in USD)';
COMMENT ON COLUMN services.pricing_large IS 'Price for large projects (in USD)';
