import type { APIRoute } from 'astro';
import { verifySession } from '../../lib/github-oauth';
import { GITHUB_CONFIG } from '../../config/github';
import { deleteWishlistMarkdown } from '../../lib/wishlist-markdown';
import { generateWishlistSlug } from '../../lib/slugify';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Get and verify session
    const sessionCookie = cookies.get('github_session');
    
    if (!sessionCookie?.value) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'You must be logged in to close a wishlist'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET;
    const session = verifySession(sessionCookie.value, sessionSecret);
    
    if (!session) {
      cookies.delete('github_session', { path: '/' });
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Invalid session. Please log in again.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { issueNumber } = body;

    if (!issueNumber) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: 'Issue number is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get GitHub token from session
    const githubToken = session.accessToken;
    if (!githubToken) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'GitHub authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use bot token for writing to the wishlists repo
    const botToken = import.meta.env.GITHUB_TOKEN;
    if (!botToken) {
      return new Response(JSON.stringify({
        error: 'Configuration Error',
        message: 'GitHub bot token not configured'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const username = session.user?.login || session.user?.name || 'unknown';

    // First, add a comment to the issue using bot token
    const commentResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_CONFIG.ORG}/${GITHUB_CONFIG.REPO}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'OSS-Wishlist-Bot'
        },
        body: JSON.stringify({
          body: `Wishlist closed by @${username} via website`
        })
      }
    );

    if (!commentResponse.ok) {
      const errorData = await commentResponse.text();
      console.error('Failed to add comment:', commentResponse.status, errorData);
      return new Response(JSON.stringify({
        error: 'Failed to add comment',
        message: 'Could not add closing comment to issue'
      }), {
        status: commentResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Then close the issue using bot token
    const closeResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_CONFIG.ORG}/${GITHUB_CONFIG.REPO}/issues/${issueNumber}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'OSS-Wishlist-Bot'
        },
        body: JSON.stringify({
          state: 'closed'
        })
      }
    );

    if (!closeResponse.ok) {
      const errorData = await closeResponse.text();
      console.error('Failed to close issue:', closeResponse.status, errorData);
      return new Response(JSON.stringify({
        error: 'Failed to close wishlist',
        message: 'Could not close the GitHub issue'
      }), {
        status: closeResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const closedIssue = await closeResponse.json();

    // STEP 1: Update local cache file to reflect the closed wishlist
    const origin = new URL(request.url).origin;
    const basePath = import.meta.env.BASE_URL || '';
    
    try {
      await fetch(`${origin}${basePath}/api/cache-wishlist?issueNumber=${issueNumber}`, {
        method: 'GET'
      });
      console.log('[close-wishlist] Local cache updated after closing');
    } catch (err) {
      console.warn('[close-wishlist] Failed to update local cache:', err);
    }
    
    // STEP 2: Invalidate in-memory cache
    try {
      await fetch(`${origin}${basePath}/api/cache-invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheKey: 'wishlists_full_cache' })
      });
      console.log('[close-wishlist] In-memory cache invalidated');
    } catch (err) {
      console.warn('[close-wishlist] Failed to invalidate cache:', err);
    }

    // Delete markdown file for closed wishlist
    // Extract repository URL from issue body to generate correct slug
    try {
      // Parse issue body to get repository URL (try both old and new formats)
      const repoMatch = closedIssue.body?.match(/### (?:Project Repository|Repository)\s+(.+)/) || 
                       closedIssue.body?.match(/\*\*Project Repository\*\*\s+(.+)/);
      const repositoryUrl = repoMatch ? repoMatch[1].trim() : null;
      
      if (!repositoryUrl) {
        throw new Error('Could not extract repository URL from issue body');
      }
      
      const slug = generateWishlistSlug(repositoryUrl, issueNumber);
      
      await deleteWishlistMarkdown(slug);
      console.log('[close-wishlist] ✓ Deleted markdown file for wishlist #' + issueNumber + ' (slug: ' + slug + ')');
    } catch (mdError) {
      console.error('[close-wishlist] ✗ Failed to delete markdown file:', mdError);
      // Don't fail the request if markdown deletion fails
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Wishlist closed successfully',
      issue: {
        number: closedIssue.number,
        url: closedIssue.html_url,
        state: closedIssue.state
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error closing wishlist:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
