import type { APIRoute } from 'astro';
import { getAllWishlists } from '../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { repositoryUrls } = await request.json();
    
    if (!Array.isArray(repositoryUrls) || repositoryUrls.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid repository URLs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch all wishlists from database
    const wishlists = await getAllWishlists();
    
    // Create a map of repository URLs to wishlist info
    const results: Record<string, { 
      exists: boolean; 
      issueUrl?: string; 
      issueNumber?: number; 
      isApproved?: boolean; 
      projectTitle?: string 
    }> = {};
    
    // Initialize all requested URLs as not existing
    for (const url of repositoryUrls) {
      results[url] = { exists: false };
    }
    
    // Check each wishlist against requested URLs
    for (const wishlist of wishlists) {
      const repoUrl = wishlist.repository_url.toLowerCase();
      
      // Check if this repo URL matches any of the requested URLs
      for (const requestedUrl of repositoryUrls) {
        if (requestedUrl.toLowerCase() === repoUrl) {
          results[requestedUrl] = {
            exists: true,
            issueUrl: wishlist.issue_url || `/wishlist/${wishlist.id}`,
            issueNumber: wishlist.id,
            isApproved: wishlist.approved,
            projectTitle: wishlist.project_name,
          };
          break;
        }
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error checking existing wishlists:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
