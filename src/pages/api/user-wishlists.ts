// API endpoint to fetch all wishlists (approved and pending) for a specific user
// This allows authenticated users to see both their approved and pending wishlists
import type { APIRoute } from 'astro';
import { getWishlistsByMaintainer } from '../../lib/db.js';

export const prerender = false;

async function fetchUserWishlists(username: string): Promise<any[]> {
  try {
    // Load wishlists from database
    const dbWishlists = await getWishlistsByMaintainer(username);
    
    // Map to API format
    const userWishlists = dbWishlists.map((wishlist) => ({
      project: wishlist.project_name,
      services: wishlist.wishes || [],
      urgency: wishlist.urgency || 'medium',
      projectSize: wishlist.project_size || 'medium',
      timeline: '',
      organizationType: wishlist.organization_type || 'single-maintainer',
      organizationName: wishlist.organization_name || '',
      otherOrganizationType: wishlist.other_organization_type || '',
      additionalNotes: wishlist.additional_notes || '',
      technologies: wishlist.technologies || [],
      resources: wishlist.resources || [],
      openToSponsorship: wishlist.open_to_sponsorship || false,
      repository: wishlist.repository_url || '',
      maintainer: wishlist.maintainer_username,
      id: wishlist.id,
      approvalStatus: wishlist.approved ? 'approved' : 'pending',
      issueUrl: wishlist.issue_url,
      createdAt: wishlist.created_at,
      updatedAt: wishlist.updated_at,
    }));

    // Sort: newest first
    userWishlists.sort((a: any, b: any) => {
      const dateA = new Date(b.updatedAt).getTime();
      const dateB = new Date(a.updatedAt).getTime();
      return dateA - dateB;
    });

    console.log(`[user-wishlists] Loaded ${userWishlists.length} wishlists for ${username} from database`);
    return userWishlists;
  } catch (error) {
    console.error('[user-wishlists] Error fetching wishlists from database:', error);
    return [];
  }
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const username = url.searchParams.get('username');
    if (!username) {
      return new Response(
        JSON.stringify({ error: 'Missing username parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const wishlists = await fetchUserWishlists(username);

    return new Response(JSON.stringify({ wishlists }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store', // Don't cache - we want fresh data from database
      },
    });
  } catch (error) {
    console.error('[user-wishlists] API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch user wishlists',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
