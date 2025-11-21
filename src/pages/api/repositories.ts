import type { APIRoute } from 'astro';
import { verifySession } from '../../lib/github-oauth';
import { fetchUserRepositories } from '../../lib/github-oauth';
import { getWishlistsByMaintainer } from '../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Get and verify session from cookie
    const sessionCookie = cookies.get('github_session');
    if (!sessionCookie?.value) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  // Verify the session signature
  const sessionSecret = import.meta.env.OAUTH_STATE_SECRET || process.env.OAUTH_STATE_SECRET;
    const session = verifySession(sessionCookie.value, sessionSecret);
    
    if (!session || !session.authenticated) {
      // Clear invalid cookie
      cookies.delete('github_session', { path: '/' });
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Note: accessToken is optional here since we only need the username and hit a public API

    // Fetch public repositories from GitHub API using the username
    // This uses the public API endpoint and doesn't require repo OAuth scopes
    const repositories = await fetchUserRepositories(session.user.login);
    
    // Filter out repos that already have wishlists
    const userWishlists = await getWishlistsByMaintainer(session.user.login);
    const wishlistRepoUrls = new Set(userWishlists.map(w => w.repository_url.toLowerCase()));
    
    const availableRepositories = repositories.filter(repo => {
      const repoUrl = repo.html_url.toLowerCase();
      const isFiltered = wishlistRepoUrls.has(repoUrl);
      if (isFiltered) {
        console.log(`[repositories] Filtering out: ${repoUrl}`);
      }
      return !isFiltered;
    });
    
    console.log(`[repositories] User: ${session.user.login}`);
    console.log(`[repositories] Wishlist URLs:`, Array.from(wishlistRepoUrls));
    console.log(`[repositories] Total repos: ${repositories.length}, Filtered: ${repositories.length - availableRepositories.length}, Available: ${availableRepositories.length}`);

    return new Response(JSON.stringify({ 
      repositories: availableRepositories,
      user: session.user
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error getting repositories:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch repositories' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};