/**
 * A playbook's title, for playbooks that do not declare one.
 *
 * The playbooks are authored in wishlist-playbooks and carry no frontmatter,
 * so every field the collection schema marks optional really is absent. The
 * route used to read `data.title` directly and call `.toLowerCase()` on it,
 * which threw once the response was already streaming: a truncated 200 locally,
 * a 502 through a CDN, and every playbook page on the live site dead.
 *
 * Taking the title from the document is also just more honest than requiring
 * an author in another repository to repeat, in frontmatter, something they
 * already wrote at the top of the page.
 */

/** The first `# ` heading, which is how a reader would name the document. */
export function titleFromBody(body: unknown): string | null {
  if (typeof body !== 'string') return null;
  const heading = body.match(/^#\s+(.+)$/m);
  if (!heading) return null;
  const title = heading[1].trim();
  return title || null;
}

/** Last resort: the folder, as words. */
export function titleFromFolder(name: string): string {
  return name
    .split(/[-_/]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * The title to show, from frontmatter if there is any, then the document, then
 * the folder. Always returns something: a page with no title is a page that
 * throws the moment anything formats it.
 */
export function playbookTitle(
  data: { title?: string | null } | null | undefined,
  body: unknown,
  folder: string
): string {
  return data?.title?.trim() || titleFromBody(body) || titleFromFolder(folder);
}

/** Entry ids are `<folder>/playbook`; the folder is what GitHub and links want. */
export function playbookFolder(id: string): string {
  return id.replace(/\/playbook$/, '');
}
