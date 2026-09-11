/**
 * Ask an avatar host for a thumbnail rather than the full-size original.
 *
 * Practitioner avatars are mostly GitHub, which serves its stored image at
 * whatever size it was uploaded — often several hundred kilobytes for a picture
 * displayed at 48 pixels. GitHub and Gravatar both take a size parameter, so
 * asking for one turns a slow load into a fast one.
 *
 * Any other host is returned untouched: guessing at a resizing convention that
 * a host does not implement would break the image entirely, and a slow avatar
 * is better than a missing one.
 */
const SIZED_HOSTS: Record<string, string> = {
  'avatars.githubusercontent.com': 's',
  'secure.gravatar.com': 's',
  'www.gravatar.com': 's',
  'gravatar.com': 's',
  'gitlab.com': 'width',
};

export function avatarThumb(url: string | null | undefined, size: number): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Relative path, or something that is not a URL at all. Leave it be.
    return url;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const param = SIZED_HOSTS[parsed.hostname.toLowerCase()];
  if (!param) return url;

  parsed.searchParams.set(param, String(size));
  return parsed.toString();
}
