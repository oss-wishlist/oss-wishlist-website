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
  projectUrl,
  PACKAGE_FILTERS,
  isPackageFilter,
  filterByFlags,
  filterCounts,
} from '../src/lib/critical-packages';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
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
  isRetired,
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

  it('cites a sole maintainer for continuity, which covers burnout as well as departure', () => {
    const found = suggestedMotivations(pkg({ sole_maintainer: true }));
    expect(found).toContainEqual({ id: 'continuity', evidence: 'one maintainer listed' });
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

describe('winding down', () => {
  it('does not treat an 18 month gap as dormant', () => {
    expect(isDormant(pkg({ latest_release_published_at: monthsAgo(18) }))).toBe(false);
  });

  it('treats a two year gap as dormant', () => {
    expect(isDormant(pkg({ latest_release_published_at: monthsAgo(25) }))).toBe(true);
  });

  it('handles a package with no release date without throwing', () => {
    expect(isDormant(pkg({ latest_release_published_at: null }))).toBe(false);
  });

  /*
    It used to be reachable only by picking continuity on a project the data
    called dormant. Now it is a question in its own right, so someone can ask
    it about any project.
  */
  it('is its own question, reachable for any project', () => {
    const services = servicesForMotivations(['winding-down'], pkg({}));
    expect(services).toContain('winding-down');
  });

  it('offers succession alongside it, because handing on is often the answer', () => {
    expect(servicesForMotivations(['winding-down'], pkg({}))).toContain('leadership-onboarding');
  });

  it('no longer drags winding down in behind the continuity question', () => {
    const services = servicesForMotivations(['continuity'], pkg({ latest_release_published_at: monthsAgo(40) }));
    expect(services).toEqual(['leadership-onboarding']);
  });

  // The maintainers saying so, which the registry publishes directly.
  it.each([
    [{ status: 'deprecated' }, 'the registry lists this as deprecated'],
    [{ status: 'abandoned' }, 'the registry lists this as abandoned'],
    [{ archived: true }, 'the repository is archived'],
    [{ deprecated: true }, 'the repository is archived'],
  ])('quotes the registry for %o', (fields, expected) => {
    const found = suggestedMotivations(pkg(fields));
    expect(found).toContainEqual({ id: 'winding-down', evidence: expected });
  });

  it('prefers what the registry said over an inferred gap', () => {
    const found = suggestedMotivations(
      pkg({ status: 'deprecated', latest_release_published_at: monthsAgo(40) })
    );
    const evidence = found.find((f) => f.id === 'winding-down')!.evidence;
    expect(evidence).toBe('the registry lists this as deprecated');
  });

  // A gap is an absence, not a statement, and the wording has to stay on the
  // right side of that.
  it('states a release gap as a fact, with no conclusion attached', () => {
    const found = suggestedMotivations(pkg({ latest_release_published_at: monthsAgo(40) }));
    const evidence = found.find((f) => f.id === 'winding-down')!.evidence;
    expect(evidence).toMatch(/^no release in \d+ months$/);
    expect(evidence).not.toMatch(/abandoned|dead|dying|at risk|failing/i);
  });

  it('says nothing about a project that is simply quiet', () => {
    const found = suggestedMotivations(pkg({ latest_release_published_at: monthsAgo(20) }));
    expect(found.find((f) => f.id === 'winding-down')).toBeUndefined();
  });

  it('isRetired reads all three ways a registry says it', () => {
    expect(isRetired({ status: 'deprecated' })).toBe(true);
    expect(isRetired({ archived: true })).toBe(true);
    expect(isRetired({ deprecated: true })).toBe(true);
    expect(isRetired({})).toBe(false);
    expect(isRetired(null)).toBe(false);
  });
});

describe('every playbook is reachable', () => {
  const catalogue = readdirSync(join(process.cwd(), 'src/content/services'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));

  const offered = new Set(MOTIVATIONS.flatMap((m) => m.services));

  it('there is a catalogue to check', () => {
    expect(catalogue.length).toBeGreaterThan(0);
  });

  // The reason for the rewrite: digital sovereignty, AI policy and hosting
  // could not be reached by answering any question.
  it.each(['ai-consent-framework', 'digital-sovereignty', 'hosting-infrastructure', 'winding-down'])(
    '%s is reachable',
    (slug) => {
      expect(offered.has(slug)).toBe(true);
    }
  );

  it('leaves no service unreachable', () => {
    expect(catalogue.filter((slug) => !offered.has(slug))).toEqual([]);
  });

  it('offers no service the catalogue does not have', () => {
    expect([...offered].filter((slug) => !catalogue.includes(slug))).toEqual([]);
  });

  it('asks a question for each, phrased as a question', () => {
    for (const m of MOTIVATIONS) {
      expect(m.services.length).toBeGreaterThan(0);
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.question.length).toBeGreaterThan(0);
    }
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

/*
  ecosyste.ms sends the repository's community files inside repo_metadata on
  the critical record, so these cost no extra request. The three-state handling
  is the part worth pinning: a package cached before this existed has no file
  listing, and reading that as "absent" would put "no SECURITY.md" on every
  record in the cache.
*/
describe('community files as evidence', () => {
  const withFiles = (files: Record<string, boolean>) => pkg({ files });
  const evidenceFor = (p: any, id: string) =>
    suggestedMotivations(p).find((m) => m.id === id)?.evidence;

  it('says nothing when the file listing was never fetched', () => {
    const old = pkg({});
    expect(old.files).toBeUndefined();
    for (const id of ['security', 'moderation', 'ai-policy', 'contributors']) {
      expect(evidenceFor(old, id)).toBeUndefined();
    }
  });

  it('says nothing about a file that is present', () => {
    const p = withFiles({ security: true, code_of_conduct: true, contributing: true, agents: true });
    for (const id of ['moderation', 'ai-policy', 'contributors']) {
      expect(evidenceFor(p, id)).toBeUndefined();
    }
  });

  it('reports a missing SECURITY.md against CRA readiness', () => {
    expect(evidenceFor(withFiles({ security: false }), 'security')).toContain('SECURITY.md');
  });

  it('reports a missing AGENTS.md as no published position on AI use', () => {
    expect(evidenceFor(withFiles({ agents: false }), 'ai-policy')).toContain('AGENTS.md');
  });

  it('reports a missing CONTRIBUTING guide against contributors', () => {
    expect(evidenceFor(withFiles({ contributing: false }), 'contributors')).toContain('CONTRIBUTING');
  });

  // A code of conduct is a moderation instrument and part of how a community
  // governs itself, so it counts for both questions.
  it('counts a missing code of conduct for moderation and governance alike', () => {
    const p = withFiles({ code_of_conduct: false });
    expect(evidenceFor(p, 'moderation')).toBe('no code of conduct published');
    expect(evidenceFor(p, 'governance')).toContain('no code of conduct published');
  });

  it('states both reasons when a question rests on two signals', () => {
    const p = pkg({ sole_maintainer: true, files: { code_of_conduct: false } });
    const governance = evidenceFor(p, 'governance')!;
    expect(governance).toContain('one maintainer');
    expect(governance).toContain('code of conduct');
  });

  // Governance files appear on 1% of critical packages, so absence proves
  // nothing and is deliberately not read.
  it('draws no conclusion from a missing GOVERNANCE.md', () => {
    const p = withFiles({ governance: false, code_of_conduct: true });
    expect(evidenceFor(p, 'governance')).toBeUndefined();
  });

  it('treats an empty file listing as known-absent, not unknown', () => {
    expect(evidenceFor(withFiles({}), 'ai-policy')).toContain('AGENTS.md');
  });
});

/*
  Activity, windowed to the past year. total_committers and dds are lifetime
  figures: lodash reports 265 committers and has not merged a patch in a long
  while, so neither answers the question continuity asks.
*/
describe('activity as continuity evidence', () => {
  const evidenceFor = (fields: Record<string, unknown>) =>
    suggestedMotivations(pkg(fields)).find((m) => m.id === 'continuity')?.evidence;

  it('says nothing for a package cached before activity was collected', () => {
    expect(evidenceFor({ sole_maintainer: false })).toBeUndefined();
  });

  // requests: many owners listed historically, one person active now.
  it('reports a single active maintainer even when ownership looks shared', () => {
    expect(evidenceFor({ sole_maintainer: false, active_maintainer_count: 1 })).toBe(
      'one person active in the past year'
    );
  });

  it('reports a small team, and says nothing about a large one', () => {
    expect(evidenceFor({ active_maintainer_count: 3 })).toContain('3 people active');
    expect(evidenceFor({ active_maintainer_count: 9 })).toBeUndefined();
  });

  // lodash: 88 people sent pull requests, Scorecard scores Maintained at 0.
  it('reports a Scorecard Maintained score of zero', () => {
    expect(evidenceFor({ scorecard_maintained: 0 })).toContain('no recent maintenance activity');
  });

  it('says nothing about a maintained project', () => {
    expect(evidenceFor({ active_maintainer_count: 9, scorecard_maintained: 10 })).toBeUndefined();
  });

  it('states every reason that applies', () => {
    const evidence = evidenceFor({
      sole_maintainer: true,
      active_maintainer_count: 1,
      scorecard_maintained: 0,
    })!;
    expect(evidence).toContain('one maintainer listed');
    expect(evidence).toContain('one person active');
    expect(evidence).toContain('no recent maintenance activity');
  });

  // Scorecard uses -1 for a check it could not run, and the fetcher stores null
  // for that. A check that did not run is not a score of zero.
  it('treats a check that did not run as unknown', () => {
    expect(evidenceFor({ scorecard_maintained: null })).toBeUndefined();
  });
});

/*
  The flags were labels inside each card that led nowhere, inviting a click
  that did nothing. They are filters at the top of step 1 now, and the cards
  keep them as labels.
*/
describe('narrowing by flag', () => {
  const p = (fields: Record<string, unknown>) => pkg(fields);
  const solo = p({ sole_maintainer: true });
  const broke = p({ unfunded: true });
  const both = p({ sole_maintainer: true, unfunded: true });
  const neither = p({});
  const all = [solo, broke, both, neither];

  it('returns everything when nothing is selected', () => {
    expect(filterByFlags(all, [])).toHaveLength(4);
  });

  it('keeps the packages carrying the flag', () => {
    expect(filterByFlags(all, ['sole_maintainer'])).toEqual([solo, both]);
  });

  // Narrowing, because someone picking two wants where both are true.
  it('narrows rather than widens when two are selected', () => {
    expect(filterByFlags(all, ['sole_maintainer', 'unfunded'])).toEqual([both]);
  });

  it('can select nothing at all, which the page has to handle', () => {
    expect(filterByFlags(all, ['sole_maintainer', 'has_advisories'])).toEqual([]);
  });

  it('counts each flag across the set', () => {
    const counts = filterCounts(all);
    expect(counts.sole_maintainer).toBe(2);
    expect(counts.unfunded).toBe(2);
  });

  // A filter offered at zero is a dead end, and the page hides those.
  it('reports zero for a flag nothing carries, so it can be left out', () => {
    expect(filterCounts(all).has_advisories).toBe(0);
  });

  it('only accepts the flags it offers', () => {
    for (const f of PACKAGE_FILTERS) expect(isPackageFilter(f.id)).toBe(true);
    expect(isPackageFilter('sole_maintainer; DROP TABLE')).toBe(false);
    expect(isPackageFilter('')).toBe(false);
    expect(isPackageFilter(null)).toBe(false);
  });

  /*
    A filter id has to be a flag the cards actually carry. A typo here would
    produce a filter that counts zero forever, so the page would hide it and
    nobody would notice it was broken.
  */
  it('every filter names a flag the cards can carry', () => {
    const counted = Object.keys(filterCounts([pkg({})]));
    for (const f of PACKAGE_FILTERS) expect(counted).toContain(f.id);
  });
});

/*
  ecosyste.ms reports whatever a package declared, and old packages declared
  hosts that have since closed. net.sf.ehcache:ehcache-core points at
  svn.terracotta.org, which no longer resolves, so the project link opened a
  connection error.
*/
describe('projectUrl', () => {
  const maven = (repository_url: string | null) => ({
    ecosystem: 'maven',
    name: 'net.sf.ehcache:ehcache-core',
    repository_url,
  });

  it('links the repository on a forge we recognise', () => {
    expect(projectUrl({ ecosystem: 'npm', name: 'lodash', repository_url: 'https://github.com/lodash/lodash' }))
      .toBe('https://github.com/lodash/lodash');
  });

  // The reported case.
  it('does not link a host that no longer resolves', () => {
    const url = projectUrl(maven('https://svn.terracotta.org/svn/ehcache/trunk'))!;
    expect(url).not.toContain('terracotta');
    // Maven's registry page, carrying the coordinates from the package name.
    expect(url).toBe('https://central.sonatype.com/artifact/net.sf.ehcache/ehcache-core');
  });

  it.each([
    'https://java.net/projects/thing',
    'https://fisheye.jboss.org/browse/thing',
    'https://args4j.kohsuke.org/source-repository.html',
    'https://git.jcraft.com/thing',
  ])('falls back to the registry for %s', (dead) => {
    expect(projectUrl(maven(dead))).not.toContain(new URL(dead).hostname);
  });

  it('keeps the forges that are alive but less common', () => {
    for (const host of ['gitbox.apache.org', 'svn.apache.org', 'cs.opensource.google', 'go.googlesource.com']) {
      const url = `https://${host}/thing`;
      expect(projectUrl(maven(url))).toBe(url);
    }
  });

  it('refuses a scheme a browser cannot open', () => {
    for (const bad of ['git://github.com/a/b', 'svn+ssh://example.com/x', 'javascript:alert(1)']) {
      expect(projectUrl(maven(bad))).not.toBe(bad);
    }
  });

  it('always returns somewhere to go', () => {
    for (const eco of ['npm', 'pypi', 'rubygems', 'cargo', 'packagist', 'nuget', 'go', 'maven']) {
      const url = projectUrl({ ecosystem: eco, name: eco === 'maven' ? 'g:a' : 'thing', repository_url: null });
      expect(url).toMatch(/^https:\/\//);
    }
  });
});
