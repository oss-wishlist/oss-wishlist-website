#!/usr/bin/env node
/**
 * Fetch critical-package data from ecosyste.ms and commit it as JSON.
 *
 * Run weekly by .github/workflows/refresh-data.yml. The site reads only the
 * committed files in data/ — the browser never calls ecosyste.ms, because the
 * public API rate-limits hard and a client-side site would break exactly when
 * it got attention.
 *
 * Safety contract:
 *   - Never writes an empty or partial dataset.
 *   - On any failure, leaves the previously committed JSON alone and exits 0.
 *   - Strips maintainer email addresses before anything touches disk.
 *
 * Data: https://ecosyste.ms — CC-BY-SA-4.0.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PACKAGES_API,
  REGISTRIES,
  TOTAL_PACKAGE_CAP,
  PER_REGISTRY_CAP,
  KEEP_FIELDS,
  QUIET_AFTER_MONTHS,
  REQUEST_DELAY_MS,
  MAX_RETRIES,
  PER_PAGE,
  ATTRIBUTION,
} from '../config/data-sources.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');

/** Contact for the ecosyste.ms "polite pool". Set as a repo variable, never committed. */
const CONTACT = process.env.ECOSYSTEMS_CONTACT || '';
const USER_AGENT =
  'oss-wishlist-website/1.0 (+https://github.com/oss-wishlist/oss-wishlist-website)';

/**
 * Test overrides, so a smoke run costs a handful of requests instead of ~110.
 * Unset in CI, where the real caps in config/data-sources.js apply.
 */
const activeRegistries = process.env.ECOSYSTEMS_REGISTRIES
  ? process.env.ECOSYSTEMS_REGISTRIES.split(',').map((r) => r.trim()).filter(Boolean)
  : REGISTRIES;
const perRegistryCap = process.env.ECOSYSTEMS_LIMIT
  ? Number(process.env.ECOSYSTEMS_LIMIT)
  : PER_REGISTRY_CAP;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function warn(msg) {
  console.warn(`[refresh-data] WARNING: ${msg}`);
}
function log(msg) {
  console.log(`[refresh-data] ${msg}`);
}

/**
 * GET with polite-pool etiquette: identify ourselves, one request per second,
 * exponential backoff on 429 / 402 / 5xx. Throws once retries are exhausted so
 * the caller can abandon the run rather than commit half a dataset.
 */
async function politeFetch(url) {
  const target = new URL(url);
  if (CONTACT) target.searchParams.set('mailto', CONTACT);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(target, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });

    if (res.ok) return res.json();

    const retryable = res.status === 429 || res.status === 402 || res.status >= 500;
    if (!retryable || attempt === MAX_RETRIES) {
      throw new Error(`HTTP ${res.status} for ${target.pathname}${target.search}`);
    }

    const backoff = REQUEST_DELAY_MS * Math.pow(2, attempt + 1);
    warn(`HTTP ${res.status} on ${target.pathname} — retrying in ${backoff}ms`);
    await sleep(backoff);
  }
  throw new Error(`exhausted retries for ${url}`);
}

