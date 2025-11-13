// API endpoint to fetch all wishlists (approved and pending) for a specific user
// This allows authenticated users to see both their approved and pending wishlists
//
// NOTE: This endpoint reads from markdown content collections (src/content/wishlists/)
// which are the source of truth for the website. The GitHub JSON is only for external consumers.
//
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = false;

async function fetchUserWishlists(username: string): Promise<any[]> {
  try {
    // Load wishlists from content collections
    const allWishlists = await getCollection('wishlists');
    
    // Filter to wishlists for this user
    const userWishlists = allWishlists
      .filter((entry) => entry.data.maintainerUsername === username)
      .map((entry) => ({
        project: entry.data.projectName,
        services: entry.data.wishes || [],
        urgency: entry.data.urgency || 'medium',
        projectSize: entry.data.projectSize || 'medium',
        timeline: '',
        organizationType: 'single-maintainer',
        organizationName: '',
        otherOrganizationType: '',
        additionalNotes: entry.data.additionalNotes || '',
        technologies: entry.data.technologies || [],
        resources: entry.data.resources || [],
        openToSponsorship: false,
        repository: entry.data.repositoryUrl || '',
        maintainer: entry.data.maintainerUsername,
        id: entry.data.id,
        approvalStatus: entry.data.approved ? 'approved' : 'pending',
        issueUrl: entry.data.issueUrl,
        createdAt: entry.data.createdAt,
        updatedAt: entry.data.updatedAt,
      }));

    // Sort: newest first
    userWishlists.sort((a: any, b: any) => {
      const dateA = new Date(b.updatedAt).getTime();
      const dateB = new Date(a.updatedAt).getTime();
      return dateA - dateB;
    });

    console.log(`[user-wishlists] Loaded ${userWishlists.length} wishlists for ${username} from content collections`);
    return userWishlists;
  } catch (error) {
    console.error('[user-wishlists] Error fetching wishlists from content collections:', error);
    // Return empty array if no wishlists exist yet (new user or no markdown files)
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
        'Cache-Control': 'no-store', // Don't cache - we want fresh data from markdown
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
