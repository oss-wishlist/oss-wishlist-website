/**
 * Step 2 of the wizard: what brings you here.
 *
 * One question per playbook. Each asks what that playbook answers, so the
 * question and the service it leads to name the same subject.
 *
 * `evidence` returns a sentence when the cached data supports a question, and
 * the page shows it beside the pre-ticked box so the reasoning is on screen and
 * arguable. Several always return null: registry metadata says nothing about
 * whether a project has an AI policy or meets a procurement standard, so those
 * questions are offered unticked.
 *
 * Labels sit inside the sentence the page builds, "I want to help with ...",
 * so they are lowercase apart from acronyms.
 */

import { recentAdvisoryLabel } from './advisories.js';

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

/**
 * Has the project said, in so many words, that it is finished?
 *
 * Registries publish this: npm sets `status` to "deprecated", Packagist to
 * "abandoned", and an archived repository says the same thing another way. It
 * is a statement by the maintainers rather than an absence of activity, which
 * makes it a far stronger signal than a quiet release history, and one that
 * deserves different wording on the page.
 */
export function isRetired(pkg) {
  return Boolean(pkg?.status || pkg?.deprecated || pkg?.archived);
}

/** How the registry put it, so the page can quote rather than paraphrase. */
function retiredLabel(pkg) {
  if (pkg?.status) return `the registry lists this as ${String(pkg.status).toLowerCase()}`;
  if (pkg?.deprecated || pkg?.archived) return 'the repository is archived';
  return null;
}

/**
 * Does the repository publish this file?
 *
 * Three answers, and the third matters: true, false, and unknown. A package
 * cached before the file listing was collected has no `files` at all, and
 * reading that as "absent" would put "no SECURITY.md" on every record in the
 * cache. Unknown returns null and the question is offered unticked.
 */
function hasFile(pkg, name) {
  if (!pkg?.files) return null;
  return Boolean(pkg.files[name]);
}

/** Evidence that a file is missing, when we know it is missing. */
function missingFile(pkg, name, phrase) {
  return hasFile(pkg, name) === false ? phrase : null;
}

/** Join what we found, so a question can rest on more than one signal. */
function bothOf(...parts) {
  const found = parts.filter(Boolean);
  return found.length ? found.join('; ') : null;
}

