/**
 * Read-side access to the cached ecosyste.ms data.
 *
 * The JSON is imported, not fetched, so it is bundled at build time and the
 * site serves with the network disabled. Nothing here calls ecosyste.ms.
 *
 * Data: https://ecosyste.ms — CC-BY-SA-4.0. Every page rendering this data
 * must carry visible attribution.
 */

import criticalData from '../../data/critical.json';
import metaData from '../../data/_meta.json';
import optoutData from '../../data/optout.json';
import { flagsFor, servicesFor } from '../../config/service-map.js';
import { hasRecentAdvisories } from '../../config/advisories.js';
import { isExcludedOwner } from '../../config/excluded-owners.js';
import { FEATURED_PACKAGES } from '../../config/featured.js';

export interface Maintainer {
  login: string | null;
  name: string | null;
  /** Public registry profile page. Never an email route — see safeProfileUrl(). */
  profile_url: string | null;
}

export interface Advisory {
  /** Usually a GHSA id; whatever the source lists first. */
  id: string | null;
  cve: string | null;
  title: string | null;
  severity: string | null;
  /** Canonical advisory page. Never a mailto, see safeProfileUrl() in the fetcher. */
  url: string | null;
  published_at: string | null;
}

export interface CriticalPackage {
  name: string;
  ecosystem: string;
  purl: string | null;
  description: string | null;
  repository_url: string | null;
  downloads: number | null;
  dependent_repos_count: number | null;
  funding_links: string[] | null;
  latest_release_published_at: string | null;
  licenses: string | null;
  maintainers: Maintainer[];
  advisory_count: number;
  has_advisories: boolean;
  advisories: Advisory[];
  sole_maintainer: boolean;
  unfunded: boolean;
  quiet: boolean;
}

export interface DataMeta {
  fetched_at: string;
  attribution: string;
  license: string;
  sources: string[];
  registries: string[];
  cap: number;
  counts: {
    total: number;
    sole_maintainer: number;
    unfunded: number;
    has_advisories: number;
    quiet: number;
    per_registry: Record<string, number>;
  };
}

interface OptOutEntry {
  ecosystem: string;
  name: string;
}

/** Stable identity for a package across the cache, /check results and opt-outs. */
export const packageKey = (ecosystem: string, name: string) => `${ecosystem}/${name}`;

/**
 * Opt-outs are honoured here as well as at fetch time. Enforcing it on the read
 * side too means an entry added to data/optout.json takes effect on the next
 * build across every surface — /fund, /check, package pages and the sitemap —
 * without waiting for the weekly refresh.
 */
const optedOut = new Set(
  (optoutData as OptOutEntry[]).map((e) => packageKey(e.ecosystem, e.name))
);

const allPackages: CriticalPackage[] = (criticalData as CriticalPackage[]).filter(
  (p) => !optedOut.has(packageKey(p.ecosystem, p.name)) && !isExcludedOwner(p)
);

export const meta = metaData as DataMeta;

/** Every cached package, minus opt-outs. Fetch order is already deterministic. */
/**
 * Facts a visitor can narrow the list by.
 *
 * The same flags the cards show, offered once at the top of the page. They were
 * chips inside each card and led nowhere, which invited a click that did
 * nothing. A fact is a label where it describes one project and a filter where
 * it selects many, and those belong in different places.
 *
 * Labels here are fixed, unlike the card chips, which take their wording from
 * the package (a release year, an advisory count).
 */
export const PACKAGE_FILTERS = [
  { id: 'sole_maintainer', label: 'One maintainer' },
  { id: 'unfunded', label: 'No clear funding pathway' },
  { id: 'has_advisories', label: 'Recent security advisories' },
  { id: 'quiet', label: 'No recent release' },
] as const;

export type PackageFilterId = (typeof PACKAGE_FILTERS)[number]['id'];

export function isPackageFilter(value: string | null): value is PackageFilterId {
  return PACKAGE_FILTERS.some((f) => f.id === value);
}

