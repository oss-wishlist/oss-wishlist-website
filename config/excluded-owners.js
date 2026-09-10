/**
 * Packages we do not ask anyone to sponsor.
 *
 * These are maintained by organisations that can comfortably fund the work
 * themselves. Listing them alongside a package held up by one unpaid person
 * weakens the argument this site exists to make, and nobody reading it is going
 * to sponsor a governance review for Microsoft.
 *
 * This is about who carries the cost, not about the quality of the software or
 * the people who write it.
 *
 * Excluded packages disappear from browsing, from the dependency check, from
 * their own page and from the sitemap, exactly as an opt-out does.
 *
 * Matching is deliberately explicit. Two ways in:
 *   - `repository` matches against repository_url, which is the reliable signal.
 *   - `name` matches the package name, needed where the registry namespace is
 *     the only evidence (Maven `com.google.*`, NuGet `Microsoft.*`).
 *
 * Judgement calls worth knowing about:
 *   - `golang.org/x/*` is the Go team at Google, so it is excluded.
 *   - NuGet `System.*` is .NET, maintained by Microsoft and the .NET Foundation.
 *   - Community forks that merely live under one of these orgs will be caught
 *     too. If that matters, move the specific package to an allowance here
 *     rather than loosening the patterns.
 */

export const EXCLUDED_OWNERS = [
  {
    org: 'Google',
    repository: /github\.com\/(google|googleapis|GoogleCloudPlatform|GoogleChrome|grpc|angular|protocolbuffers|bazelbuild|golang)\//i,
    name: /^(com\.google|com\.android|google-|googleapis|golang\.org\/x\/|cloud\.google\.com\/|@angular\/)/i,
  },
  {
    org: 'Microsoft',
    repository: /github\.com\/(microsoft|dotnet|Azure|NuGet|OfficeDev|PowerShell)\//i,
    name: /^(Microsoft\.|System\.|Azure\.|@microsoft\/|@azure\/)/i,
  },
  {
    org: 'Meta',
    repository: /github\.com\/(facebook|facebookincubator|facebookresearch|pytorch)\//i,
    name: /^(com\.facebook|@react-native)/i,
  },
];

/** True when a package belongs to one of the organisations above. */
export function isExcludedOwner(pkg) {
  const repo = pkg.repository_url || '';
  const name = pkg.name || '';
  return EXCLUDED_OWNERS.some(
    (owner) => (repo && owner.repository.test(repo)) || owner.name.test(name)
  );
}
