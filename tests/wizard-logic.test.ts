/**
 * Tests for the logic the wizard actually runs on.
 *
 * These import the real modules and assert on their output. That is worth
 * saying because most of the older suite does not: it builds fixtures inline
 * and asserts on those, so it passes whatever the application does.
 *
 * Everything here is a pure function, so none of it needs a database, a network
 * call or a rendered page.
 */

import { describe, it, expect } from 'vitest';

import { parseRubric } from '../src/lib/rubric-parser';
import { parseRepoInput } from '../src/lib/dependency-check';
import { isExcludedOwner } from '../config/excluded-owners.js';
import {
  MOTIVATIONS,
  isDormant,
  parseMotivations,
  servicesForMotivations,
  suggestedMotivations,
} from '../config/motivations.js';

/** A package shaped like the cache, overridable per test. */
function pkg(overrides = {}) {
  return {
    name: 'example',
    ecosystem: 'npm',
    repository_url: 'https://github.com/example/example',
    dependent_repos_count: 1000,
    funding_links: ['https://github.com/sponsors/example'],
    latest_release_published_at: new Date().toISOString(),
    advisory_count: 0,
    has_advisories: false,
    advisories: [],
    maintainers: [{ login: 'someone', name: 'Someone', profile_url: null }],
    sole_maintainer: false,
    unfunded: false,
    quiet: false,
    ...overrides,
  };
}

const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
};

describe('motivation evidence', () => {
  it('offers no evidence for a healthy package', () => {
    expect(suggestedMotivations(pkg())).toEqual([]);
  });

  it('cites the advisory count for security', () => {
    const found = suggestedMotivations(pkg({ has_advisories: true, advisory_count: 7 }));
    expect(found).toContainEqual({ id: 'security', evidence: '7 known security issues published' });
  });

  it('says "issue" rather than "issues" for a single advisory', () => {
    const found = suggestedMotivations(pkg({ has_advisories: true, advisory_count: 1 }));
    expect(found[0].evidence).toBe('1 known security issue published');
  });

  it('cites the release year for continuity', () => {
    const found = suggestedMotivations(pkg({ quiet: true, latest_release_published_at: '2019-04-01T00:00:00Z' }));
    expect(found).toContainEqual({ id: 'continuity', evidence: 'no release since 2019' });
  });

  it('only raises maintainer workload when many depend on one person', () => {
    const few = suggestedMotivations(pkg({ sole_maintainer: true, dependent_repos_count: 500 }));
    expect(few.map((m) => m.id)).not.toContain('capacity');

    const many = suggestedMotivations(pkg({ sole_maintainer: true, dependent_repos_count: 250_000 }));
    expect(many.map((m) => m.id)).toContain('capacity');
  });

  it('never pre-ticks contributors and growth, which has no signal in the data', () => {
    const everything = pkg({
      sole_maintainer: true,
      unfunded: true,
      quiet: true,
      has_advisories: true,
      advisory_count: 3,
      dependent_repos_count: 5_000_000,
      latest_release_published_at: monthsAgo(60),
    });
    expect(suggestedMotivations(everything).map((m) => m.id)).not.toContain('innovation');
  });
});

describe('winding down is gated on dormancy', () => {
  it('does not treat an 18 month gap as dormant', () => {
    expect(isDormant(pkg({ latest_release_published_at: monthsAgo(18) }))).toBe(false);
  });

  it('treats a two year gap as dormant', () => {
    expect(isDormant(pkg({ latest_release_published_at: monthsAgo(25) }))).toBe(true);
  });

  it('suggests succession alone for a recently quiet project', () => {
    const services = servicesForMotivations(['continuity'], pkg({ latest_release_published_at: monthsAgo(20) }));
    expect(services).toEqual(['leadership-onboarding']);
  });

  it('adds winding down once a project is dormant', () => {
    const services = servicesForMotivations(['continuity'], pkg({ latest_release_published_at: monthsAgo(40) }));
    expect(services).toContain('winding-down');
  });

  it('handles a package with no release date without throwing', () => {
    expect(isDormant(pkg({ latest_release_published_at: null }))).toBe(false);
  });
});

