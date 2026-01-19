-- PostgreSQL schema for OSS Wishlist
-- This replaces the markdown-based content collections with a proper database

-- Create wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  -- Primary identifiers
  id INTEGER PRIMARY KEY,  -- GitHub issue number
  slug VARCHAR(255) NOT NULL UNIQUE,  -- URL-friendly identifier (e.g., 'reponame-123')
  
  -- Project information
  project_name VARCHAR(500) NOT NULL,
  repository_url TEXT NOT NULL,
  project_description TEXT,
  
  -- Maintainer information
  maintainer_username VARCHAR(255) NOT NULL,
  maintainer_email VARCHAR(255),  -- Stored for internal coordination, not exposed publicly
  maintainer_avatar_url TEXT,
  
  -- GitHub integration
  issue_url TEXT NOT NULL,
  issue_state VARCHAR(50) DEFAULT 'open',  -- 'open' or 'closed'
  
  -- Approval
  approved BOOLEAN DEFAULT FALSE,
  
  -- Services and resources
  wishes TEXT[] DEFAULT '{}',  -- Array of service slugs requested
  technologies TEXT[] DEFAULT '{}',  -- Array of technology tags
  resources TEXT[] DEFAULT '{}',  -- Array of resource types needed
  
  -- Project details
  urgency VARCHAR(50),  -- 'low', 'medium', 'high', 'critical'
  project_size VARCHAR(50),  -- 'small', 'medium', 'large', 'enterprise'
  additional_notes TEXT,
  
  -- Organization information
  organization_type VARCHAR(100),  -- 'nonprofit', 'forprofit', 'government', 'academic', 'other'
  organization_name VARCHAR(255),
  other_organization_type VARCHAR(255),
  
  -- Sponsorship and preferences
  open_to_sponsorship BOOLEAN DEFAULT FALSE,
  preferred_practitioner VARCHAR(255),
  
  -- Nominee information (internal coordination only)
  nominee_name VARCHAR(255),
  nominee_email VARCHAR(255),
  nominee_github VARCHAR(255),
  
  -- GitHub Actions automation
  funding_yml BOOLEAN DEFAULT FALSE,
  funding_yml_processed BOOLEAN DEFAULT FALSE,
  
  -- General/custom need fields
  general_need_short_description TEXT,
  general_need_full_description TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_wishlists_maintainer ON wishlists(maintainer_username);
CREATE INDEX IF NOT EXISTS idx_wishlists_approved ON wishlists(approved);
CREATE INDEX IF NOT EXISTS idx_wishlists_created_at ON wishlists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlists_issue_state ON wishlists(issue_state);
CREATE INDEX IF NOT EXISTS idx_wishlists_funding_yml_processed ON wishlists(funding_yml, funding_yml_processed) WHERE funding_yml = TRUE AND funding_yml_processed = FALSE;

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_wishlists_updated_at ON wishlists;
CREATE TRIGGER update_wishlists_updated_at
  BEFORE UPDATE ON wishlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE wishlists IS 'Stores wishlist submissions from open source maintainers';
COMMENT ON COLUMN wishlists.id IS 'GitHub issue number, used as primary key';
COMMENT ON COLUMN wishlists.maintainer_email IS 'Email for internal coordination only, not exposed publicly';
COMMENT ON COLUMN wishlists.nominee_email IS 'Nominee email for internal coordination only, not exposed publicly';
COMMENT ON COLUMN wishlists.funding_yml IS 'Indicates if maintainer requested FUNDING.yml PR creation';
COMMENT ON COLUMN wishlists.funding_yml_processed IS 'Indicates if FUNDING.yml PR has been created (prevents duplicates)';
COMMENT ON COLUMN wishlists.general_need_short_description IS 'Brief summary of custom need (shown when general-need service is selected)';
COMMENT ON COLUMN wishlists.general_need_full_description IS 'Detailed description with success criteria for custom need';

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
COMMENT ON TABLE services IS 'Service catalog - referenced by wishlists (wishes array), practitioners (services array), and fulfillments';
COMMENT ON COLUMN services.slug IS 'URL-friendly identifier matching content collection slugs';
COMMENT ON COLUMN services.type IS 'service (active help) or resource (passive offering)';
COMMENT ON COLUMN services.service_type IS 'Category of service delivery method';
COMMENT ON COLUMN services.pricing_small IS 'Price for small projects (in USD)';
COMMENT ON COLUMN services.pricing_medium IS 'Price for medium projects (in USD)';
COMMENT ON COLUMN services.pricing_large IS 'Price for large projects (in USD)';
