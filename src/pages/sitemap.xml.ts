import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { withSlug } from '../lib/entry-slug';
import { absoluteUrl } from '../lib/seo';
import { getApprovedPractitionersSafe } from '../lib/practitioner-availability';

/*
  Only URLs that answer 200 belong here. This used to list every package page
  (/p/...) and every playbook (/playbooks/...), about four thousand URLs that
  all 301 elsewhere now, on a host that is not this site. A sitemap that is
  mostly redirects teaches search engines to stop trusting it.

  Playbooks are read on their service page, which renders the whole playbook,
  so the service URLs below are how playbooks reach search results.

  There is no <lastmod>: stamping every URL with the time of the request says
  everything changed on every crawl, which search engines learn to ignore.
*/
const STATIC_PAGES = [
  '',
  'catalog',
  'invest',
  'practitioners',
  'apply-practitioner',
  'contact',
  'sitemap',
];

export const GET: APIRoute = async ({ site }) => {
  const paths = new Set<string>(STATIC_PAGES);

  // Markdown pages served by [...slug].astro: about-us, privacy-policy, and
  // the translated pages under fr/, es/, de/.
  for (const page of (await getCollection('pages')).map(withSlug)) {
    paths.add(page.slug);
  }

  for (const service of (await getCollection('services')).map(withSlug)) {
    paths.add(`services/${service.slug}`);
  }

  for (const practitioner of await getApprovedPractitionersSafe()) {
    if (practitioner.slug) paths.add(`practitioners/${practitioner.slug}`);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...paths].map((path) => `  <url><loc>${escapeXml(absoluteUrl(path, site))}</loc></url>`).join('\n')}
</urlset>
`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
};

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
