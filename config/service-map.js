/**
 * Flag -> service map.
 *
 * The one place that decides which services get suggested for a package. Values
 * are slugs in src/content/services/. Nothing here is scored, ranked or
 * weighted: a package carries some plain facts, and each fact has services that
 * address it.
 *
 * The ask is always "sponsor a service for this package" — never "give money to
 * this maintainer". Suggested services link to their existing service page,
 * which is where practitioners already are.
 *
 * If you add a service to the catalog, add it here or it will never be suggested.
 */

import {
  hasRecentAdvisories,
  recentAdvisoryLabel,
  recentAdvisories as recentAdvisoriesOf,
} from './advisories.js';

export const SERVICE_MAP = {
  // One person is listed as the sole maintainer.
  sole_maintainer: ['governance-setup', 'leadership-onboarding', 'maintainer-task-contributor'],

  // No funding link published on the package.
  unfunded: ['funding-strategy'],

  // Published a security advisory in the last year. Deliberately a recent
  // window rather than the lifetime total; see config/advisories.js.
  has_advisories: ['dependency-security-audit'],

  // No release in QUIET_AFTER_MONTHS. Wind-down is offered last: it is a real
  // option a maintainer may want, not a verdict on the project.
  quiet: ['maintainer-task-contributor', 'leadership-onboarding', 'winding-down'],
};

/** Suggested when a package carries none of the flags above. */
export const DEFAULT_SERVICES = ['general-need'];

/**
 * Human-readable, non-judgemental phrasing for each flag. These strings are what
 * appears on a card. Facts, not assessments — no "at risk", no "failing", no
 * scores. `quiet` takes the year of the last release, so it reads as a date
 * rather than a verdict.
 */
export const FLAG_LABELS = {
  sole_maintainer: () => 'one maintainer',
  // A missing funding link is only interesting because of what it means for
  // the visitor: there is nowhere obvious to send money.
  unfunded: () => 'no clear funding or sponsorship pathway',
  // Disclosure activity in the last year, not the lifetime total. "N known
  // security issues" read as N unfixed holes, when the list is a project's
  // whole disclosure history and almost all of it is patched.
  has_advisories: (pkg) => recentAdvisoryLabel(pkg),
  quiet: (pkg) => {
    const year = pkg.latest_release_published_at
      ? new Date(pkg.latest_release_published_at).getUTCFullYear()
      : null;
    return year ? `no release since ${year}` : 'no release date recorded';
  },
};

export const FLAGS = Object.keys(SERVICE_MAP);

/*
  Most flags are a stored boolean. `has_advisories` is not: the cached field is
  true for any advisory ever published, and the fact we show is about the last
  year, so the flag has to be derived the same way the label is or a package
  could carry the flag while the label says nothing.
*/
const FLAG_PRESENT = {
  sole_maintainer: (pkg) => Boolean(pkg.sole_maintainer),
  unfunded: (pkg) => Boolean(pkg.unfunded),
  has_advisories: (pkg) => hasRecentAdvisories(pkg),
  quiet: (pkg) => Boolean(pkg.quiet),
};

/** The flags a package actually carries, in a stable order. */
export function flagsFor(pkg) {
  return FLAGS.filter((flag) => FLAG_PRESENT[flag](pkg));
}

/**
 * Service slugs suggested for a package: the union of its flags' services in
 * map order, deduped, falling back to the catalog's baseline offering.
 */
export function servicesFor(pkg) {
  const slugs = [];
  for (const flag of flagsFor(pkg)) {
    for (const slug of SERVICE_MAP[flag]) {
      if (!slugs.includes(slug)) slugs.push(slug);
    }
  }
  return slugs.length ? slugs : [...DEFAULT_SERVICES];
}

/** Card-ready fact strings for a package. */
export function labelsFor(pkg) {
  return flagsFor(pkg)
    .map((flag) => FLAG_LABELS[flag](pkg))
    .filter(Boolean);
}

/**
 * The same facts, each with somewhere to check it.
 *
 * A claim about a project with no way to verify it is an accusation, so any
 * fact that carries a number has to carry its evidence. Only the advisory fact
 * has an external source today; the rest return a null href and render as
 * plain text.
 */
export function factsFor(pkg) {
  return flagsFor(pkg)
    .map((flag) => {
      const text = FLAG_LABELS[flag](pkg);
      if (!text) return null;
      return { flag, text, href: flag === 'has_advisories' ? advisoriesUrl(pkg) : null };
    })
    .filter(Boolean);
}

/**
 * Where to see a package's advisories.
 *
 * One advisory links straight to itself. Several link to the ecosyste.ms page
 * for the package, which lists them, because there is no single upstream page
 * that collects advisories across registries.
 */
export function advisoriesUrl(pkg) {
  const recent = recentAdvisoriesOf(pkg);
  if (recent.length === 1 && recent[0].url) return recent[0].url;

  const registry = REGISTRY_FOR_ECOSYSTEM[pkg?.ecosystem];
  if (!registry || !pkg?.name) return null;
  return `https://packages.ecosyste.ms/registries/${registry}/packages/${encodeURIComponent(pkg.name)}`;
}

/** Cached records carry the short ecosystem name; ecosyste.ms URLs want the registry host. */
const REGISTRY_FOR_ECOSYSTEM = {
  npm: 'npmjs.org',
  pypi: 'pypi.org',
  rubygems: 'rubygems.org',
  cargo: 'crates.io',
  go: 'proxy.golang.org',
  maven: 'repo1.maven.org',
  packagist: 'packagist.org',
  nuget: 'nuget.org',
};
