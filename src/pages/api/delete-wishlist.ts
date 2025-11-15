/**
 * API endpoint to delete a wishlist
 * Marks the wishlist as deleted in the database
 */

import type { APIRoute } from 'astro';
import { jsonSuccess, jsonError } from '../../lib/api-response.js';
import { deleteWishlist } from '../../lib/db.js';

export const prerender = false;

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { issueNumber } = body;

    if (!issueNumber) {
      return jsonError('Missing required field', 'issueNumber required', 400);
    }

    // Delete from database
    const deleted = await deleteWishlist(issueNumber);
    
    if (!deleted) {
      return jsonError('Not Found', 'Wishlist not found', 404);
    }

    console.log(`[delete-wishlist] ✓ Deleted wishlist #${issueNumber} from database`);

    return jsonSuccess({
      deleted: true,
      issueNumber,
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
