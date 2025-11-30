import type { APIRoute } from 'astro';
import { verifySession } from '../../lib/github-oauth';
import { closeWishlist, getWishlistById } from '../../lib/db';
import { jsonSuccess, jsonError } from '../../lib/api-response';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Get and verify session
    const sessionCookie = cookies.get('oss_session') || cookies.get('github_session');
    
    if (!sessionCookie?.value) {
      return jsonError('Unauthorized', 'You must be logged in to close a wishlist', 401);
    }

    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET;
    const session = verifySession(sessionCookie.value, sessionSecret);
    
    if (!session) {
      cookies.delete('oss_session', { path: '/' });
      cookies.delete('github_session', { path: '/' });
      return jsonError('Unauthorized', 'Invalid session. Please log in again.', 401);
    }

    const body = await request.json();
    const { issueNumber } = body;

    if (!issueNumber) {
      return jsonError('Bad Request', 'Issue number is required', 400);
    }

    const username = session.user?.login || session.user?.name || 'unknown';

    // Get wishlist from database to verify ownership
    const wishlist = await getWishlistById(issueNumber);
    if (!wishlist) {
      return jsonError('Not Found', 'Wishlist not found', 404);
    }

    // Verify user is the wishlist owner
    if (wishlist.maintainer_username !== username) {
      return jsonError('Forbidden', 'You can only close your own wishlists', 403);
    }

    // Close the wishlist in database (updates issue_state to 'closed')
    const closedWishlist = await closeWishlist(issueNumber);
    
    if (!closedWishlist) {
      return jsonError('Internal Server Error', 'Failed to close wishlist in database', 500);
    }

    console.log(`[close-wishlist] ✓ Closed wishlist #${issueNumber} by @${username}`);

    return jsonSuccess({
      success: true,
      message: 'Wishlist closed successfully',
      wishlist: {
        id: closedWishlist.id,
        projectName: closedWishlist.project_name,
        issueState: closedWishlist.issue_state
      }
    });

  } catch (error) {
    console.error('[close-wishlist] Error:', error);
    return jsonError(
      'Internal Server Error',
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
};
