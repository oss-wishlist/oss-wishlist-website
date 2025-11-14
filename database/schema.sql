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
  
  -- Approval and status
  approved BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'approved', 'fulfilled', 'closed'
  
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
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_wishlists_maintainer ON wishlists(maintainer_username);
CREATE INDEX IF NOT EXISTS idx_wishlists_approved ON wishlists(approved);
CREATE INDEX IF NOT EXISTS idx_wishlists_status ON wishlists(status);
CREATE INDEX IF NOT EXISTS idx_wishlists_created_at ON wishlists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlists_issue_state ON wishlists(issue_state);

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
