/**
 * Load the peer-review rubrics out of the playbooks collection.
 *
 * Parsing lives in rubric-parser.ts, which imports nothing from Astro so it can
 * be tested on its own. This file only handles fetching and caching.
 */

import { getCollection } from 'astro:content';
import { parseRubric, type Rubric, type RubricDimension } from './rubric-parser';

export type { Rubric, RubricDimension };
export { parseRubric };

let cache: Map<string, Rubric> | null = null;

/**
 * Rubrics keyed by playbook folder. Built once per process: the playbooks are
 * content collection entries, so this is a parse of already-loaded text.
 */
export async function getRubrics(): Promise<Map<string, Rubric>> {
  if (cache) return cache;

  const built = new Map<string, Rubric>();
  const playbooks = await getCollection('playbooks-external');

  for (const entry of playbooks) {
    // Entry ids are "<folder>/playbook"; the folder is what services reference.
    const folder = entry.id.replace(/\.md$/, '').split('/')[0];
    const body = entry.body ?? '';
    const rubric = parseRubric(folder, body);
    if (rubric) built.set(folder, rubric);
  }

  cache = built;
  return built;
}

/** The rubric for a service, via its `playbook` frontmatter, or null. */
export async function getRubricForPlaybook(playbook: string | undefined): Promise<Rubric | null> {
  if (!playbook) return null;
  const rubrics = await getRubrics();
  return rubrics.get(playbook) ?? null;
}
