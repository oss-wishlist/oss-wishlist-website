/**
 * Dynamic robots.txt
 *
 * Staging (DISABLE_INDEXING=true) and placeholder mode disallow everything.
 * Production lets search engines and AI assistants that cite their sources in,
 * and keeps model-training crawlers out; see lib/seo.ts for the lists.
 *
 * There used to be a public/robots.txt as well. Static files win over routes,
 * so it silently replaced this one and blocked ChatGPT and Perplexity from
 * ever linking to the site.
 */

import type { APIRoute } from 'astro';
import { buildRobotsTxt } from '../lib/seo';

export const GET: APIRoute = ({ site }) => {
  const disableIndexing = import.meta.env.DISABLE_INDEXING === 'true';
  const isPlaceholder = import.meta.env.PUBLIC_SITE_MODE === 'placeholder';

  return new Response(buildRobotsTxt({ indexable: !(disableIndexing || isPlaceholder), site }), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
