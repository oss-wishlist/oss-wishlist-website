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
  avatar_url: string | null;
  availability: string;
  accepts_pro_bono: boolean;
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
  try {
    practitioners = await getApprovedPractitioners();
  } catch (error) {
    // The site still works without the practitioner database; the service pages
    // remain the route to the people who do this work.
    console.warn('[practitioners] lookup failed, continuing without:', error);
    return grouped;
  }

  for (const p of practitioners) {
    if (p.availability === 'unavailable') continue;

    for (const slug of p.services ?? []) {
      if (!wanted.has(slug)) continue;

      const entry: AvailablePractitioner = {
        slug: p.slug,
        name: p.name,
        title: p.title ?? null,
        avatar_url: p.avatar_url ?? null,
        availability: p.availability,
        accepts_pro_bono: Boolean(p.accepts_pro_bono),
      };

      const existing = grouped.get(slug);
      if (existing) existing.push(entry);
      else grouped.set(slug, [entry]);
    }
  }

  return grouped;
}
