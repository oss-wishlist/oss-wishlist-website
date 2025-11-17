-- Seed data for practitioners table
-- Migrates existing markdown practitioners to database

-- Clear existing data (for development)
DELETE FROM practitioners WHERE id IN (1, 2);

-- Insert existing practitioners
INSERT INTO practitioners (
  id,
  slug,
  name,
  title,
  company,
  bio,
  avatar_url,
  location,
  languages,
  email,
  website,
  github,
  github_sponsors,
  mastodon,
  linkedin,
  services,
  availability,
  accepts_pro_bono,
  pro_bono_criteria,
  pro_bono_hours_per_month,
  years_experience,
  notable_experience,
  certifications,
  approved,
  verified,
  submitter_username
) VALUES
(
  1,
  'emma-irwin-practitioner',
  'Emma Irwin',
  'Open source strategy',
  '',
  'Emma has over 15 years'' experience building with and for open source projects and their communities. Her experience spans multiple ''open'' ecosystems including open data, education, science, access and innovation with recognized expertise in open source engineering, sustainability, security, governance, metrics and community building.',
  'https://avatars.githubusercontent.com/u/60618?v=4',
  'Victoria, Canada',
  ARRAY['English'],
  'emma.irwin@gmail.com',
  'https://sunnydeveloper.com',
  'emmairwin',
  'emmairwin',
  '',
  'https://www.linkedin.com/in/emmamirwin/',
  ARRAY['developer-relations-strategy', 'governance-setup', 'moderation-strategy', 'maintainer-task-contributor'],
  'available',
  true,
  'non-profit or solo maintainer; Not an employee of any big tech companies or paid for their role; Updates or adds Code of Conduct as part of engagement',
  6,
  18,
  ARRAY['Open Source Programs Office, Microsoft', 'Open Innovation Team, Mozilla', 'Drupal and Moodle developer, ImageX, Royal Roads Univesity'],
  ARRAY['Hugging Face MCP'],
  true,
  true,
  'emmairwin'
),
(
  2,
  'christos-bacharakis-practitioner',
  'Christos Bacharakis',
  'Open Source Strategy Consultant',
  '',
  'Christos is an open source strategist and community builder with extensive experience helping organizations adopt and contribute to open source projects. He specializes in governance, sustainability, and community engagement.',
  'https://avatars.githubusercontent.com/u/1234567?v=4',
  'Athens, Greece',
  ARRAY['English', 'Greek'],
  'christos@example.com',
  'https://christosbacharakis.com',
  'cbacharakis',
  '',
  '',
  'https://www.linkedin.com/in/christosbacharakis/',
  ARRAY['governance-setup', 'developer-relations-strategy', 'funding-strategy'],
  'available',
  true,
  'Open source projects with clear community governance needs',
  8,
  10,
  ARRAY['Community Lead at Example Foundation', 'Open Source Strategist at Tech Corp'],
  ARRAY['TODO Governance Certified'],
  true,
  true,
  'cbacharakis'
);

-- Reset sequence to continue from highest ID
SELECT setval('practitioners_id_seq', (SELECT MAX(id) FROM practitioners));
