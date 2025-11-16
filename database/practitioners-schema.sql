-- Practitioners table schema
-- Stores practitioner profiles submitted via website

CREATE TABLE IF NOT EXISTS practitioners (
  -- Identity
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  
  -- Basic Information
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT,
  bio TEXT NOT NULL,
  avatar_url TEXT,
  location TEXT,
  languages TEXT[] NOT NULL DEFAULT '{}',
  
  -- Contact & Social
  email TEXT,
  website TEXT,
  github TEXT,
  github_sponsors TEXT,
  mastodon TEXT,
  linkedin TEXT,
  
  -- Services (array of service slugs)
  services TEXT[] NOT NULL DEFAULT '{}',
  
  -- Availability & Pricing
  availability TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'limited', 'unavailable')),
  accepts_pro_bono BOOLEAN DEFAULT false,
  pro_bono_criteria TEXT,
  pro_bono_hours_per_month INTEGER,
  
  -- Experience & Credentials
  years_experience INTEGER,
  notable_experience TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  
  -- Approval & Status
  approved BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
  verified BOOLEAN DEFAULT false,
  
  -- GitHub username of submitter (for ownership verification)
  submitter_username TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_practitioners_status ON practitioners(status);
CREATE INDEX IF NOT EXISTS idx_practitioners_approved ON practitioners(approved);
CREATE INDEX IF NOT EXISTS idx_practitioners_submitter ON practitioners(submitter_username);
CREATE INDEX IF NOT EXISTS idx_practitioners_availability ON practitioners(availability);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_practitioners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER practitioners_updated_at
  BEFORE UPDATE ON practitioners
  FOR EACH ROW
  EXECUTE FUNCTION update_practitioners_updated_at();
