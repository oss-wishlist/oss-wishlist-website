/**
 * API endpoint to delete a wishlist
 * Closes the GitHub issue and removes markdown file
 */

import type { APIRoute } from 'astro';
import { GITHUB_CONFIG } from '../../config/github.js';
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

    const githubToken = import.meta.env.GITHUB_TOKEN;
    if (!githubToken) {
      return jsonError('Server error', 'GitHub token not configured', 500);
    }

    // Close the issue on GitHub (soft delete)
    const closeResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_CONFIG.ORG}/${GITHUB_CONFIG.REPO}/issues/${issueNumber}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'OSS-Wishlist-Bot',
        },
        body: JSON.stringify({
          state: 'closed',
          state_reason: 'not_planned',
        }),
      }
    );

    if (!closeResponse.ok) {
      return jsonError('Failed to close issue', 'GitHub API error', 500);
    }

    // Delete from database
    try {
      const deleted = await deleteWishlist(issueNumber);
      if (deleted) {
        console.log(`[delete-wishlist] ✓ Deleted wishlist #${issueNumber} from database`);
      } else {
        console.warn(`[delete-wishlist] Wishlist #${issueNumber} not found in database`);
      }
    } catch (error) {
      console.error(`[delete-wishlist] ✗ Failed to delete from database:`, error);
      // Continue anyway - GitHub issue is already closed
    }

    return jsonSuccess({
      deleted: true,
      issueNumber,
    });
  } catch (error) {
    console.error('Error deleting wishlist:', error);
    return jsonError(
      'Server error',
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    );
  }
};
