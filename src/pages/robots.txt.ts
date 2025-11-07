/**
 * Dynamic robots.txt
 * 
 * Allows/disallows crawling based on DISABLE_INDEXING env variable
 * When DISABLE_INDEXING=true (staging), disallows all crawlers
 * When DISABLE_INDEXING=false or unset (production), allows crawlers
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const disableIndexing = import.meta.env.DISABLE_INDEXING === 'true';
  const isPlaceholder = import.meta.env.PUBLIC_SITE_MODE === 'placeholder';
  
  const robotsTxt = (disableIndexing || isPlaceholder)
    ? `# Staging Environment - No Indexing
User-agent: *
Disallow: /
`
    : `# Production Environment
User-agent: *
Allow: /

# Disallow admin/api routes
Disallow: /api/

# Sitemap
Sitemap: ${import.meta.env.PUBLIC_SITE_URL}${import.meta.env.BASE_URL || ''}/sitemap.xml
`;

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
