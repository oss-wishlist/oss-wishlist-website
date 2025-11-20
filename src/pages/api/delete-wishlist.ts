/**
 * API endpoint for users to delete their own wishlists
 * Requires authentication and verifies ownership
 */

import type { APIRoute } from 'astro';
import { jsonSuccess, jsonError } from '../../lib/api-response.js';
import { deleteWishlist, getWishlistById } from '../../lib/db.js';
import { verifySession } from '../../lib/github-oauth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verify user authentication
    const sessionCookie = cookies.get('github_session');
    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET;

    if (!sessionCookie?.value) {
      return jsonError('Unauthorized', 'You must be logged in to delete a wishlist', 401);
    }

    const session = verifySession(sessionCookie.value, sessionSecret);
    if (!session?.user?.login) {
      return jsonError('Unauthorized', 'Invalid session', 401);
    }

    const username = session.user.login;

    // Get wishlist ID from request body
    const body = await request.json();
    const { issueNumber } = body;

    if (!issueNumber) {
      return jsonError('Missing required field', 'issueNumber required', 400);
    }

    // Get wishlist to verify ownership
    const wishlist = await getWishlistById(issueNumber);
    
    if (!wishlist) {
      return jsonError('Not Found', 'Wishlist not found', 404);
    }

    // Verify user owns this wishlist
    if (wishlist.maintainer_username !== username) {
      console.log(`[delete-wishlist] ✗ User @${username} attempted to delete wishlist #${issueNumber} owned by @${wishlist.maintainer_username}`);
      return jsonError('Forbidden', 'You can only delete your own wishlists', 403);
    }

    console.log(`[delete-wishlist] User @${username} deleting wishlist #${issueNumber}`);

    // Delete from database
    const deleted = await deleteWishlist(issueNumber);
    
    if (!deleted) {
      return jsonError('Server Error', 'Failed to delete wishlist', 500);
    }

    console.log(`[delete-wishlist] ✓ Deleted wishlist #${issueNumber} from database`);

    return jsonSuccess({
      deleted: true,
      issueNumber,
      message: 'Wishlist deleted successfully'
    });
  } catch (error) {
    console.error('[delete-wishlist] Error:', error);
    return jsonError(
      'Server error',
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    );
  }
};