/** Page through an endpoint until `limit` records are collected or results run out. */
async function fetchPaged(endpoint, params, limit) {
  const collected = [];
  let page = 1;

  while (collected.length < limit) {
    const url = new URL(`${PACKAGES_API}${endpoint}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('per_page', String(PER_PAGE));
    url.searchParams.set('page', String(page));

    const batch = await politeFetch(url.toString());
    if (!Array.isArray(batch) || batch.length === 0) break;

    collected.push(...batch);
    if (batch.length < PER_PAGE) break;

    page++;
    await sleep(REQUEST_DELAY_MS);
  }

  return collected.slice(0, limit);
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

/**
 * Remove `user@` / `user:pass@` credentials from a URL's authority.
 *
 * A handful of legacy records carry VCS URLs like
 * `svn+ssh://janey@svn.java.net/...`, which publishes an account name we have
 * no reason to redistribute. The repository location itself is kept.
 */
function stripUrlUserinfo(url) {
  if (typeof url !== 'string') return url;
  return url.replace(/^([a-z0-9+.-]+:\/\/)[^/@]*@/i, '$1');
}

/**
 * Keep only the fields the site uses, and strip every email address on the way.
 *
 * Two sources of addresses in the raw payload, both dropped here:
 *   - `maintainers[].email` — a real personal address per maintainer. Committing
 *     these would republish maintainer contact details at scale, which this
 *     project does not do under any circumstances; we never contact maintainers.
 *     Only `login` and `name` survive.
 *   - `advisories[]` — embeds security mailing-list addresses in its references,
 *     and the site only needs "are there any?". Reduced to a count.
 *
 * Some registries (Packagist) also allow an email address as the account login
 * itself, so the surviving `login`/`name` are checked and dropped if they look
 * like one. A maintainer with no safe display name is omitted; the site never
 * needs to name them, and `sole_maintainer` comes from a separate endpoint.
 */
function trimRecord(raw) {
  const out = {};
  for (const field of KEEP_FIELDS) out[field] = raw[field] ?? null;

  out.repository_url = stripUrlUserinfo(out.repository_url);

  out.maintainers = (raw.maintainers || [])
    .map((m) => ({
      login: typeof m.login === 'string' && EMAIL_RE.test(m.login) ? null : m.login ?? null,
      name: typeof m.name === 'string' && EMAIL_RE.test(m.name) ? null : m.name ?? null,
    }))
    .filter((m) => m.login || m.name);

  const advisories = Array.isArray(raw.advisories) ? raw.advisories : [];
  out.advisory_count = advisories.length;
  out.has_advisories = advisories.length > 0;

  return out;
}

function isQuiet(publishedAt) {
  if (!publishedAt) return false;
  const released = new Date(publishedAt);
  if (Number.isNaN(released.getTime())) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - QUIET_AFTER_MONTHS);
  return released < cutoff;
}

/** Stable key used to join against /check results and to honour opt-outs. */
const keyOf = (ecosystem, name) => `${ecosystem}/${name}`;

async function readJsonIfExists(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

/**
 * Write only when content actually changed, so the weekly commit history stays
 * a meaningful dated record instead of an empty heartbeat.
 */
async function writeIfChanged(file, value) {
  const next = JSON.stringify(value, null, 2) + '\n';
  let current = null;
  try {
    current = await fs.readFile(file, 'utf8');
  } catch {
    /* first run */
  }
  if (current === next) {
    log(`unchanged: ${path.relative(ROOT, file)}`);
    return false;
  }
  await fs.writeFile(file, next, 'utf8');
  log(`wrote: ${path.relative(ROOT, file)}`);
  return true;
}

async function main() {
  if (!CONTACT) {
    warn(
      'ECOSYSTEMS_CONTACT is not set — requests will be unidentified and may be ' +
        'rate-limited (HTTP 402). Set it as a repository variable.'
    );
  }

  await fs.mkdir(DATA_DIR, { recursive: true });

  const optout = await readJsonIfExists(path.join(DATA_DIR, 'optout.json'), []);
  const optedOut = new Set(
    (Array.isArray(optout) ? optout : []).map((e) => keyOf(e.ecosystem, e.name))
  );
  if (optedOut.size) log(`honouring ${optedOut.size} opt-out(s)`);

  const byKey = new Map();
  const soleMaintainerKeys = new Set();
  const perRegistry = {};

  for (const registry of activeRegistries) {
    log(`fetching ${registry}...`);

    const critical = await fetchPaged(
      '/critical',
      { registry, sort: 'dependent_repos_count', order: 'desc' },
      perRegistryCap
    );
    await sleep(REQUEST_DELAY_MS);

    const sole = await fetchPaged('/critical/sole_maintainers', { registry }, perRegistryCap);
    await sleep(REQUEST_DELAY_MS);

    for (const rec of sole) {
      if (rec?.ecosystem && rec?.name) soleMaintainerKeys.add(keyOf(rec.ecosystem, rec.name));
    }

    let kept = 0;
    for (const rec of critical) {
      if (!rec?.name || !rec?.ecosystem) continue;
      const key = keyOf(rec.ecosystem, rec.name);
      if (optedOut.has(key) || byKey.has(key)) continue;
      byKey.set(key, trimRecord(rec));
      kept++;
    }

    perRegistry[registry] = kept;
    log(`  ${registry}: ${kept} packages, ${sole.length} sole-maintainer records`);
  }

  if (byKey.size === 0) {
    throw new Error('no packages collected — refusing to overwrite existing data');
  }

  // Derive the flags the site renders and the service map keys off.
  const packages = [...byKey.entries()]
    .map(([key, pkg]) => ({
      ...pkg,
      sole_maintainer: soleMaintainerKeys.has(key),
      unfunded: !(pkg.funding_links && pkg.funding_links.length > 0),
      quiet: isQuiet(pkg.latest_release_published_at),
    }))
    // Deterministic order keeps git diffs meaningful across weekly runs.
    .sort((a, b) =>
      a.ecosystem === b.ecosystem
        ? a.name.localeCompare(b.name)
        : a.ecosystem.localeCompare(b.ecosystem)
    )
    .slice(0, TOTAL_PACKAGE_CAP);

  const counts = {
    total: packages.length,
    sole_maintainer: packages.filter((p) => p.sole_maintainer).length,
    unfunded: packages.filter((p) => p.unfunded).length,
    has_advisories: packages.filter((p) => p.has_advisories).length,
    quiet: packages.filter((p) => p.quiet).length,
    per_registry: perRegistry,
  };

  const meta = {
    fetched_at: new Date().toISOString(),
    attribution: ATTRIBUTION,
    license: 'CC-BY-SA-4.0',
    sources: [`${PACKAGES_API}/critical`, `${PACKAGES_API}/critical/sole_maintainers`],
    registries: activeRegistries,
    cap: TOTAL_PACKAGE_CAP,
    counts,
    opt_outs_honoured: optedOut.size,
  };

  // Last line of defence. Upstream keeps finding new places to put an address
  // (maintainer emails, advisory references, email-as-login, VCS userinfo), so
  // refuse to write rather than commit one to a public repo.
  const leaked = JSON.stringify(packages).match(
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
  );
  if (leaked) {
    throw new Error(
      `refusing to write: ${leaked.length} email-shaped string(s) survived trimming, ` +
        `first is "${leaked[0]}". Extend trimRecord() before re-running.`
    );
  }

  const changed = await writeIfChanged(path.join(DATA_DIR, 'critical.json'), packages);

  // _meta.json always carries a fresh timestamp, so only rewrite it when the
  // package data actually moved. Otherwise a no-op run would still dirty the tree.
  if (changed) {
    await writeIfChanged(path.join(DATA_DIR, '_meta.json'), meta);
  } else {
    const existingMeta = await readJsonIfExists(path.join(DATA_DIR, '_meta.json'), null);
    if (!existingMeta) await writeIfChanged(path.join(DATA_DIR, '_meta.json'), meta);
  }

  log(
    `done: ${counts.total} packages — ${counts.sole_maintainer} one maintainer, ` +
      `${counts.unfunded} no funding link, ${counts.quiet} quiet, ` +
      `${counts.has_advisories} with advisories`
  );
}

main().catch((err) => {
  warn(`fetch failed: ${err.message}`);
  warn('keeping previously committed data. Exiting 0 so the workflow does not fail.');
  process.exit(0);
});
