/**
 * API endpoint to delete a wishlist
 * Closes the GitHub issue and removes from cache
 */

import type { APIRoute } from 'astro';
import { GITHUB_CONFIG } from '../../config/github.js';
import { jsonSuccess, jsonError } from '../../lib/api-response.js';
import { removeWishlistFromCache, fetchCacheFromGitHub } from '../../lib/cache-updater.js';

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

    // STEP 1: Update local cache file to reflect the deleted wishlist
    const origin = new URL(request.url).origin;
    const basePath = import.meta.env.BASE_URL || '';

    try {
      await fetch(`${origin}${basePath}/api/cache-wishlist?issueNumber=${issueNumber}`, {
        method: 'GET'
      });
      console.log('[delete-wishlist] Local cache updated after deletion');
    } catch (err) {
      console.warn('[delete-wishlist] Failed to update local cache:', err);
    }

    // STEP 2: Invalidate in-memory cache
    try {
      await fetch(`${origin}${basePath}/api/cache-invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheKey: 'wishlists_full_cache' })
      });
      console.log('[delete-wishlist] In-memory cache invalidated');
    } catch (err) {
      console.warn('[delete-wishlist] Failed to invalidate cache:', err);
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
