/**
 * Turning a playbook entry id into its folder.
 *
 * The glob loader names entries `<folder>/playbook`, while services, GitHub
 * and every link refer to the folder alone.
 *
 * This file used to derive a title for the standalone playbook page as well:
 * the playbooks carry no frontmatter, the route read `data.title` anyway, and
 * calling `.toLowerCase()` on the undefined result threw mid-stream, which is
 * a truncated 200 locally and a 502 behind a CDN. That page now redirects to
 * the service, which is where a playbook is meant to be read, so the
 * derivation went with it.
 */

/** Entry ids are `<folder>/playbook`; everything else wants the folder. */
export function playbookFolder(id: string): string {
  return id.replace(/\/playbook$/, '');
}
