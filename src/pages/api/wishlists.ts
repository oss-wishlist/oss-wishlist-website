// API endpoint to fetch approved wishlists from database
import type { APIRoute } from 'astro';
import { getApprovedWishlists } from '../../lib/db.js';

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

async function fetchWishlistsFromDatabase(): Promise<Wishlist[]> {
  try {
    console.log('[wishlists] Fetching from database');
    
    // Load approved wishlists from database
    const dbWishlists = await getApprovedWishlists();
    
    // Map to API format
    const approvedWishlists = dbWishlists.map((wishlist) => ({
      id: wishlist.id,
      projectName: wishlist.project_name,
      repositoryUrl: wishlist.repository_url,
      wishlistUrl: wishlist.issue_url,
      maintainerUsername: wishlist.maintainer_username,
      maintainerAvatarUrl: wishlist.maintainer_avatar_url || `https://github.com/${wishlist.maintainer_username}.png`,
      approved: wishlist.approved,
      status: wishlist.status,
      created_at: wishlist.created_at.toISOString(),
      updated_at: wishlist.updated_at.toISOString(),
      wishes: wishlist.wishes || [],
      urgency: wishlist.urgency || 'medium',
      projectSize: wishlist.project_size,
      additionalNotes: wishlist.additional_notes,
      technologies: wishlist.technologies || [],
    }));
    
    console.log(`[wishlists] Loaded ${approvedWishlists.length} approved wishlists from database`);
    return approvedWishlists;
  } catch (error) {
    console.error('[wishlists] Error fetching from database:', error);
    return [];
  }
}

export const GET: APIRoute = async () => {
  try {
    // Fetch approved wishlists from database
    const approvedWishlists = await fetchWishlistsFromDatabase();
    
    console.log(`[wishlists] Returning ${approvedWishlists.length} approved wishlists`);

    // Build response object
    const response = {
      wishlists: approvedWishlists,
      metadata: {
        total: approvedWishlists.length,
        approved: approvedWishlists.length,
        source: 'database',
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
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