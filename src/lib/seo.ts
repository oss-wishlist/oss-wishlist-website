/**
 * Where the site lives, and what crawlers may do with it.
 *
 * Canonical tags, the sitemap and robots.txt all used to work out the site's
 * address separately: one from PUBLIC_SITE_URL, one from astro.config's `site`,
 * one hardcoded. They drifted to three different hosts, two of which do not
 * serve this site, so search engines were told the real pages were copies of
 * pages that do not exist. They now all ask `site` in astro.config.mjs.
 */
import { getBasePath } from './paths';

export const DEFAULT_SITE = 'https://oss-wishlist.com';

/** An absolute URL for a path on this site, honouring the base path. */
export function absoluteUrl(path: string, site: URL | string | undefined = DEFAULT_SITE): string {
  const clean = path.replace(/^\//, '');
  return new URL(`${getBasePath()}${clean}`, site ?? DEFAULT_SITE).toString();
}

/**
 * Assistants that fetch a page because someone asked a question, and the
 * search indexes behind them. These are what put a link to the site in an AI
 * answer, so they are allowed.
 */
export const AI_SEARCH_AGENTS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'DuckAssistBot',
];

/**
 * Crawlers that collect pages to train models. They send no visitors back, so
 * they stay blocked. Blocking Google-Extended and Applebot-Extended does not
 * affect Google or Apple search results.
 */
export const AI_TRAINING_AGENTS = [
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'cohere-ai',
  'cohere-training-data-crawler',
  'Bytespider',
  'Meta-ExternalAgent',
  'FacebookBot',
  'Omgilibot',
  'Diffbot',
];

/** Never worth crawling: they are behind a login or return JSON. */
const PRIVATE_PATHS = ['admin', 'auth/', 'api/', 'edit-practitioner', 'login'];

export function buildRobotsTxt({ indexable, site }: { indexable: boolean; site?: URL | string }): string {
  if (!indexable) {
    return '# Staging environment - no indexing\nUser-agent: *\nDisallow: /\n';
  }

  const base = getBasePath();
  const privateRules = PRIVATE_PATHS.map((p) => `Disallow: ${base}${p}`).join('\n');

  return `# Search engines, and AI assistants answering a question, are welcome.
User-agent: *
${AI_SEARCH_AGENTS.map((a) => `User-agent: ${a}`).join('\n')}
Allow: ${base}
${privateRules}

# Crawlers that collect pages for model training are not.
${AI_TRAINING_AGENTS.map((a) => `User-agent: ${a}`).join('\n')}
Disallow: /

Sitemap: ${absoluteUrl('sitemap.xml', site)}
`;
}
