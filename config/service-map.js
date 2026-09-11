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

export const SERVICE_MAP = {
  // One person is listed as the sole maintainer.
  sole_maintainer: ['governance-setup', 'leadership-onboarding', 'maintainer-task-contributor'],

  // No funding link published on the package.
  unfunded: ['funding-strategy'],

  // Has published security advisories.
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
  // "Published advisory" is security jargon. Most visitors are not security
  // people and will not know what one is, so say what it means instead.
  has_advisories: (pkg) =>
    pkg.advisory_count === 1
      ? '1 known security issue'
      : `${pkg.advisory_count} known security issues`,
  quiet: (pkg) => {
    const year = pkg.latest_release_published_at
      ? new Date(pkg.latest_release_published_at).getUTCFullYear()
      : null;
    return year ? `no release since ${year}` : 'no release date recorded';
  },
};

export const FLAGS = Object.keys(SERVICE_MAP);

/** The flags a package actually carries, in a stable order. */
export function flagsFor(pkg) {
  return FLAGS.filter((flag) => pkg[flag]);
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
  return flagsFor(pkg).map((flag) => FLAG_LABELS[flag](pkg));
}
