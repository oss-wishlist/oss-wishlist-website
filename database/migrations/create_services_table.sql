-- Create services table to normalize service catalog
-- Services are referenced by wishlists (wishes array), practitioners (services array), and fulfillments

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
  pricing_small INTEGER, -- Pricing by project size (nullable, in cents or dollars)
  pricing_medium INTEGER,
  pricing_large INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug);

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);

-- Add comment
COMMENT ON TABLE services IS 'Service catalog - referenced by wishlists, practitioners, and fulfillments';
COMMENT ON COLUMN services.slug IS 'URL-friendly identifier matching content collection slugs';
COMMENT ON COLUMN services.type IS 'service (active help) or resource (passive offering)';
COMMENT ON COLUMN services.service_type IS 'Category of service delivery method';
COMMENT ON COLUMN services.pricing_small IS 'Price for small projects (in USD)';
COMMENT ON COLUMN services.pricing_medium IS 'Price for medium projects (in USD)';
COMMENT ON COLUMN services.pricing_large IS 'Price for large projects (in USD)';

-- Insert initial services from content collection
INSERT INTO services (slug, title, description, type, service_type, target_audience) VALUES
  ('maintainer-task-contributor', 'Maintainer Task: Contributor Onboarding', 'Help setting up contributor onboarding processes', 'service', 'consulting', 'maintainer'),
  ('dependency-security-audit', 'Dependency Security Audit', 'Comprehensive security review of project dependencies', 'service', 'audit', 'maintainer'),
  ('leadership-onboarding', 'Leadership Onboarding', 'Onboarding support for new project leaders', 'service', 'training', 'maintainer'),
  ('governance-setup', 'Governance Setup', 'Establish project governance structures and processes', 'service', 'consulting', 'maintainer'),
  ('developer-relations-strategy', 'Developer Relations Strategy', 'Strategic planning for developer community engagement', 'service', 'consulting', 'maintainer'),
  ('funding-strategy', 'Funding Strategy', 'Develop sustainable funding approaches for your project', 'service', 'consulting', 'maintainer'),
  ('hosting-infrastructure', 'Hosting Infrastructure', 'Infrastructure hosting and management support', 'resource', 'hosting', 'maintainer'),
  ('moderation-strategy', 'Moderation Strategy', 'Community moderation policies and implementation', 'service', 'consulting', 'maintainer')
ON CONFLICT (slug) DO NOTHING;
