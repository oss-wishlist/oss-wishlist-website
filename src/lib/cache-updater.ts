/**
 * Cache Updater - Updates all-wishlists.json cache immediately after create/delete
 * This ensures wishlist appears/disappears instantly without waiting for GitHub Action
 */

export interface CacheWishlist {
  id: number;
  projectName: string;
  repositoryUrl: string;
  maintainerUsername: string;
  maintainerAvatarUrl: string;
  approved: boolean;
  wishes: string[];
  technologies: string[];
  resources: string[];
  urgency: string;
  projectSize: string;
  additionalNotes: string;
  additionalContext: string;
  status: 'approved' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface CacheData {
  version: string;
  generatedAt: string;
  totalWishlists: number;
  approvedCount: number;
  pendingCount: number;
  ecosystemStats: Record<string, number>;
  serviceStats: Record<string, number>;
  wishlists: CacheWishlist[];
}

/**
 * Fetch current cache from GitHub
 */
export async function fetchCacheFromGitHub(): Promise<CacheData | null> {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/oss-wishlist/wishlists/main/all-wishlists.json',
      { cache: 'no-store' }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching cache from GitHub:', error);
    return null;
  }
}

/**
 * Convert CacheWishlist to component Wishlist format
 * Maps cache field names to component field names
 */
export function cacheWishlistToComponentWishlist(cache: CacheWishlist): any {
  return {
    id: cache.id,
    project: cache.projectName,
    maintainer: cache.maintainerUsername,
    repository: cache.repositoryUrl,
    urgency: cache.urgency,
    projectSize: cache.projectSize,
    services: cache.wishes,
    technologies: cache.technologies,
    additionalNotes: cache.additionalNotes,
    approvalStatus: cache.status === 'approved' ? 'approved' : 'pending',
    createdAt: cache.createdAt,
    updatedAt: cache.updatedAt,
  };
}

/**
 * Parse issue body and extract form data
 */
export function parseIssueToWishlist(issue: any): CacheWishlist {
  const isApproved = issue.labels?.some((label: any) => label.name === 'approved-wishlist') || false;
  const body = issue.body || '';

  function extractSection(sectionHeader: string): string {
    const regex = new RegExp(`### ${sectionHeader}\n([\\s\\S]*?)(?=###|$)`, 'i');
    const match = body.match(regex);
    return match ? match[1].trim() : '';
  }

  function parseCheckboxes(content: string): string[] {
    const lines = content.split('\n');
    return lines
      .filter((line) => line.includes('[x]'))
      .map((line) => {
        const match = line.match(/\[x\]\s*(.+?)(?:\s*-|$)/);
        return match ? match[1].trim() : '';
      })
      .filter((item) => item.length > 0);
  }

  function parseCommaSeparated(content: string): string[] {
    return content
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  const projectName = extractSection('Project Name').trim();
  const maintainerUsername = extractSection('Maintainer GitHub Username')
    .trim()
    .replace(/^@/, '');
  const repositoryUrl = extractSection('Project Repository').trim();
  const ecosystemsText = extractSection('Package Ecosystems');
  const technologies = parseCommaSeparated(ecosystemsText);
  const servicesText = extractSection('Services Requested');
  const wishes = parseCheckboxes(servicesText);
  const resourcesText = extractSection('Resources Requested');
  const resources = parseCheckboxes(resourcesText);
  const urgencyText = extractSection('Urgency Level');
  const projectSize = extractSection('Project Size').trim();
  const additionalNotes = extractSection('Additional Notes').trim();
  const additionalContext = extractSection('Additional Context').trim();

  const urgencyMatch = urgencyText.match(/^\s*(.+?)(?:\s*-|$)/m);
  const urgency = urgencyMatch ? urgencyMatch[1].trim() : '';

  return {
    id: issue.number,
    projectName: projectName || `Wishlist: ${issue.title}`,
    repositoryUrl,
    maintainerUsername,
    maintainerAvatarUrl: maintainerUsername ? `https://github.com/${maintainerUsername}.png` : '',
    approved: isApproved,
    wishes,
    technologies,
    resources,
    urgency,
    projectSize,
    additionalNotes,
    additionalContext,
    status: isApproved ? 'approved' : 'pending',
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
  };
}

/**
 * Add or update wishlist in cache
 */
export function addWishlistToCache(cache: CacheData, wishlist: CacheWishlist): CacheData {
  // Remove if exists (to avoid duplicates)
  const filtered = cache.wishlists.filter((w) => w.id !== wishlist.id);
  
  // Add new/updated wishlist
  const updated = [...filtered, wishlist];
  
  // Recalculate stats
  const approvedCount = updated.filter((w) => w.approved).length;
  const allTechnologies = [...new Set(updated.flatMap((w) => w.technologies))].sort();
  const allServices = [...new Set(updated.flatMap((w) => w.wishes))].sort();

  return {
    ...cache,
    generatedAt: new Date().toISOString(),
    totalWishlists: updated.length,
    approvedCount,
    pendingCount: updated.length - approvedCount,
    ecosystemStats: allTechnologies.reduce((acc, tech) => {
      acc[tech] = updated.filter((w) => w.technologies.includes(tech)).length;
      return acc;
    }, {} as Record<string, number>),
    serviceStats: allServices.reduce((acc, service) => {
      acc[service] = updated.filter((w) => w.wishes.includes(service)).length;
      return acc;
    }, {} as Record<string, number>),
    wishlists: updated,
  };
}

/**
 * Remove wishlist from cache
 */
export function removeWishlistFromCache(cache: CacheData, wishlistId: number): CacheData {
  const filtered = cache.wishlists.filter((w) => w.id !== wishlistId);
  
  // Recalculate stats
  const approvedCount = filtered.filter((w) => w.approved).length;
  const allTechnologies = [...new Set(filtered.flatMap((w) => w.technologies))].sort();
  const allServices = [...new Set(filtered.flatMap((w) => w.wishes))].sort();

  return {
    ...cache,
    generatedAt: new Date().toISOString(),
    totalWishlists: filtered.length,
    approvedCount,
    pendingCount: filtered.length - approvedCount,
    ecosystemStats: allTechnologies.reduce((acc, tech) => {
      acc[tech] = filtered.filter((w) => w.technologies.includes(tech)).length;
      return acc;
    }, {} as Record<string, number>),
    serviceStats: allServices.reduce((acc, service) => {
      acc[service] = filtered.filter((w) => w.wishes.includes(service)).length;
      return acc;
    }, {} as Record<string, number>),
    wishlists: filtered,
  };
}
