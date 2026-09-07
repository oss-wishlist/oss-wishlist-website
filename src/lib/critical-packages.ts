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
import { flagsFor, labelsFor, servicesFor } from '../../config/service-map.js';
import { isExcludedOwner } from '../../config/excluded-owners.js';

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

/** The flags a visitor can narrow /fund by. */
export const FILTERS = [
  { id: 'sole_maintainer', label: 'One maintainer' },
  { id: 'unfunded', label: 'No funding link' },
  { id: 'quiet', label: 'No release in 18 months' },
] as const;

export type FilterId = (typeof FILTERS)[number]['id'];

export function isFilterId(value: string | null): value is FilterId {
  return FILTERS.some((f) => f.id === value);
}

/**
 * Registries, with the label a visitor would recognise rather than the internal
 * ecosystem key. Order is the order they are offered in.
 */
export const ECOSYSTEMS = [
  { id: 'npm', label: 'npm', language: 'JavaScript' },
  { id: 'pypi', label: 'PyPI', language: 'Python' },
  { id: 'maven', label: 'Maven', language: 'Java' },
  { id: 'go', label: 'Go modules', language: 'Go' },
  { id: 'rubygems', label: 'RubyGems', language: 'Ruby' },
  { id: 'cargo', label: 'crates.io', language: 'Rust' },
  { id: 'packagist', label: 'Packagist', language: 'PHP' },
  { id: 'nuget', label: 'NuGet', language: '.NET' },
] as const;

export type EcosystemId = (typeof ECOSYSTEMS)[number]['id'];

export function isEcosystemId(value: string | null): value is EcosystemId {
  return ECOSYSTEMS.some((e) => e.id === value);
}

const hasAnyFlag = (p: CriticalPackage) =>
  p.sole_maintainer || p.unfunded || p.quiet || p.has_advisories;

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

/** Everything a card or package page needs, including its suggested services. */
export function presentPackage(pkg: CriticalPackage) {
  return {
    ...pkg,
    key: packageKey(pkg.ecosystem, pkg.name),
    href: packageHref(pkg),
    flags: flagsFor(pkg) as string[],
    labels: labelsFor(pkg) as string[],
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
