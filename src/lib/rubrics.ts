/**
 * Pull the peer-review rubric out of a service's playbook.
 *
 * The rubrics already exist, written down and scored, in the playbooks
 * repository. Nothing here invents or scores anything: it reads what is there
 * so the site can show that a measurable instrument exists, and what it
 * measures, rather than asking anyone to take "impact" on trust.
 *
 * That is the teaching part. Someone deciding whether to invest should be
 * asking what good would look like and how they would know, and the rubric is
 * the answer to both.
 *
 * Structure in the source markdown, consistent across playbooks:
 *   ## <Service> – Peer Review Rubric
 *   ### A. Some Dimension (0–12 pts)
 *   ### Total Score line, written with asterisks around the number
 *
 * The CRA playbook scores differently, per criterion in a 0/1/2 table with no
 * running total, so its dimensions carry no maximum. Both shapes are read; a
 * rubric without a total is still a rubric and still worth showing.
 */

import { getCollection } from 'astro:content';

export interface RubricDimension {
  letter: string;
  name: string;
  /** Null where the playbook scores per criterion rather than out of a total. */
  maxPoints: number | null;
}

export interface Rubric {
  /** Playbook folder, which is also the /playbooks/:slug segment. */
  playbook: string;
  dimensions: RubricDimension[];
  totalPoints: number | null;
}

// En dash in "0–12 pts" is what the playbooks actually use; accept a hyphen too.
const DIMENSION_RE = /^#{2,4}\s+([A-Z])\.\s+(.+?)\s*\(\s*\d+\s*[–-]\s*(\d+)\s*pts?\s*\)/gm;
/** Lettered dimensions with no points suffix, as the CRA playbook writes them. */
const PLAIN_DIMENSION_RE = /^#{2,4}\s+([A-Z])\.\s+(.+?)\s*$/gm;
const TOTAL_RE = /Total Score:.*?(\d+)\s*pts/i;
/** Only look for dimensions after the rubric actually starts. */
const RUBRIC_START_RE = /^#{1,4}.*Rubric\s*$/im;

/** Parse one playbook body. Exported for direct testing. */
export function parseRubric(playbook: string, body: string): Rubric | null {
  // Everything before the rubric heading is process notes and links; lettered
  // headings up there are not rubric dimensions.
  const startsAt = body.search(RUBRIC_START_RE);
  const section = startsAt >= 0 ? body.slice(startsAt) : body;

  const dimensions: RubricDimension[] = [];

  DIMENSION_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = DIMENSION_RE.exec(section)) !== null) {
    dimensions.push({
      letter: match[1],
      name: match[2].replace(/\*+/g, '').trim(),
      maxPoints: Number(match[3]),
    });
  }

  // Fall back to the unscored heading shape only if the scored one found nothing.
  if (dimensions.length === 0) {
    PLAIN_DIMENSION_RE.lastIndex = 0;
    while ((match = PLAIN_DIMENSION_RE.exec(section)) !== null) {
      const name = match[2].replace(/\*+/g, '').trim();
      if (!name || /total score/i.test(name)) continue;
      dimensions.push({ letter: match[1], name, maxPoints: null });
    }
  }

  if (dimensions.length === 0) return null;

  const total = section.match(TOTAL_RE);
  return {
    playbook,
    dimensions,
    totalPoints: total ? Number(total[1]) : null,
  };
}

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
