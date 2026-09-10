#!/usr/bin/env node
/**
 * Fail the build when an input the site depends on is missing.
 *
 * Both of these fail silently otherwise, which is the problem. Astro's glob
 * loader only warns about an empty content directory, and the package cache is
 * an ordinary JSON import, so a deploy with either one missing builds fine and
 * serves a quietly diminished site: no rubrics, no playbook pages, or no
 * packages at all.
 *
 * The submodule is the likely one in practice. Most hosts, DigitalOcean App
 * Platform included, clone without --recurse-submodules unless told to, so this
 * is a first-deploy trap rather than a rare edge case.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const problems = [];

// --- Playbooks submodule ---
const playbooks = path.join(ROOT, 'src/content/playbooks-external');
const playbookFiles = fs.existsSync(playbooks)
  ? fs.readdirSync(playbooks).filter((f) => fs.existsSync(path.join(playbooks, f, 'playbook.md')))
  : [];

if (playbookFiles.length === 0) {
  problems.push(
    [
      'The playbooks submodule is empty or missing.',
      '',
      '  Every peer review rubric is read from it, so the site would build and',
      '  deploy without a single rubric and with every /playbooks page 404ing.',
      '',
      '  Fix locally:   git submodule update --init --recursive',
      '  Fix on a host: clone with submodules, or add that command as a pre-build step.',
    ].join('\n')
  );
}

// --- Cached package data ---
const critical = path.join(ROOT, 'data/critical.json');
if (!fs.existsSync(critical)) {
  problems.push(
    [
      'data/critical.json is missing.',
      '',
      '  The site has no packages to show without it.',
      '  Fix: npm run refresh-data',
    ].join('\n')
  );
} else {
  try {
    const packages = JSON.parse(fs.readFileSync(critical, 'utf8'));
    if (!Array.isArray(packages) || packages.length === 0) {
      problems.push('data/critical.json is empty. Fix: npm run refresh-data');
    }
  } catch {
    problems.push('data/critical.json is not valid JSON. Fix: npm run refresh-data');
  }
}

if (problems.length > 0) {
  console.error('\nBuild inputs are missing:\n');
  for (const p of problems) console.error(p + '\n');
  process.exit(1);
}

console.log(
  `[check-build-inputs] ok: ${playbookFiles.length} playbooks, package cache present`
);
