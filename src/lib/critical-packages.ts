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

export interface Maintainer {
  login: string | null;
  name: string | null;
  /** Public registry profile page. Never an email route — see safeProfileUrl(). */
  profile_url: string | null;
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
  (p) => !optedOut.has(packageKey(p.ecosystem, p.name))
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
 * Most visitors give this page a few seconds. The default set is drawn from
 * packages that are both heavily depended on and carrying at least one flag,
 * because that card makes the whole argument on its own: "5,765,200 dependent
 * repositories" next to "one maintainer" needs no explaining.
 *
 * This is a sampling pool, not a ranking. Nothing is ordered by it and no score
 * is shown. Applying a filter searches the full set instead.
 */
const WIDELY_USED_THRESHOLD = 100_000;

/** Below this the pool is too thin to feel random, so fall back to everything. */
const SAMPLE_FALLBACK_MIN = 24;

const headlinePool = allPackages.filter(
  (p) =>
    (p.dependent_repos_count ?? 0) >= WIDELY_USED_THRESHOLD &&
    (p.sole_maintainer || p.unfunded || p.quiet || p.has_advisories)
);

/** The pool the unfiltered page samples from, falling back if it is ever thin. */
export function getHeadlinePool(): CriticalPackage[] {
  return headlinePool.length >= SAMPLE_FALLBACK_MIN ? headlinePool : allPackages;
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
export function getPool(filters: FilterId[]): CriticalPackage[] {
  if (filters.length === 0) return allPackages;
  return allPackages.filter((p) => filters.every((f) => p[f]));
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
