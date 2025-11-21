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
        const repoUrl = match[2];
        const normalizedUrl = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
        existingWishlists[normalizedUrl] = {
          issueUrl: issue.html_url,
          issueNumber: issue.number,
          isApproved: isApproved,
          projectTitle: issue.title,
        };
      }
      
      // 2. Plain URLs (like in "### Project Repository URL" section)
      const urlMatches = body.matchAll(/https?:\/\/[^\s\)]+/g);
      for (const match of urlMatches) {
        const repoUrl = match[0];
        // Only process URLs with allowed hosts (GitHub, GitLab, Bitbucket)
        try {
          const parsedUrl = new URL(repoUrl);
          const allowedHosts = ['github.com', 'gitlab.com', 'bitbucket.org'];
          if (allowedHosts.includes(parsedUrl.hostname)) {
            const normalizedUrl = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
            existingWishlists[normalizedUrl] = {
              issueUrl: issue.html_url,
              issueNumber: issue.number,
              isApproved: isApproved,
              projectTitle: issue.title,
            };
          }
        } catch (e) {
          // Ignore invalid URLs
        }
      }
    }
    
    // Check which of the requested repositories have existing wishlists
    const results: Record<string, { exists: boolean; issueUrl?: string; issueNumber?: number; isApproved?: boolean; projectTitle?: string }> = {};
    
    for (const url of repositoryUrls) {
      const normalizedUrl = url.replace(/\.git$/, '').replace(/\/$/, '');
      
      if (existingWishlists[normalizedUrl]) {
        results[url] = {
          exists: true,
          issueUrl: existingWishlists[normalizedUrl].issueUrl,
          issueNumber: existingWishlists[normalizedUrl].issueNumber,
          isApproved: existingWishlists[normalizedUrl].isApproved,
          projectTitle: existingWishlists[normalizedUrl].projectTitle,
        };
      } else {
        results[url] = { exists: false };
      }
    }
    
    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error checking existing wishlists:', error);
    return new Response(JSON.stringify({ error: 'Failed to check existing wishlists' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
