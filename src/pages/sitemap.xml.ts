import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site?.toString() || 'https://oss-wishlist.com';
  
  // Get all dynamic content
  const services = await getCollection('services');
  const playbooks = await getCollection('playbooks-external');
  
  // Build URLs for all dynamic pages
  const urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: number }> = [];
  
  // Static pages with high priority
  const staticPages = [
    { loc: '', priority: 1.0 },
    { loc: 'catalog', priority: 0.9 },
    { loc: 'wishlists', priority: 0.9 },
    { loc: 'helpers', priority: 0.8 },
    { loc: 'practitioners', priority: 0.8 },
    { loc: 'ecosystem-guardians', priority: 0.8 },
    { loc: 'maintainers', priority: 0.8 },
    { loc: 'faq', priority: 0.7 },
    { loc: 'create-wishlist', priority: 0.7 },
    { loc: 'apply-practitioner', priority: 0.7 },
    { loc: 'calendar', priority: 0.6 },
    { loc: 'campaigns', priority: 0.6 },
    { loc: 'pricing', priority: 0.6 },
    { loc: 'sitemap', priority: 0.5 },
    { loc: 'code-of-conduct', priority: 0.5 },
    { loc: 'privacy-policy', priority: 0.5 },
  ];
  
  staticPages.forEach(page => {
    urls.push({
      loc: `${siteUrl}${page.loc}`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: page.priority,
    });
  });
  
  // Service pages
  services.forEach(service => {
    urls.push({
      loc: `${siteUrl}services/${service.slug}`,
      lastmod: new Date().toISOString(),
      changefreq: 'monthly',
      priority: 0.8,
    });
  });
  
  // Playbook pages
  playbooks.forEach(playbook => {
    urls.push({
      loc: `${siteUrl}playbooks/${playbook.slug}`,
      lastmod: new Date().toISOString(),
      changefreq: 'monthly',
      priority: 0.7,
    });
  });
  
  // Generate XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority ? `<priority>${url.priority}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
};
