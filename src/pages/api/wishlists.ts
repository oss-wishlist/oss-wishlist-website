// API endpoint to fetch approved wishlists from content collections
// 
// NOTE: This endpoint reads from markdown content collections (src/content/wishlists/)
// which are the source of truth for the website. Only returns APPROVED wishlists.
// The GitHub JSON (all-wishlists.json) is maintained separately for external consumers.
//
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

interface Wishlist {
  id: number;
  projectName: string;
  repositoryUrl: string;
  wishlistUrl: string;
  maintainerUsername: string;
  maintainerAvatarUrl: string;
  approved: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  wishes: string[];
  urgency: string;
  projectSize?: string;
  additionalNotes?: string;
  technologies?: string[];
}

export const prerender = false;

async function fetchWishlistsFromContentCollections(): Promise<Wishlist[]> {
  try {
    console.log('[wishlists] Fetching from content collections');
    
    // Load all wishlists from content collections
    const allWishlists = await getCollection('wishlists');
    
    // Filter to only approved wishlists and map to API format
    const approvedWishlists = allWishlists
      .filter((entry) => entry.data.approved === true)
      .map((entry) => ({
        id: entry.data.id,
        projectName: entry.data.projectName,
        repositoryUrl: entry.data.repositoryUrl,
        wishlistUrl: entry.data.issueUrl,
        maintainerUsername: entry.data.maintainerUsername,
        maintainerAvatarUrl: entry.data.maintainerAvatarUrl || `https://github.com/${entry.data.maintainerUsername}.png`,
        approved: entry.data.approved,
        status: 'approved',
        created_at: entry.data.createdAt,
        updated_at: entry.data.updatedAt,
        wishes: entry.data.wishes || [],
        urgency: entry.data.urgency || 'medium',
        projectSize: entry.data.projectSize,
        additionalNotes: entry.data.additionalNotes,
        technologies: entry.data.technologies || [],
      }));
    
    console.log(`[wishlists] Loaded ${approvedWishlists.length} approved wishlists from content collections`);
    return approvedWishlists;
  } catch (error) {
    console.error('[wishlists] Error fetching from content collections:', error);
    // Return empty array if no wishlists exist yet
    return [];
  }
}

export const GET: APIRoute = async () => {
  try {
    // Fetch approved wishlists from content collections
    const approvedWishlists = await fetchWishlistsFromContentCollections();
    
    console.log(`[wishlists] Returning ${approvedWishlists.length} approved wishlists`);

    // Build response object
    const response = {
      wishlists: approvedWishlists,
      metadata: {
        total: approvedWishlists.length,
        approved: approvedWishlists.length,
        source: 'content-collections',
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store', // Don't cache - we want fresh data from markdown
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