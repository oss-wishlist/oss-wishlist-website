/**
 * "Do you depend on this?" — resolve a repository to its dependencies and
 * intersect them with the cached critical set.
 *
 * Runs on the server so requests carry the polite-pool identification and no
 * CORS is involved. This is the only place the site talks to ecosyste.ms at
 * request time; everything else reads the committed cache.
 *
 * No parsing, no file upload, no storage. Nothing about a lookup is recorded.
 */

import { REPOS_API } from '../../config/data-sources.js';
import { getAllPackages, packageKey, type CriticalPackage } from './critical-packages';

const USER_AGENT =
  'oss-wishlist-website/1.0 (+https://github.com/oss-wishlist/oss-wishlist-website)';

/** Hosts ecosyste.ms indexes that we accept, mapped to its own hostName segment. */
const SUPPORTED_HOSTS: Record<string, string> = {
  'github.com': 'GitHub',
  'gitlab.com': 'GitLab',
};

export interface ParsedRepo {
  host: string;
  owner: string;
  name: string;
  label: string;
}

export type CheckOutcome =
  | { status: 'ok'; repo: ParsedRepo; matches: CriticalPackage[]; dependencyCount: number }
  | { status: 'invalid'; message: string }
  | { status: 'not-found'; repo: ParsedRepo; message: string }
  | { status: 'not-indexed'; repo: ParsedRepo; message: string }
  | { status: 'no-manifests'; repo: ParsedRepo; message: string }
  | { status: 'rate-limited'; message: string }
  | { status: 'error'; message: string };

/**
 * Accepts a full URL, a bare `owner/repo`, an SSH remote, or any of those with a
 * trailing `.git` or extra path segments. Anything else is rejected with a plain
 * sentence rather than a parser error.
 */
export function parseRepoInput(raw: string): ParsedRepo | null {
  const input = raw.trim();
  if (!input) return null;

  let host = 'github.com';
  let path = input;

  const sshMatch = input.match(/^git@([^:]+):(.+)$/i);
  if (sshMatch) {
    host = sshMatch[1].toLowerCase();
    path = sshMatch[2];
  } else if (/^[a-z]+:\/\//i.test(input)) {
    try {
      const url = new URL(input);
      host = url.hostname.toLowerCase();
      path = url.pathname;
    } catch {
      return null;
    }
  } else if (input.includes('.') && input.split('/')[0].includes('.')) {
    // Bare "github.com/owner/repo" with no scheme.
    const [maybeHost, ...rest] = input.split('/');
    host = maybeHost.toLowerCase();
    path = rest.join('/');
  }

  host = host.replace(/^www\./, '');
  if (!SUPPORTED_HOSTS[host]) return null;

  const segments = path
    .replace(/\.git$/i, '')
    .split('/')
    .filter(Boolean);

  if (segments.length < 2) return null;

  const [owner, name] = segments;
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(name)) return null;

  return { host, owner, name, label: `${owner}/${name}` };
}

interface Manifest {
  ecosystem?: string;
  dependencies?: Array<{ package_name?: string; ecosystem?: string; direct?: boolean }>;
}

export async function checkRepository(raw: string): Promise<CheckOutcome> {
  const repo = parseRepoInput(raw);
  if (!repo) {
    return {
      status: 'invalid',
      message:
        'That does not look like a GitHub or GitLab repository. Try a link like https://github.com/owner/repo.',
    };
  }

  const hostSegment = SUPPORTED_HOSTS[repo.host];
  // The owner/repo slash is encoded as %2F — it is one path segment to the API.
  const slug = encodeURIComponent(`${repo.owner}/${repo.name}`);
  const url = `${REPOS_API}/hosts/${hostSegment}/repositories/${slug}/manifests`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
  } catch {
    return {
      status: 'error',
      message: 'We could not reach the dependency service just now. Please try again in a moment.',
    };
  }

  if (response.status === 404) {
    return {
      status: 'not-indexed',
      repo,
      message: `${repo.label} has not been indexed yet, so we cannot read its dependencies. This is common for new or private repositories.`,
    };
  }

  if (response.status === 429 || response.status === 402) {
    return {
      status: 'rate-limited',
      message: 'The dependency service is rate limiting requests right now. Please try again in a few minutes.',
    };
  }

  if (!response.ok) {
    return {
      status: 'error',
      message: 'The dependency service returned an unexpected response. Please try again later.',
    };
  }

  let manifests: Manifest[];
  try {
    manifests = await response.json();
  } catch {
    return { status: 'error', message: 'We could not read the response for that repository.' };
  }

  if (!Array.isArray(manifests) || manifests.length === 0) {
    return {
      status: 'no-manifests',
      repo,
      message: `We found ${repo.label}, but it has no dependency manifests we can read.`,
    };
  }

  // Flatten to unique {ecosystem, package_name} pairs.
  const pairs = new Set<string>();
  for (const manifest of manifests) {
    for (const dep of manifest.dependencies ?? []) {
      const ecosystem = dep.ecosystem ?? manifest.ecosystem;
      if (ecosystem && dep.package_name) pairs.add(packageKey(ecosystem, dep.package_name));
    }
  }

  const matches = getAllPackages().filter((pkg) =>
    pairs.has(packageKey(pkg.ecosystem, pkg.name))
  );

  return { status: 'ok', repo, matches, dependencyCount: pairs.size };
}
