/**
 * Helper to sync wishlist approval status from GitHub cache JSON
 * 
 * This merges markdown content collections with the GitHub approval status
 * from all-wishlists.json, which syncs with GitHub issue labels.
 */

interface CachedWishlist {
  id: string;
  issueNumber: number;
  approved: boolean;
  updatedAt: string;
}

interface WishlistCache {
  version: string;
  generatedAt: string;
  totalWishlists: number;
  approvedWishlists: number;
  pendingWishlists: number;
  wishlists: CachedWishlist[];
}

/**
 * Load the wishlist cache from JSON
 */
export async function loadWishlistCache(): Promise<WishlistCache | null> {
  try {
    // In production, this file should be at the root or in public/
    const response = await fetch('/all-wishlists.json');
    if (!response.ok) {
      console.warn('Wishlist cache not found, using markdown approval status');
      return null;
    }
    const cache = await response.json();
    return cache;
  } catch (error) {
    console.warn('Error loading wishlist cache:', error);
    return null;
  }
}

/**
 * Get approval status for a specific wishlist by issue number
 */
export function getApprovalStatus(
  issueNumber: number,
  cache: WishlistCache | null
): boolean | null {
  if (!cache) return null;
  
  const wishlist = cache.wishlists.find(w => w.issueNumber === issueNumber);
  return wishlist ? wishlist.approved : null;
}

/**
 * Merge approval status from cache into markdown wishlists
 * 
 * @param markdownWishlists - Wishlists from content collections
 * @param cache - Cached wishlist data from GitHub
 * @returns Wishlists with updated approval status from cache (if available)
 */
export function mergeApprovalStatus<T extends { id: number; approved: boolean }>(
  markdownWishlists: T[],
  cache: WishlistCache | null
): T[] {
  if (!cache) {
    // No cache available, return as-is
    return markdownWishlists;
  }
  
  return markdownWishlists.map(wishlist => {
    const cachedStatus = getApprovalStatus(wishlist.id, cache);
    
    // If we have a cached status, use it (GitHub is source of truth)
    if (cachedStatus !== null) {
      return {
        ...wishlist,
        approved: cachedStatus,
      };
    }
    
    // Otherwise, keep the markdown value
    return wishlist;
  });
}
