/**
 * Astro v6 removed the automatic `slug` field from content collection entries.
 * Entries from glob loaders now only have `id` (which includes the file extension).
 * These helpers restore slug-equivalent values from `id`.
 */

/** Convert a glob-loader entry id to a slug (strips the file extension). */
export const entrySlug = (id: string) => id.replace(/\.[^.]+$/, '');

/** Add a computed `slug` field to a content entry. Use with .map(withSlug). */
export function withSlug<T extends { id: string }>(entry: T): T & { slug: string } {
  return { ...entry, slug: entrySlug(entry.id) };
}
