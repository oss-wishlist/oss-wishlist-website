/**
 * Where to send someone after they sign in.
 *
 * The destination comes from a cookie or a query parameter, so it is attacker
 * controlled and has to end up pointing at this site. The previous version
 * handled the obvious case — `https://evil.example` was parsed and reduced to
 * its path — but not the forms that do not look like URLs:
 *
 *   //evil.example      a protocol-relative URL; the browser treats it as
 *                       https://evil.example
 *   ///evil.example     the same, with a slash browsers discard
 *   /\evil.example      browsers normalise a backslash to a slash here
 *   \\evil.example      likewise
 *
 * Each of those starts with a slash, so a `startsWith('/')` check passes them.
 * The rule that actually holds is: one leading slash, and the next character is
 * not another slash or a backslash.
 */

/** A path is safe if it is site-relative and cannot be read as a host. */
export function isSafeReturnPath(path: string): boolean {
  if (!path || path[0] !== '/') return false;
  // A second slash or a backslash in position 1 makes it a host, not a path.
  if (path[1] === '/' || path[1] === '\\') return false;
  // A backslash anywhere is not something our own links produce, and browsers
  // treat it as a slash, so it can only be an attempt to smuggle a host.
  if (path.includes('\\')) return false;
  // Control characters, which some parsers strip before resolving the URL.
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(path)) return false;
  return true;
}

/**
 * Normalise a requested destination to a safe, site-relative path.
 *
 * Anything that is not clearly a path on this site becomes `/`. Returning the
 * home page is always correct: the worst case is that someone lands a page
 * earlier than they wanted, rather than on somebody else's site.
 */
export function normalizeReturnPath(raw: string, basePath: string = '/'): string {
  let path = (raw || '').trim();
  if (!path) return '/';

  // A full URL contributes only its path, and only if it is http(s).
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) {
    try {
      const url = new URL(path);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '/';
      path = url.pathname + url.search + url.hash;
    } catch {
      return '/';
    }
  }

  // Drop a duplicated base path prefix, as the original did.
  const base = basePath.endsWith('/') ? basePath : basePath + '/';
  if (base !== '/' && path.startsWith(base)) {
    path = path.slice(base.length - 1);
  }

  if (!path.startsWith('/')) path = '/' + path;
  if (!isSafeReturnPath(path)) return '/';
  if (path === '/login') return '/';

  return path;
}