describe('motivation to service mapping', () => {
  it('dedupes services shared by two motivations', () => {
    const services = servicesForMotivations(['continuity', 'capacity'], pkg());
    expect(new Set(services).size).toBe(services.length);
  });

  it('ignores unrecognised motivation ids', () => {
    expect(parseMotivations(['security', 'not-a-motivation'])).toEqual(['security']);
  });

  it('maps every motivation to at least one service', () => {
    for (const m of MOTIVATIONS) {
      expect(servicesForMotivations([m.id], pkg()).length).toBeGreaterThan(0);
    }
  });
});

describe('repository input parsing', () => {
  it.each([
    ['https://github.com/rails/rails', 'rails/rails'],
    ['github.com/rails/rails', 'rails/rails'],
    ['https://github.com/rails/rails.git', 'rails/rails'],
    ['git@github.com:rails/rails.git', 'rails/rails'],
    ['https://github.com/rails/rails/tree/main/activerecord', 'rails/rails'],
  ])('accepts %s', (input, expected) => {
    expect(parseRepoInput(input)?.label).toBe(expected);
  });

  it('accepts GitLab and Codeberg', () => {
    expect(parseRepoInput('https://gitlab.com/gitlab-org/gitlab-runner')?.host).toBe('gitlab.com');
    expect(parseRepoInput('https://codeberg.org/forgejo/forgejo')?.host).toBe('codeberg.org');
  });

  it.each(['', 'hello world', 'https://bitbucket.org/foo/bar', 'https://github.com/only-owner'])(
    'rejects %s',
    (input) => {
      expect(parseRepoInput(input)).toBeNull();
    }
  );
});

describe('rubric parsing', () => {
  it('reads scored dimensions and a total', () => {
    const rubric = parseRubric('demo', [
      '# Something',
      '## Peer Review Rubric',
      '### A. First Dimension (0–12 pts)',
      '### B. Second Dimension (0–8 pts)',
      '### Total Score: 20 pts',
    ].join('\n'));

    expect(rubric?.dimensions.map((d) => d.name)).toEqual(['First Dimension', 'Second Dimension']);
    expect(rubric?.dimensions[0].maxPoints).toBe(12);
    expect(rubric?.totalPoints).toBe(20);
  });

  it('reads unscored dimensions, as the CRA playbook writes them', () => {
    const rubric = parseRubric('cra', [
      '## Open Source Readiness Rubric',
      'Scored per criterion; the result is the lowest scoring one.',
      '## A. Vulnerability Disclosure',
      '## B. Release Traceability',
    ].join('\n'));

    expect(rubric?.dimensions).toHaveLength(2);
    expect(rubric?.dimensions[0].maxPoints).toBeNull();
    expect(rubric?.totalPoints).toBeNull();
  });

  it('ignores lettered headings that appear before the rubric section', () => {
    const rubric = parseRubric('demo', [
      '## A. Not A Dimension',
      '## Peer Review Rubric',
      '### A. Real Dimension (0–4 pts)',
    ].join('\n'));

    expect(rubric?.dimensions.map((d) => d.name)).toEqual(['Real Dimension']);
  });

  it('returns null when there is no rubric', () => {
    expect(parseRubric('none', '# Just a playbook\n\nSome prose.')).toBeNull();
  });
});

describe('excluded owners', () => {
  it.each([
    ['cargo', 'windows', 'https://github.com/microsoft/windows-rs'],
    ['go', 'cloud.google.com/go', 'https://github.com/googleapis/google-cloud-go'],
    ['npm', 'prop-types', 'https://github.com/facebook/prop-types'],
    ['nuget', 'System.Text.Json', null],
    ['maven', 'com.google.guava:guava', null],
  ])('excludes %s/%s', (ecosystem, name, repository_url) => {
    expect(isExcludedOwner({ ecosystem, name, repository_url })).toBe(true);
  });

  it.each([
    ['npm', 'lodash', 'https://github.com/lodash/lodash'],
    ['rubygems', 'nokogiri', 'https://github.com/sparklemotion/nokogiri'],
    ['pypi', 'requests', 'https://github.com/psf/requests'],
  ])('keeps %s/%s', (ecosystem, name, repository_url) => {
    expect(isExcludedOwner({ ecosystem, name, repository_url })).toBe(false);
  });
});
