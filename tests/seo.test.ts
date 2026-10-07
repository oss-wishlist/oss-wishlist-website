import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { absoluteUrl, buildRobotsTxt, AI_SEARCH_AGENTS, AI_TRAINING_AGENTS } from '../src/lib/seo';

/** The rules that apply to one user agent: the group naming it, else the * group. */
function groupFor(robots: string, agent: string): string[] {
  const groups = robots.split(/\n\s*\n/).map((g) => g.split('\n').filter((l) => l && !l.startsWith('#')));
  const named = groups.find((g) => g.some((l) => l === `User-agent: ${agent}`));
  return named ?? groups.find((g) => g.includes('User-agent: *')) ?? [];
}

describe('robots.txt', () => {
  const robots = buildRobotsTxt({ indexable: true, site: 'https://oss-wishlist.com' });

  it('lets AI assistants that link to sources read the site', () => {
    for (const agent of AI_SEARCH_AGENTS) {
      expect(groupFor(robots, agent)).not.toContain('Disallow: /');
    }
  });

  it('keeps model-training crawlers out', () => {
    for (const agent of AI_TRAINING_AGENTS) {
      expect(groupFor(robots, agent)).toContain('Disallow: /');
    }
  });

  it('points at the sitemap on the real domain', () => {
    expect(robots).toContain('Sitemap: https://oss-wishlist.com/sitemap.xml');
  });

  it('blocks everything when indexing is disabled', () => {
    expect(buildRobotsTxt({ indexable: false })).toContain('User-agent: *\nDisallow: /');
  });

  it('is not shadowed by a static file', () => {
    // A public/robots.txt is served instead of the route and once blocked
    // ChatGPT and Perplexity in production.
    expect(existsSync('public/robots.txt')).toBe(false);
  });
});

describe('absoluteUrl', () => {
  it('builds URLs on the given site', () => {
    expect(absoluteUrl('services/funding-strategy', 'https://oss-wishlist.com')).toBe(
      'https://oss-wishlist.com/services/funding-strategy',
    );
    expect(absoluteUrl('', 'https://oss-wishlist.com')).toBe('https://oss-wishlist.com/');
  });
});
