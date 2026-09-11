/**
 * Who is an administrator.
 *
 * Two things were wrong with deciding this inline in each route.
 *
 * The list fell back to a username written into the source, so a deployment
 * that forgot to set the variable did not lose its administrators — it granted
 * the role to whoever held that name. Missing configuration now means no
 * administrators at all, which is the safe direction to fail in.
 *
 * And the check matched a bare username against `login || username`, which are
 * the GitHub and GitLab fields respectively. Those are separate namespaces:
 * the GitLab account called `octocat` has nothing to do with the GitHub one.
 * Signing in through either provider under the right name was enough. An entry
 * is now tied to the provider that issued it.
 */

export type AdminSession = {
  provider?: string | null;
  user?: {
    login?: string | null;
    username?: string | null;
  } | null;
} | null | undefined;

/** Providers we accept a login from. Anything else cannot hold the role. */
const KNOWN_PROVIDERS = new Set(['github', 'gitlab']);

function readRawList(): string {
  // import.meta.env at build time, process.env at run time on the server.
  const fromImport =
    typeof import.meta !== 'undefined' ? (import.meta as any).env?.ADMIN_USERNAMES : undefined;
  const fromProcess = typeof process !== 'undefined' ? process.env?.ADMIN_USERNAMES : undefined;
  return (fromImport || fromProcess || '').trim();
}

/**
 * The configured administrators, as `provider:username`, lowercased.
 *
 * Accepts either `github:emmairwin` or a bare `emmairwin`. A bare entry means
 * GitHub, which is what the previous check effectively meant by `login` and
 * keeps an existing ADMIN_USERNAMES value working. Name the provider to be
 * explicit, and to grant the role on GitLab.
 */
export function adminIdentities(): Set<string> {
  const raw = readRawList();
  if (!raw) return new Set();

  const identities = new Set<string>();
  for (const part of raw.split(',')) {
    const entry = part.trim().toLowerCase();
    if (!entry) continue;

    const colon = entry.indexOf(':');
    if (colon === -1) {
      identities.add(`github:${entry}`);
      continue;
    }

    const provider = entry.slice(0, colon);
    const name = entry.slice(colon + 1);
    if (!name || !KNOWN_PROVIDERS.has(provider)) continue;
    identities.add(`${provider}:${name}`);
  }
  return identities;
}

/**
 * Is this session an administrator?
 *
 * False for an absent session, an absent username, an unrecognised provider,
 * and — deliberately — for every session when ADMIN_USERNAMES is not set.
 */
export function isAdminSession(session: AdminSession): boolean {
  const identities = adminIdentities();
  if (identities.size === 0) {
    console.error(
      '[admin] ADMIN_USERNAMES is not set, so no one has administrator access. ' +
        'Set it to something like "github:your-username".'
    );
    return false;
  }

  const name = (session?.user?.login || session?.user?.username || '').trim().toLowerCase();
  if (!name) return false;

  // Sessions created before the provider was recorded came from GitHub.
  const provider = (session?.provider || 'github').trim().toLowerCase();
  if (!KNOWN_PROVIDERS.has(provider)) return false;

  return identities.has(`${provider}:${name}`);
}

/** How to describe the signed-in admin in a log line. */
export function adminLabel(session: AdminSession): string {
  const name = session?.user?.login || session?.user?.username || 'unknown';
  const provider = session?.provider || 'github';
  return `${provider}:${name}`;
}
