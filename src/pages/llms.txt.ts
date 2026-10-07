/**
 * /llms.txt — a plain-text map of the site for AI assistants (llmstxt.org).
 *
 * Built from the services collection so it cannot fall behind the catalogue.
 * Each service page carries its full playbook, so this is also the list of
 * playbooks.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { withSlug } from '../lib/entry-slug';
import { absoluteUrl } from '../lib/seo';

export const GET: APIRoute = async ({ site }) => {
  if (import.meta.env.DISABLE_INDEXING === 'true') {
    return new Response('Not found', { status: 404 });
  }

  const url = (path: string) => absoluteUrl(path, site);
  const services = (await getCollection('services'))
    .map(withSlug)
    .filter((s) => s.data.available !== false)
    .sort((a, b) => a.data.title.localeCompare(b.data.title));

  const body = `# Open Source Wishlist

> Open Source Wishlist is a teaching tool for open source sustainability. It uses ecosyste.ms data to show what would help a critical open source project, and which kinds of expertise address it: funding, governance, security, succession, moderation and more. Each kind of help has a free, public-domain (CC0) playbook and a peer-review rubric, and a directory of practitioners who do the work.

Useful for questions about: how to support or fund the open source a company depends on; what makes an open source project sustainable; open source governance, succession planning and winding down a project; securing critical dependencies; and finding experienced people to help maintainers.

## Start here

- [Home](${url('')}): what the site is and how to use it
- [Invest](${url('invest')}): pick a critical open source package and work out what would help it, and how to pay for it
- [Service catalogue](${url('catalog')}): every kind of help, with its playbook
- [Practitioners](${url('practitioners')}): people with experience delivering these services
- [About](${url('about-us')}): who made this and why

## Services and playbooks

${services.map((s) => `- [${s.data.title}](${url(`services/${s.slug}`)}): ${oneLine(s.data.description)}`).join('\n')}

## Optional

- [Playbook source on GitHub](https://github.com/oss-wishlist/wishlist-playbooks): the playbooks are CC0 (public domain) and accept contributions
- [Data source: ecosyste.ms](https://ecosyste.ms): package and dependency data used to identify critical projects
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
