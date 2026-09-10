/**
 * Step 3 of the wizard: how you would invest.
 *
 * Drawn from Step #3 of the Teaching Open Source Risk and Investment Framework
 * (microsoft/OSPO). The framework lists more routes than belong here: event
 * sponsorship, cloud credits, foundation nominations and stop-using are all
 * real answers, but this site cannot help with any of them, and offering a path
 * it cannot support would be a sales funnel rather than a teaching tool.
 *
 * What all three have in common is that Open Source Wishlist does not broker
 * any of them. The visitor leaves with a summary and goes to the people
 * themselves.
 *
 * The framework's foundational principle, worth keeping in view: unless agreed
 * in something like a service agreement, no investment in open source obliges
 * that project to treat you differently from anyone else in the community.
 */

export const INVESTMENT_METHODS = [
  {
    id: 'direct-funding',
    label: 'Fund the project directly',
    summary: 'Money to the maintainers, through whatever route the project already publishes.',
    /** Shown when the package has no funding link, because then this is harder. */
    caveat:
      'This package publishes no funding link, so there may be no route set up yet. That is what funding strategy work is for.',
    caveatWhen: (pkg) => pkg.unfunded,
  },
  {
    id: 'employee-time',
    label: 'Give employee time',
    summary:
      'Someone on your team does the work, from occasional contribution through to a funded maintainer role.',
    caveat: null,
    caveatWhen: () => false,
  },
  {
    id: 'practitioner',
    label: 'Pay a practitioner',
    summary:
      'Someone who does this professionally delivers it against a defined outcome and rubric.',
    caveat: null,
    caveatWhen: () => false,
  },
];

export const METHOD_IDS = INVESTMENT_METHODS.map((m) => m.id);

export function parseMethods(values) {
  return METHOD_IDS.filter((id) => values.includes(id));
}
