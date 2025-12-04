// API endpoint to fetch approved wishlists from database
import type { APIRoute } from 'astro';
import { getApprovedWishlists } from '../../lib/db.js';

interface Wishlist {
  id: number;
  projectName: string;
  repositoryUrl: string;
  projectDescription?: string;
  maintainerUsername: string;
  maintainerEmail?: string;
  maintainerAvatarUrl: string;
  approved: boolean;
  issueState: string;
  created_at: string;
  updated_at: string;
  wishes: string[];
  technologies: string[];
  urgency: string;
  projectSize?: string;
  additionalNotes?: string;
  organizationType?: string;
  organizationName?: string;
}

export const prerender = false;

async function fetchWishlistsFromDatabase(): Promise<Wishlist[]> {
  try {
    // Load approved wishlists from database
    const dbWishlists = await getApprovedWishlists();
    
    // Map to API format with full data for wishlists page
    const approvedWishlists = dbWishlists.map((wishlist) => ({
      id: wishlist.id,
      projectName: wishlist.project_name,
      repositoryUrl: wishlist.repository_url,
      projectDescription: wishlist.project_description,
      maintainerUsername: wishlist.maintainer_username,
      maintainerEmail: wishlist.maintainer_email,
      // Use local logo to avoid cross-site cookie errors with GitHub images
      maintainerAvatarUrl: '/images/oss-wishlist-logo.jpg',
      approved: wishlist.approved,
      issueState: wishlist.issue_state,
      created_at: wishlist.created_at.toISOString(),
      updated_at: wishlist.updated_at.toISOString(),
      wishes: wishlist.wishes || [],
      technologies: wishlist.technologies || [],
      urgency: wishlist.urgency || 'medium',
      projectSize: wishlist.project_size,
      additionalNotes: wishlist.additional_notes,
      organizationType: wishlist.organization_type,
      organizationName: wishlist.organization_name,
      wishlistUrl: `https://oss-wishlist.com/fulfill?issue=${wishlist.id}`,
    }));
    
    return approvedWishlists;
  } catch (error) {
    console.error('[wishlists] Error fetching from database:', error);
    return [];
  }
}

export const GET: APIRoute = async () => {
  try {
    // Fetch approved wishlists from database with full data
    const approvedWishlists = await fetchWishlistsFromDatabase();

    // Build response object with full data
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
        'Cache-Control': 'public, max-age=300, s-maxage=600',
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