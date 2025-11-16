// API endpoint to fetch approved wishlists from database
import type { APIRoute } from 'astro';
import { getApprovedWishlists } from '../../lib/db.js';
import { getBasePath } from '../../lib/paths.js';

interface MinimalWishlist {
  id: string;
  repositoryUrl: string;
  wishlistUrl: string;
}

export const prerender = false;

/**
 * Extract repository name from GitHub URL
 * e.g., "https://github.com/emma/awesomelibrary" -> "awesomelibrary"
 */
function extractRepoName(repoUrl: string): string {
  try {
    const url = new URL(repoUrl);
    const parts = url.pathname.split('/').filter(p => p);
    // Get last part (repo name)
    return parts[parts.length - 1] || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function fetchWishlistsFromDatabase(): Promise<MinimalWishlist[]> {
  try {
    console.log('[wishlists] Fetching from database');
    
    // Load approved wishlists from database
    const dbWishlists = await getApprovedWishlists();
    
    const basePath = getBasePath();
    const baseUrl = process.env.PUBLIC_URL || 'https://oss-wishlist.org';
    
    // Map to minimal format for public JSON feed
    const minimalWishlists = dbWishlists.map((wishlist) => {
      const repoName = extractRepoName(wishlist.repository_url);
      const id = `${wishlist.id}-${repoName}`;
      const wishlistUrl = `${baseUrl}${basePath}fulfill?issue=${wishlist.id}`;
      
      return {
        id,
        repositoryUrl: wishlist.repository_url,
        wishlistUrl
      };
    });
    
    console.log(`[wishlists] Loaded ${minimalWishlists.length} approved wishlists from database`);
    return minimalWishlists;
  } catch (error) {
    console.error('[wishlists] Error fetching from database:', error);
    return [];
  }
}

export const GET: APIRoute = async ({ url }) => {
  try {
    // Fetch approved wishlists from database
    const minimalWishlists = await fetchWishlistsFromDatabase();
    
    console.log(`[wishlists] Returning ${minimalWishlists.length} approved wishlists`);

    // Build minimal response object
    const response = {
      wishlists: minimalWishlists,
      metadata: {
        total: minimalWishlists.length
      }
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('[wishlists] Error fetching wishlists:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch wishlists',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};