/**
 * Convert a string to a URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Extract repository name from GitHub URL
 * Examples:
 *   https://github.com/owner/repo -> repo
 *   https://github.com/owner/repo-name -> repo-name
 */
export function extractRepoName(repositoryUrl: string): string {
  try {
    const url = new URL(repositoryUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return parts[1]; // Return the repo name (second part)
    }
  } catch (e) {
    console.error('Invalid repository URL:', repositoryUrl);
  }
  return 'unknown-repo';
}

/**
 * Generate a unique wishlist slug from repository URL and issue number
 * Uses repo name (immutable) instead of project title (editable)
 * This ensures the slug stays the same even if title changes
 */
export function generateWishlistSlug(repositoryUrl: string, issueNumber: number): string {
  const repoName = extractRepoName(repositoryUrl);
  const baseSlug = slugify(repoName);
  return `${baseSlug}-${issueNumber}`;
}

