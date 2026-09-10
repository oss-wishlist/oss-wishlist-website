/**
 * Which practitioners cover which services.
 *
 * Practitioners already live in the database and already declare the services
 * they can help with, so this only groups what exists. It builds no second
 * practitioner surface: every name links to its existing profile page.
 *
 * Failures degrade to "no practitioners listed" rather than an error, and
 * callers render nothing at all in that case. A visible "0 practitioners
 * available" would be an argument against the point of the site.
 */

import { getApprovedPractitioners } from './db';

export interface AvailablePractitioner {
  slug: string;
  name: string;
  title: string | null;
  bio: string | null;
  avatar_url: string | null;
  availability: string;
  accepts_pro_bono: boolean;
  /** Which of the requested services this person covers. */
  matched: string[];
}


/**
 * Local preview data, so practitioner surfaces can be seen without Postgres.
 *
 * Guarded twice: it requires PRACTITIONER_DEMO=1 to be set explicitly, and it
 * refuses to apply when DATABASE_URL exists. A deployment has a database, so
 * this cannot displace real practitioners; without the env var it never loads
 * at all. It is a development aid, not a fallback.
 */
const DEMO_PRACTITIONERS = [
  {
    slug: 'demo-ada-rivers',
    name: 'Ada Rivers (demo)',
    title: 'Governance and community consultant',
    bio: 'Fifteen years helping projects write governance people actually follow, and moderation policy that holds up when it is tested.',
    avatar_url: null,
    availability: 'available',
    accepts_pro_bono: true,
    services: ['governance-setup', 'moderation-strategy', 'leadership-onboarding'],
  },
  {
    slug: 'demo-kip-moreno',
    name: 'Kip Moreno (demo)',
    title: 'Security reviewer',
    bio: 'CRA readiness, disclosure policy and vulnerability handling for small maintainer teams.',
    avatar_url: null,
    availability: 'limited',
    accepts_pro_bono: false,
    services: ['dependency-security-audit'],
  },
  {
    slug: 'demo-sam-oyelaran',
    name: 'Sam Oyelaran (demo)',
    title: 'Funding strategist',
    bio: 'Sponsorship, grant readiness and getting a funding route in place that does not depend on one person.',
    avatar_url: null,
    availability: 'available',
    accepts_pro_bono: false,
    services: ['funding-strategy', 'maintainer-task-contributor'],
  },
];

function demoPractitioners(): AvailablePractitioner[] | null {
  const enabled = import.meta.env.PRACTITIONER_DEMO === '1' || process.env.PRACTITIONER_DEMO === '1';
  const hasDatabase = Boolean(import.meta.env.DATABASE_URL || process.env.DATABASE_URL);
  if (!enabled || hasDatabase) return null;

  console.warn('[practitioners] PRACTITIONER_DEMO is on: showing local preview data, not real practitioners.');
  return DEMO_PRACTITIONERS as unknown as AvailablePractitioner[];
}

/**
 * Approved practitioners, or an empty list if the database cannot be reached.
 *
 * For pages where practitioners are a section rather than the subject: a
 * service page should still explain the service when the database is down,
 * not return a 500. Callers must render nothing for an empty list rather than
 * a zero.
 */
export async function getApprovedPractitionersSafe() {
  const demo = demoPractitioners();
  if (demo) return demo as any[];

  try {
    return await getApprovedPractitioners();
  } catch (error) {
    console.warn('[practitioners] lookup failed, continuing without:', error);
    return [];
  }
}

/**
 * Practitioners grouped by service slug, for the given services only.
 *
 * Unavailable practitioners are left out: listing someone who has said they
 * cannot take work is worse than listing no one.
 */
export async function practitionersByService(
  serviceSlugs: string[]
): Promise<Map<string, AvailablePractitioner[]>> {
  const wanted = new Set(serviceSlugs);
  const grouped = new Map<string, AvailablePractitioner[]>();

  let practitioners;
  const demo = demoPractitioners();
  if (demo) {
    practitioners = demo as any[];
  } else {
  try {
    practitioners = await getApprovedPractitioners();
  } catch (error) {
    // The site still works without the practitioner database; the service pages
    // remain the route to the people who do this work.
    console.warn('[practitioners] lookup failed, continuing without:', error);
    return grouped;
  }
  }

  for (const p of practitioners) {
    if (p.availability === 'unavailable') continue;

    for (const slug of p.services ?? []) {
      if (!wanted.has(slug)) continue;

      const entry: AvailablePractitioner = {
        slug: p.slug,
        name: p.name,
        title: p.title ?? null,
        bio: p.bio ?? null,
        avatar_url: p.avatar_url ?? null,
        availability: p.availability,
        accepts_pro_bono: Boolean(p.accepts_pro_bono),
        matched: (p.services ?? []).filter((s) => wanted.has(s)),
      };

      const existing = grouped.get(slug);
      if (existing) existing.push(entry);
      else grouped.set(slug, [entry]);
    }
  }

  return grouped;
}

/**
 * The people who cover the requested services, one entry each rather than one
 * per service, with the services they matched on.
 *
 * Practitioners write their own bios and declare their own services, so this
 * only groups what they already said. Sorted by how many of the chosen services
 * a person covers, since someone who can do three of them is a shorter
 * conversation than three separate people.
 */
export async function practitionersForServices(
  serviceSlugs: string[]
): Promise<AvailablePractitioner[]> {
  const grouped = await practitionersByService(serviceSlugs);

  const bySlug = new Map<string, AvailablePractitioner>();
  for (const people of grouped.values()) {
    for (const person of people) {
      if (!bySlug.has(person.slug)) bySlug.set(person.slug, person);
    }
  }

  return [...bySlug.values()].sort(
    (a, b) => b.matched.length - a.matched.length || a.name.localeCompare(b.name)
  );
}