/**
 * Packages carrying every selected flag.
 *
 * Narrowing rather than widening, because someone picking two is looking for
 * the projects where both are true.
 */
export function filterByFlags(
  packages: CriticalPackage[],
  flags: readonly string[]
): CriticalPackage[] {
  if (flags.length === 0) return packages;
  return packages.filter((pkg) => {
    const present = flagsFor(pkg) as string[];
    return flags.every((flag) => present.includes(flag));
  });
}

/** How many packages each filter would leave, so none is offered at zero. */
export function filterCounts(packages: CriticalPackage[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const filter of PACKAGE_FILTERS) counts[filter.id] = 0;
  for (const pkg of packages) {
    for (const flag of flagsFor(pkg) as string[]) {
      if (flag in counts) counts[flag] += 1;
    }
  }
  return counts;
}

export function getAllPackages(): CriticalPackage[] {
  return allPackages;
}

/** Alphabetical, for the "see all" view. Never sorted by severity, never ranked. */
export function getAllPackagesAlphabetical(): CriticalPackage[] {
  return [...allPackages].sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    return byName !== 0 ? byName : a.ecosystem.localeCompare(b.ecosystem);
  });
}

export function getPackage(ecosystem: string, name: string): CriticalPackage | undefined {
  const key = packageKey(ecosystem, name);
  return allPackages.find((p) => packageKey(p.ecosystem, p.name) === key);
}

/**
 * A random sample, reshuffled on every call. /fund draws a fresh set on each
 * page load and on "show another set" — there is no daily seed and no fixed
 * order, so no package sits at the top of a list and none is ranked above
 * another.
 *
 * Partial Fisher-Yates over a copy: O(n) and unbiased.
 */
export function samplePackages(count: number, pool = allPackages): CriticalPackage[] {
  const take = Math.min(count, pool.length);
  const copy = [...pool];
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, take);
}

/** Counts for the generated headline. Computed from the data, never hand-edited. */
export function getCounts() {
  return {
    total: allPackages.length,
    sole_maintainer: allPackages.filter((p) => p.sole_maintainer).length,
    unfunded: allPackages.filter((p) => p.unfunded).length,
    quiet: allPackages.filter((p) => p.quiet).length,
    has_advisories: allPackages.filter((p) => p.has_advisories).length,
    /**
     * How many packages we actually hold maintainer data for. Go and Maven have
     * no registry maintainer accounts, so `sole_maintainer` can only ever be
     * false for them — stating it against the full total would overstate how
     * many critical packages have more than one maintainer.
     */
    with_maintainer_data: allPackages.filter((p) => p.maintainers.length > 0).length,
  };
}


/**
 * Registries, with the label a visitor would recognise rather than the internal
 * ecosystem key. Order is the order they are offered in.
 */
export const ECOSYSTEMS = [
  { id: 'npm', label: 'npm', language: 'JavaScript', registry: 'npmjs.org' },
  { id: 'pypi', label: 'PyPI', language: 'Python', registry: 'pypi.org' },
  { id: 'maven', label: 'Maven', language: 'Java', registry: 'repo1.maven.org' },
  { id: 'go', label: 'Go modules', language: 'Go', registry: 'proxy.golang.org' },
  { id: 'rubygems', label: 'RubyGems', language: 'Ruby', registry: 'rubygems.org' },
  { id: 'cargo', label: 'crates.io', language: 'Rust', registry: 'crates.io' },
  { id: 'packagist', label: 'Packagist', language: 'PHP', registry: 'packagist.org' },
  { id: 'nuget', label: 'NuGet', language: '.NET', registry: 'nuget.org' },
] as const;

/**
 * The full critical list on ecosyste.ms. We cache a slice of it, so anyone who
 * wants the whole thing should be sent to the source rather than being given a
 * directory here.
 */
export function criticalListUrl(ecosystem: EcosystemId | null): string {
  const entry = ECOSYSTEMS.find((e) => e.id === ecosystem);
  return entry
    ? `https://packages.ecosyste.ms/critical?registry=${entry.registry}`
    : 'https://packages.ecosyste.ms/critical';
}

