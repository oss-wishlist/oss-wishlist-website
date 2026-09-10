/**
 * Step 2 of the wizard: what brings you here.
 *
 * Adapted from the Teaching Open Source Risk and Investment Framework
 * (microsoft/OSPO, learning_resources/using-oss/investment-framework.md).
 * The framework is a teaching tool first, and so is this: the point is that
 * someone leaves understanding how to think about the question, not just
 * holding a shortlist.
 *
 * That is why every motivation carries `evidence`. We pre-tick from what the
 * data actually shows and say why on the page, so the reasoning is visible and
 * arguable rather than hidden in a recommendation. The visitor overrides freely;
 * a pre-tick is a suggestion with its working shown, never a verdict.
 *
 * `evidence` returns a plain sentence when the signal is present, or null when
 * it is not. A motivation with no evidence is still offered, just not ticked:
 * some real reasons for investing leave no trace in registry metadata, and
 * pretending otherwise would teach the wrong lesson.
 */

export const MOTIVATIONS = [
  {
    id: 'security',
    label: 'Security',
    question: 'Vulnerabilities, slow patches, or a supply chain you have to vouch for.',
    services: ['dependency-security-audit'],
    evidence: (pkg) =>
      pkg.has_advisories
        ? `${pkg.advisory_count} known security ${pkg.advisory_count === 1 ? 'issue' : 'issues'} published`
        : null,
  },
  {
    id: 'project-health',
    label: 'Project health',
    question: 'Governance, decision-making, or how the community is run.',
    services: ['governance-setup', 'moderation-strategy'],
    evidence: (pkg) => (pkg.sole_maintainer ? 'one maintainer listed' : null),
  },
  {
    id: 'continuity',
    label: 'Continuity',
    question: 'What happens to this if the people running it stop.',
    services: ['leadership-onboarding', 'winding-down'],
    evidence: (pkg) => {
      if (!pkg.quiet) return null;
      const year = pkg.latest_release_published_at
        ? new Date(pkg.latest_release_published_at).getUTCFullYear()
        : null;
      return year ? `no release since ${year}` : 'no recent release';
    },
  },
  {
    id: 'capacity',
    label: 'Maintainer capacity',
    question: 'More work arriving than the maintainers can absorb.',
    services: ['maintainer-task-contributor'],
    // The combination is the signal: a lot of people depending on very few.
    evidence: (pkg) =>
      pkg.sole_maintainer && (pkg.dependent_repos_count ?? 0) > 100_000
        ? `${(pkg.dependent_repos_count ?? 0).toLocaleString('en-US')} dependent repositories, one maintainer`
        : null,
  },
  {
    id: 'funding',
    label: 'Funding',
    question: 'No route for money to reach the people doing the work.',
    services: ['funding-strategy'],
    evidence: (pkg) => (pkg.unfunded ? 'no funding link published' : null),
  },
  {
    id: 'innovation',
    label: 'Innovation',
    question: 'Too few contributors for the project to move forward.',
    services: ['developer-relations-strategy'],
    // Deliberately never pre-ticked. Contributor growth is not in the cached
    // data, and inventing a signal would teach people to trust one that is not there.
    evidence: () => null,
  },
];

export const MOTIVATION_IDS = MOTIVATIONS.map((m) => m.id);

/** Motivations the data supports for this package, with the reason why. */
export function suggestedMotivations(pkg) {
  return MOTIVATIONS.map((m) => ({ id: m.id, evidence: m.evidence(pkg) })).filter(
    (m) => m.evidence
  );
}

/** Keep only recognised ids, in declared order. */
export function parseMotivations(values) {
  return MOTIVATION_IDS.filter((id) => values.includes(id));
}

/** Service slugs for a set of motivations, deduped, in declared order. */
export function servicesForMotivations(ids) {
  const slugs = [];
  for (const m of MOTIVATIONS) {
    if (!ids.includes(m.id)) continue;
    for (const slug of m.services) if (!slugs.includes(slug)) slugs.push(slug);
  }
  return slugs;
}
