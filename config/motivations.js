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
 * Labels deliberately echo the services they lead to: "Leadership continuity"
 * rather than "Continuity", because the service is called Leadership Continuity
 * & Succession Planning. Someone should leave with the vocabulary the catalogue
 * actually uses, not a set of abstractions invented for this page.
 *
 * `evidence` returns a plain sentence when the signal is present, or null when
 * it is not. A motivation with no evidence is still offered, just not ticked:
 * some real reasons for investing leave no trace in registry metadata, and
 * pretending otherwise would teach the wrong lesson.
 */

/**
 * A release gap long enough that winding down is worth raising.
 *
 * Deliberately longer than the 18 months behind the `quiet` flag. Eighteen
 * months without a release is common in a stable library and mostly asks who
 * takes over; two years starts to ask whether anyone intends to. Suggesting a
 * wind-down at the shorter gap would put words in a maintainer's mouth.
 */
const DORMANT_AFTER_MONTHS = 24;

function monthsSinceRelease(pkg) {
  if (!pkg.latest_release_published_at) return null;
  const released = new Date(pkg.latest_release_published_at);
  if (Number.isNaN(released.getTime())) return null;
  return (Date.now() - released.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
}

export function isDormant(pkg) {
  const months = monthsSinceRelease(pkg);
  return months !== null && months >= DORMANT_AFTER_MONTHS;
}

export const MOTIVATIONS = [
  {
    id: 'security',
    label: 'Security',
    question: 'Known vulnerabilities, or fixes that are slow to arrive.',
    services: ['dependency-security-audit'],
    evidence: (pkg) =>
      pkg.has_advisories
        ? `${pkg.advisory_count} known security ${pkg.advisory_count === 1 ? 'issue' : 'issues'} published`
        : null,
  },
  {
    id: 'project-health',
    label: 'Governance and moderation',
    question: 'How decisions get made, and how the community is run.',
    services: ['governance-setup', 'moderation-strategy'],
    evidence: (pkg) => (pkg.sole_maintainer ? 'one maintainer listed' : null),
  },
  {
    id: 'continuity',
    label: 'Leadership continuity',
    question: 'What happens if the people running it stop.',
    // Winding down is only offered once a project has been quiet long enough
    // that the question is honest. See DORMANT_AFTER_MONTHS.
    services: ['leadership-onboarding'],
    dormantServices: ['leadership-onboarding', 'winding-down'],
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
    label: 'Maintainer workload',
    question: 'More work arriving than the maintainers can keep up with.',
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
    question: 'No way for money to reach the people doing the work.',
    services: ['funding-strategy'],
    evidence: (pkg) => (pkg.unfunded ? 'no clear funding or sponsorship pathway' : null),
  },
  {
    id: 'innovation',
    label: 'Contributors and growth',
    question: 'Not enough people contributing to move it forward.',
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

/**
 * Service slugs for a set of motivations, deduped, in declared order.
 *
 * Takes the package because one motivation varies by it: continuity suggests
 * succession planning for a quiet project and adds winding down only once it
 * has been dormant long enough for that to be a fair question.
 */
export function servicesForMotivations(ids, pkg = null) {
  const slugs = [];
  for (const m of MOTIVATIONS) {
    if (!ids.includes(m.id)) continue;
    const list = m.dormantServices && pkg && isDormant(pkg) ? m.dormantServices : m.services;
    for (const slug of list) if (!slugs.includes(slug)) slugs.push(slug);
  }
  return slugs;
}
