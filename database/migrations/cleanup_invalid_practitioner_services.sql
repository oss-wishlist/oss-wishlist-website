-- Clean up invalid service references in practitioners.services array
-- Only keep services that exist in the services table

DO $$
DECLARE
  valid_slugs TEXT[];
BEGIN
  -- Get all valid service slugs
  SELECT ARRAY_AGG(slug) INTO valid_slugs FROM services;
  
  RAISE NOTICE 'Valid service slugs: %', valid_slugs;
  
  -- Update practitioners to remove invalid services
  UPDATE practitioners
  SET services = (
    SELECT ARRAY_AGG(service)
    FROM UNNEST(services) AS service
    WHERE service = ANY(valid_slugs)
  )
  WHERE EXISTS (
    SELECT 1
    FROM UNNEST(services) AS service
    WHERE NOT (service = ANY(valid_slugs))
  );
  
  RAISE NOTICE 'Cleaned up invalid services from practitioners';
END $$;

-- Show summary
SELECT 
  id,
  name,
  services,
  ARRAY_LENGTH(services, 1) as service_count
FROM practitioners
ORDER BY id;
