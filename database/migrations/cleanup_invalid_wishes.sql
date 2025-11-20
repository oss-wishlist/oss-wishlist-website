-- Clean up invalid service references in wishlists.wishes array
-- Only keep services that exist in the services table

-- First, let's see what we have
DO $$
DECLARE
  valid_slugs TEXT[];
BEGIN
  -- Get all valid service slugs
  SELECT ARRAY_AGG(slug) INTO valid_slugs FROM services;
  
  RAISE NOTICE 'Valid service slugs: %', valid_slugs;
  
  -- Update wishlists to remove invalid wishes
  UPDATE wishlists
  SET wishes = (
    SELECT ARRAY_AGG(wish)
    FROM UNNEST(wishes) AS wish
    WHERE wish = ANY(valid_slugs)
  )
  WHERE EXISTS (
    SELECT 1
    FROM UNNEST(wishes) AS wish
    WHERE NOT (wish = ANY(valid_slugs))
  );
  
  RAISE NOTICE 'Cleaned up invalid wishes from wishlists';
END $$;

-- Show summary of cleanup
SELECT 
  id,
  project_name,
  wishes,
  ARRAY_LENGTH(wishes, 1) as wish_count
FROM wishlists
ORDER BY id;
