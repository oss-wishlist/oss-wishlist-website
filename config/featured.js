/**
 * The packages shown before a visitor has picked a package manager.
 *
 * Hand-picked, and the only hand-maintained list on the site. Everything else
 * is sampled from the data. Two reasons for choosing rather than sampling here:
 *
 *   - Recognition. A random draw surfaces transitive utilities nobody has heard
 *     of. "postcss has 3.7 million dependent repositories and seven known
 *     security issues" lands immediately; an unfamiliar name has to be read
 *     twice, and most people will not.
 *   - Breadth. A spread across ecosystems shows this is not an npm problem.
 *
 * Rules for editing:
 *   - Real, third-party open source projects only. Nothing of ours.
 *   - Every entry must carry at least one flag, or the card says nothing.
 *   - Entries that fall out of the cache, or opt out, are skipped silently.
 *     Nothing here can resurrect an opted-out package.
 *
 * Listing a project is not a criticism of it. These are widely relied on and
 * mostly well run; that is the point.
 */

export const FEATURED_PACKAGES = [
  { ecosystem: 'npm', name: 'postcss' },
  { ecosystem: 'npm', name: 'lodash' },
  { ecosystem: 'npm', name: 'express' },
  { ecosystem: 'pypi', name: 'requests' },
  { ecosystem: 'pypi', name: 'certifi' },
  { ecosystem: 'pypi', name: 'jinja2' },
  { ecosystem: 'rubygems', name: 'rake' },
  { ecosystem: 'rubygems', name: 'nokogiri' },
  { ecosystem: 'rubygems', name: 'sass' },
  { ecosystem: 'packagist', name: 'monolog/monolog' },
  { ecosystem: 'packagist', name: 'twig/twig' },
  { ecosystem: 'go', name: 'github.com/sirupsen/logrus' },
  { ecosystem: 'cargo', name: 'tokio' },
];
