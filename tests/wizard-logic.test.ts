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
import {
  recentAdvisories,
  recentAdvisoryCount,
  recentAdvisoryLabel,
  hasRecentAdvisories,
} from '../config/advisories.js';
import { advisoriesUrl, factsFor } from '../config/service-map.js';
import { avatarThumb } from '../src/lib/avatar';

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

  const advisory = (daysAgo: number) => ({
    id: `GHSA-${daysAgo}`,
    cve: null,
    title: 'an issue',
    severity: 'LOW',
    url: `https://github.com/advisories/GHSA-${daysAgo}`,
    published_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  });

  it('cites recent disclosure activity for security', () => {
    const found = suggestedMotivations(
      pkg({ has_advisories: true, advisory_count: 7, advisories: [advisory(5), advisory(40)] })
    );
    expect(found).toContainEqual({
      id: 'security',
      evidence: '2 security advisories published in the last year',
    });
  });

  it('says "advisory" rather than "advisories" for a single one', () => {
    const found = suggestedMotivations(
      pkg({ has_advisories: true, advisory_count: 1, advisories: [advisory(5)] })
    );
    expect(found[0].evidence).toBe('1 security advisory published in the last year');
  });

  /*
    drupal/core reported "100 known security issues" from a field that is the
    API's ceiling on a lifetime history, almost all of it long fixed. Security
    is suggested on recent activity now, and an old history suggests nothing.
  */
  it('suggests nothing from a lifetime count with no recent advisories', () => {
    const found = suggestedMotivations(
      pkg({ has_advisories: true, advisory_count: 100, advisories: [advisory(900), advisory(1500)] })
    );
    expect(found.find((f) => f.id === 'security')).toBeUndefined();
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

describe('avatarThumb', () => {
  it('asks GitHub for the size it will actually display', () => {
    expect(avatarThumb('https://avatars.githubusercontent.com/u/123?v=4', 96)).toBe(
      'https://avatars.githubusercontent.com/u/123?v=4&s=96'
    );
  });

  it('replaces a size already on the URL rather than appending a second one', () => {
    const out = avatarThumb('https://avatars.githubusercontent.com/u/123?s=460', 96)!;
    expect(out).toContain('s=96');
    expect(out).not.toContain('s=460');
  });

  it('uses the parameter each host actually understands', () => {
    expect(avatarThumb('https://gitlab.com/uploads/avatar.png', 96)).toContain('width=96');
    expect(avatarThumb('https://www.gravatar.com/avatar/abc', 96)).toContain('s=96');
  });

  it('leaves a host with no known resize convention untouched', () => {
    const url = 'https://example.com/me.png';
    expect(avatarThumb(url, 96)).toBe(url);
  });

  it('returns null for a missing avatar so nothing renders', () => {
    expect(avatarThumb(null, 96)).toBeNull();
    expect(avatarThumb(undefined, 96)).toBeNull();
    expect(avatarThumb('', 96)).toBeNull();
  });

  it('refuses a non-http scheme', () => {
    expect(avatarThumb('javascript:alert(1)', 96)).toBeNull();
    expect(avatarThumb('data:image/png;base64,AAAA', 96)).toBeNull();
  });
});

describe('recent advisories', () => {
  const iso = (daysAgo: number) =>
    new Date(Date.now() - daysAgo * 86400000).toISOString();

  const pkg = (published: (string | null)[]) => ({
    ecosystem: 'packagist',
    name: 'drupal/core',
    advisory_count: 100,
    has_advisories: true,
    advisories: published.map((p, i) => ({
      id: `GHSA-${i}`,
      cve: null,
      title: `issue ${i}`,
      severity: 'LOW',
      url: `https://github.com/advisories/GHSA-${i}`,
      published_at: p,
    })),
  });

  it('counts only what is inside the window', () => {
    expect(recentAdvisoryCount(pkg([iso(10), iso(100), iso(800), iso(2000)]))).toBe(2);
  });

  // The reported bug: 100 is the API's ceiling, not a count, and the entries
  // are a project's whole disclosure history rather than open problems.
  it('does not report the capped lifetime total', () => {
    const label = recentAdvisoryLabel(pkg([iso(5), ...Array(99).fill(iso(3000))]));
    expect(label).toBe('1 security advisory published in the last year');
    expect(label).not.toContain('100');
  });

  it('says nothing when the history is all old, rather than showing a zero', () => {
    expect(recentAdvisoryLabel(pkg([iso(900), iso(1200)]))).toBeNull();
    expect(hasRecentAdvisories(pkg([iso(900)]))).toBe(false);
  });

  it('leaves out an advisory with no publication date', () => {
    expect(recentAdvisoryCount(pkg([null, iso(10)]))).toBe(1);
  });

  it('returns them newest first', () => {
    const out = recentAdvisories(pkg([iso(100), iso(5), iso(50)]));
    const dates = out.map((a) => a.published_at!);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('gives a single advisory its own link, and several the package page', () => {
    expect(advisoriesUrl(pkg([iso(5)]))).toBe('https://github.com/advisories/GHSA-0');
    expect(advisoriesUrl(pkg([iso(5), iso(6)]))).toBe(
      'https://packages.ecosyste.ms/registries/packagist.org/packages/drupal%2Fcore'
    );
  });

  it('every fact carrying a number has somewhere to check it', () => {
    for (const fact of factsFor(pkg([iso(5), iso(6)]))) {
      if (/\d/.test(fact.text)) expect(fact.href).toBeTruthy();
    }
  });
});