export type EcosystemId = (typeof ECOSYSTEMS)[number]['id'];

export function isEcosystemId(value: string | null): value is EcosystemId {
  return ECOSYSTEMS.some((e) => e.id === value);
}

const hasAnyFlag = (p: CriticalPackage) =>
  // Recency, to match the fact shown: a package whose only advisory is from
  // 2019 carries no flag any more, and its card would show nothing.
  p.sole_maintainer || p.unfunded || p.quiet || hasRecentAdvisories(p);

/** Below this a pool is too thin to feel random, so widen rather than repeat. */
const SAMPLE_FALLBACK_MIN = 24;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The "worth showing first" threshold, computed per registry.
 *
 * Dependent counts are not comparable across registries: npm's median package
 * has 2.6 million dependent repos while NuGet's has none recorded. A single
 * absolute cutoff looked fine across the whole set but collapsed once the page
 * was split by registry, leaving NuGet with nothing at all to show. Each
 * registry is therefore measured against its own median.
 */
const medianDependents = new Map<string, number>();
for (const { id } of ECOSYSTEMS) {
  const inEcosystem = allPackages.filter((p) => p.ecosystem === id);
  medianDependents.set(id, median(inEcosystem.map((p) => p.dependent_repos_count ?? 0)));
}

/**
 * The set the page samples from: packages carrying at least one flag, and more
 * depended on than the typical package in their own registry. That card makes
 * the argument on its own, which is all most visitors will read.
 *
 * A sampling pool, not a ranking. Nothing is ordered by it and no score shown.
 */
export function getHeadlinePool(ecosystem: EcosystemId | null): CriticalPackage[] {
  const base = ecosystem ? allPackages.filter((p) => p.ecosystem === ecosystem) : allPackages;
  const pool = base.filter(
    (p) => hasAnyFlag(p) && (p.dependent_repos_count ?? 0) >= (medianDependents.get(p.ecosystem) ?? 0)
  );
  if (pool.length >= SAMPLE_FALLBACK_MIN) return pool;

  // Widen a step at a time rather than ever rendering an empty page.
  const flagged = base.filter(hasAnyFlag);
  return flagged.length >= SAMPLE_FALLBACK_MIN ? flagged : base;
}

/**
 * The curated set shown before a package manager is chosen.
 *
 * Resolved against the live cache, so an entry that has dropped out or opted
 * out simply disappears rather than 404ing from the front page. Order follows
 * config/featured.js.
 */
export function getFeaturedPackages(): CriticalPackage[] {
  return (FEATURED_PACKAGES as Array<{ ecosystem: string; name: string }>)
    .map((entry) => getPackage(entry.ecosystem, entry.name))
    .filter((p): p is CriticalPackage => Boolean(p));
}

/**
 * Search the cached packages by name, and by description as a fallback.
 *
 * Runs entirely against the bundled data: no network call, no database, no
 * rate limit. A substring scan over a few thousand records costs microseconds,
 * so this is not a load concern the way resolving a dependency tree would be.
 *
 * Ordering is by how well the name matches, which is relevance for a query the
 * visitor typed, not a ranking of the projects against each other.
 */
export function searchPackages(
  query: string,
  ecosystem: EcosystemId | null = null,
  limit = 24
): CriticalPackage[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const base = ecosystem ? allPackages.filter((p) => p.ecosystem === ecosystem) : allPackages;

  const scored: Array<{ pkg: CriticalPackage; score: number }> = [];
  for (const pkg of base) {
    const name = pkg.name.toLowerCase();
    let score = -1;

    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.includes(q)) score = 2;
    else if ((pkg.description ?? '').toLowerCase().includes(q)) score = 3;

    if (score >= 0) scored.push({ pkg, score });
  }

  scored.sort((a, b) =>
    a.score !== b.score ? a.score - b.score : a.pkg.name.localeCompare(b.pkg.name)
  );

  return scored.slice(0, limit).map((s) => s.pkg);
}