export const MOTIVATIONS = [
  {
    id: 'security',
    label: 'CRA readiness',
    question: 'Is this project ready for the EU Cyber Resilience Act?',
    services: ['dependency-security-audit'],
    /*
      Advisories are worth showing whatever brought someone here, but they are
      not a measure of CRA readiness. A project that discloses well publishes
      more of them, not fewer. So this is evidence that the subject is live for
      this project, not evidence that it is failing.
    */
    evidence: (pkg) =>
      bothOf(
        recentAdvisoryLabel(pkg),
        missingFile(pkg, 'security', 'no SECURITY.md, which is where a disclosure policy usually lives')
      ),
  },
  {
    id: 'governance',
    label: 'governance',
    question: 'Is it clear how decisions get made, and who makes them?',
    services: ['governance-setup'],
    evidence: (pkg) =>
      bothOf(
        pkg.sole_maintainer ? 'one maintainer, so decisions rest with one person' : null,
        missingFile(pkg, 'code_of_conduct', 'no code of conduct published')
      ),
  },
  {
    id: 'moderation',
    label: 'moderation',
    question: 'Is there a plan for spam, bots, abuse and conflict in the community?',
    services: ['moderation-strategy'],
    evidence: (pkg) => missingFile(pkg, 'code_of_conduct', 'no code of conduct published'),
  },
  {
    id: 'continuity',
    label: 'leadership continuity',
    question: 'What happens if the maintainers burn out, or step away?',
    services: ['leadership-onboarding'],
    /*
      Both halves of that question, not just the second. A sole maintainer is
      the clearest case of either: nobody is carrying it with them, so there is
      nobody to absorb the load before exhaustion and nobody to hand to after.
    */
    evidence: (pkg) =>
      pkg.sole_maintainer ? 'one maintainer, so there is nobody to share the load with' : null,
  },
  {
    id: 'capacity',
    label: 'maintainer workload',
    question: 'Is more work arriving than the maintainers can absorb?',
    services: ['maintainer-task-contributor'],
    // The combination is the signal: a lot of people depending on very few.
    evidence: (pkg) =>
      pkg.sole_maintainer && (pkg.dependent_repos_count ?? 0) > 100_000
        ? `${(pkg.dependent_repos_count ?? 0).toLocaleString('en-US')} dependent repositories, one maintainer`
        : null,
  },
  {
    id: 'funding',
    label: 'funding',
    question: 'Is there a way for money to reach the people doing the work?',
    services: ['funding-strategy'],
    evidence: (pkg) => (pkg.unfunded ? 'no clear funding or sponsorship pathway' : null),
  },
  {
    id: 'contributors',
    label: 'contributors and growth',
    question: 'Are there enough people contributing to keep it moving?',
    services: ['developer-relations-strategy'],
    // Contributor numbers are not in the cached data. Whether there is a door
    // for a new contributor to walk through is.
    evidence: (pkg) =>
      missingFile(pkg, 'contributing', 'no CONTRIBUTING guide for a new contributor to follow'),
  },
  {
    id: 'sovereignty',
    label: 'digital sovereignty',
    question: 'Does this project meet digital sovereignty procurement standards?',
    services: ['digital-sovereignty'],
    // A procurement standard is assessed against a project, never inferred
    // from registry metadata.
    evidence: () => null,
  },
  {
    id: 'ai-policy',
    label: 'AI policy',
    question: 'Does the project have an AI policy?',
    services: ['ai-consent-framework'],
    // AGENTS.md is the convention for telling AI agents how to work on a repo,
    // and it is the closest thing to a published AI policy that registry data
    // can see.
    evidence: (pkg) => missingFile(pkg, 'agents', 'no AGENTS.md, so no published position on AI use'),
  },
  {
    id: 'winding-down',
    label: 'winding down',
    question: 'Should this project be wound down, or handed to someone else?',
    services: ['winding-down', 'leadership-onboarding'],
    /*
      Two signals, deliberately worded differently. A registry marking a package
      deprecated or abandoned, or a repository being archived, is the
      maintainers stating a position, and the page can quote it. A long release
      gap is only an absence, and saying more than that would put a conclusion
      in someone's mouth.

      Succession planning is offered alongside winding down because the honest
      answer is often the other one: a project with no maintainer left may want
      a new one rather than an ending.
    */
    evidence: (pkg) => {
      const retired = retiredLabel(pkg);
      if (retired) return retired;
      if (isDormant(pkg)) {
        const months = Math.floor(monthsSinceRelease(pkg));
        return `no release in ${months} months`;
      }
      return null;
    },
  },
  {
    id: 'infrastructure',
    label: 'hosting and infrastructure',
    question: 'Does it need somewhere to run, or infrastructure paid for?',
    services: ['hosting-infrastructure'],
    evidence: () => null,
  },
  {
    id: 'other',
    label: 'something else',
    question: 'A need none of these describe.',
    services: ['general-need'],
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
 * Still takes the package, because callers pass it, but nothing varies by it
 * any more. Winding down used to be reachable only as a variant of the
 * continuity question for a dormant project; it is a question in its own right
 * now, which is both simpler and more honest, since someone may want to ask it
 * about a project the data says nothing about.
 */
export function servicesForMotivations(ids, pkg = null) {
  const slugs = [];
  for (const m of MOTIVATIONS) {
    if (!ids.includes(m.id)) continue;
    for (const slug of m.services) if (!slugs.includes(slug)) slugs.push(slug);
  }
  return slugs;
}
