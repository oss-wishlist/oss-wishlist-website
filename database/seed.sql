-- Seed data for testing wishlist display, edit, and delete operations
-- Run this after creating the schema

-- Clear existing test data (IDs 100-104)
DELETE FROM wishlists WHERE id >= 100 AND id <= 104;

INSERT INTO wishlists (
  id, slug, project_name, repository_url, project_description,
  maintainer_username, maintainer_email, maintainer_avatar_url,
  issue_url, issue_state, approved,
  wishes, technologies, resources,
  urgency, project_size, additional_notes,
  organization_type, organization_name,
  open_to_sponsorship, preferred_practitioner,
  created_at, updated_at
) VALUES
  -- Approved wishlist for testing display
  (
    100,
    'awesome-oss-project-100',
    'Awesome OSS Project',
    'https://github.com/test-org/awesome-oss-project',
    'A groundbreaking open source project that needs help with governance and security',
    'testmaintainer',
    'maintainer@example.com',
    'https://github.com/testmaintainer.png',
    'https://github.com/oss-wishlist/wishlists-dev/issues/100',
    'open',
    TRUE,
    ARRAY['governance-setup', 'security-audit'],
    ARRAY['JavaScript', 'Node.js', 'PostgreSQL'],
    ARRAY[]::TEXT[],
    'high',
    'medium',
    'We need immediate help setting up our governance model and conducting a security audit.',
    'nonprofit',
    'Open Source Foundation',
    TRUE,
    'any',
    '2025-01-10 10:00:00+00',
    '2025-01-10 10:00:00+00'
  ),
  
  -- Pending approval wishlist
  (
    101,
    'cool-library-101',
    'Cool Library',
    'https://github.com/dev-collective/cool-library',
    'A utility library used by thousands of developers that needs funding guidance',
    'librarymaintainer',
    'library@example.com',
    'https://github.com/librarymaintainer.png',
    'https://github.com/oss-wishlist/wishlists-dev/issues/101',
    'open',
    FALSE,
    ARRAY['funding-strategy', 'community-building'],
    ARRAY['Python', 'TypeScript'],
    ARRAY[]::TEXT[],
    'medium',
    'small',
    'Looking for guidance on sustainable funding models.',
    'forprofit',
    'Dev Collective Inc',
    FALSE,
    '',
    '2025-01-12 14:30:00+00',
    '2025-01-12 14:30:00+00'
  ),
  
  -- Another approved wishlist with nominee
  (
    102,
    'community-platform-102',
    'Community Platform',
    'https://github.com/community-org/platform',
    'An open source community platform seeking mentorship and contributor onboarding help',
    'platformlead',
    'lead@community.org',
    'https://github.com/platformlead.png',
    'https://github.com/oss-wishlist/wishlists-dev/issues/102',
    'open',
    TRUE,
    ARRAY['mentorship-program', 'contributor-onboarding', 'maintainer-task-contributor'],
    ARRAY['React', 'GraphQL', 'Docker'],
    ARRAY[]::TEXT[],
    'low',
    'large',
    'We have a growing community and need help structuring our mentorship program.',
    'academic',
    'University Research Lab',
    TRUE,
    'specific-practitioner',
    '2025-01-08 09:15:00+00',
    '2025-01-08 09:15:00+00'
  ),
  
  -- Wishlist for edit testing
  (
    103,
    'edit-test-project-103',
    'Edit Test Project',
    'https://github.com/test-user/edit-test',
    'This wishlist is specifically for testing the edit functionality',
    'testmaintainer',
    'test@example.com',
    'https://github.com/testmaintainer.png',
    'https://github.com/oss-wishlist/wishlists-dev/issues/103',
    'open',
    TRUE,
    ARRAY['governance-setup'],
    ARRAY['Go', 'Kubernetes'],
    ARRAY[]::TEXT[],
    'medium',
    'medium',
    'Original notes before edit',
    'other',
    'Test Organization',
    FALSE,
    '',
    '2025-01-11 16:45:00+00',
    '2025-01-11 16:45:00+00'
  ),
  
  -- Wishlist for delete testing
  (
    104,
    'delete-test-project-104',
    'Delete Test Project',
    'https://github.com/test-user/delete-test',
    'This wishlist will be deleted during testing',
    'testmaintainer',
    'test@example.com',
    'https://github.com/testmaintainer.png',
    'https://github.com/oss-wishlist/wishlists-dev/issues/104',
    'open',
    FALSE,
    ARRAY['funding-strategy'],
    ARRAY['Ruby', 'Rails'],
    ARRAY[]::TEXT[],
    'low',
    'small',
    'This is just for testing deletion',
    'nonprofit',
    'Test Nonprofit',
    FALSE,
    '',
    '2025-01-13 11:20:00+00',
    '2025-01-13 11:20:00+00'
  );

-- Verify the data was inserted
SELECT 
  id, 
  slug, 
  project_name, 
  maintainer_username, 
  approved,
  array_length(wishes, 1) as num_services
FROM wishlists
ORDER BY id;
