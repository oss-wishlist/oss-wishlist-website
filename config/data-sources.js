/**
 * Single source of truth for the ecosyste.ms data cache.
 *
 * The browser never calls ecosyste.ms. A GitHub Action runs
 * scripts/fetch-ecosystems.mjs weekly and commits the JSON in data/.
 * See .github/workflows/refresh-data.yml.
 *
 * Data: https://ecosyste.ms — CC-BY-SA-4.0. Attribution is required
 * on every page that displays it.
 */

export const PACKAGES_API = 'https://packages.ecosyste.ms/api/v1';
export const REPOS_API = 'https://repos.ecosyste.ms/api/v1';

/** Registries we cache, in display order. */
export const REGISTRIES = [
  'npmjs.org',
  'pypi.org',
  'rubygems.org',
  'crates.io',
  'proxy.golang.org',
  'repo1.maven.org',
  'packagist.org',
  'nuget.org',
];

/**
 * Hard ceiling on cached packages. Raw records are ~55KB each (46 keys);
 * trimmed to KEEP_FIELDS with maintainer emails stripped they are ~570 bytes,
 * so this cap is roughly 2.8MB of committed JSON. Raising it materially is a
 * git-repo-size decision, not a cosmetic one.
 */
export const TOTAL_PACKAGE_CAP = 5000;

/** Top N per registry, by dependent_repos_count. */
export const PER_REGISTRY_CAP = Math.ceil(TOTAL_PACKAGE_CAP / REGISTRIES.length);

/**
 * Only these fields are kept. Everything else in the API response is dropped.
 *
 * Note `advisories` is deliberately absent. The site only ever needs "are there
 * any?", and the raw array embeds security mailing-list addresses (Fedora,
 * Debian) and roughly tripled the size of every record. We store the derived
 * `has_advisories` / `advisory_count` instead. See trimRecord().
 */
export const KEEP_FIELDS = [
  'name',
  'ecosystem',
  'purl',
  'description',
  'repository_url',
  'downloads',
  'dependent_repos_count',
  'funding_links',
  'latest_release_published_at',
  'licenses',
  // Registries publish this when a package is retired: npm sets "deprecated",
  // Packagist sets "abandoned". It is the difference between a project nobody
  // has released lately and one its maintainers have declared finished, which
  // are very different conversations to open with.
  'status',
];

/**
 * A package counts as `quiet` when its latest release is older than this.
 * Phrased on the site as a fact ("no release since 2023"), never as a judgement.
 */
export const QUIET_AFTER_MONTHS = 18;

/** How many cards a visitor sees in one randomized set on /fund. */
export const SAMPLE_SIZE = 12;

/** Polite-pool etiquette: identify the client, one request per second, back off hard. */
export const REQUEST_DELAY_MS = 1000;
export const MAX_RETRIES = 4;
export const PER_PAGE = 100;

export const ATTRIBUTION =
  'Package data from ecosyste.ms (https://ecosyste.ms), licensed CC-BY-SA-4.0.';