/** Total matches for a query, so the page can say when it truncated the list. */
export function countSearchMatches(query: string, ecosystem: EcosystemId | null = null): number {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return 0;
  const base = ecosystem ? allPackages.filter((p) => p.ecosystem === ecosystem) : allPackages;
  return base.filter(
    (p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
  ).length;
}

/** How many packages each registry has, for the picker. */
export function getEcosystemCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { id } of ECOSYSTEMS) {
    counts[id] = allPackages.filter((p) => p.ecosystem === id).length;
  }
  return counts;
}

/**
 * Keep only the recognised filter ids, in a stable order and without duplicates,
 * so a hand-edited or stale query string cannot produce a strange page.
 */
export function parseFilters(values: string[]): FilterId[] {
  return FILTERS.map((f) => f.id).filter((id) => values.includes(id));
}

/**
 * The pool a sample is drawn from. Filters combine with AND: asking for one
 * maintainer *and* no funding link gives the packages that are both, which is a
 * smaller set than either alone. No filters, or only unrecognised ones, gives
 * every package — a bad query string degrades to the full page, never an empty one.
 */
export function getPool(filters: FilterId[], ecosystem: EcosystemId | null = null): CriticalPackage[] {
  const base = ecosystem ? allPackages.filter((p) => p.ecosystem === ecosystem) : allPackages;
  if (filters.length === 0) return base;
  return base.filter((p) => filters.every((f) => p[f]));
}

/**
 * Where to send someone who wants to look at the project itself.
 *
 * Prefers the repository, and falls back to the registry page, because 208 of
 * the cached packages publish no repository URL at all (mostly NuGet and Maven)
 * and a name with nowhere to click is a dead end.
 */
export function projectUrl(pkg: Pick<CriticalPackage, 'ecosystem' | 'name' | 'repository_url'>): string | null {
  // Only a URL a browser can actually open. A few legacy records carry
  // svn+ssh:// and git:// locations, which would render as a dead link.
  if (pkg.repository_url && /^https?:\/\//i.test(pkg.repository_url)) return pkg.repository_url;

  const name = pkg.name;
  switch (pkg.ecosystem) {
    case 'npm':
      return `https://www.npmjs.com/package/${name}`;
    case 'pypi':
      return `https://pypi.org/project/${encodeURIComponent(name)}/`;
    case 'rubygems':
      return `https://rubygems.org/gems/${encodeURIComponent(name)}`;
    case 'cargo':
      return `https://crates.io/crates/${encodeURIComponent(name)}`;
    case 'packagist':
      return `https://packagist.org/packages/${name}`;
    case 'nuget':
      return `https://www.nuget.org/packages/${encodeURIComponent(name)}`;
    case 'go':
      return `https://pkg.go.dev/${name}`;
    case 'maven': {
      // Maven names are "group:artifact".
      const [group, artifact] = name.split(':');
      return group && artifact
        ? `https://central.sonatype.com/artifact/${encodeURIComponent(group)}/${encodeURIComponent(artifact)}`
        : null;
    }
    default:
      return null;
  }
}

/** Everything a card or package page needs, including its suggested services. */
export function presentPackage(pkg: CriticalPackage) {
  return {
    ...pkg,
    key: packageKey(pkg.ecosystem, pkg.name),
    href: packageHref(pkg),
    flags: flagsFor(pkg) as string[],
    serviceSlugs: servicesFor(pkg) as string[],
  };
}

export type PresentedPackage = ReturnType<typeof presentPackage>;

/**
 * Package pages live at /p/:ecosystem/:name. Names legitimately contain slashes
 * and @ (npm scopes like @babel/core, Maven group:artifact), so the name is
 * encoded per path segment and the route uses a rest parameter.
 */
export function packageHref(pkg: Pick<CriticalPackage, 'ecosystem' | 'name'>): string {
  const name = pkg.name.split('/').map(encodeURIComponent).join('/');
  return `/p/${encodeURIComponent(pkg.ecosystem)}/${name}`;
}
