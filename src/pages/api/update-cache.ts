/**
 * API endpoint to update cache after wishlist creation/deletion
 * Called by submit-wishlist.ts to ensure immediate UI updates
 */

import type { APIRoute } from 'astro';
import { GITHUB_CONFIG } from '../../config/github.js';
import { jsonSuccess, jsonError } from '../../lib/api-response.js';
import {
  fetchCacheFromGitHub,
  parseIssueToWishlist,
  addWishlistToCache,
  removeWishlistFromCache,
} from '../../lib/cache-updater.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, issueNumber } = body; // action: 'add' | 'remove'

    if (!action || !issueNumber) {
      return jsonError('Missing required fields', 'action and issueNumber required', 400);
    }

    // Fetch current cache
    const cache = await fetchCacheFromGitHub();
    if (!cache) {
      return jsonError('Cache not found', 'Could not fetch cache from GitHub', 500);
    }

    let updatedCache = cache;

    if (action === 'add') {
      // Fetch the newly created issue
      const githubToken = import.meta.env.GITHUB_TOKEN;
      if (!githubToken) {
        return jsonError('Server error', 'GitHub token not configured', 500);
      }

      const issueResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_CONFIG.ORG}/${GITHUB_CONFIG.REPO}/issues/${issueNumber}`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'OSS-Wishlist-Bot',
          },
        }
      );

      if (!issueResponse.ok) {
        return jsonError('Failed to fetch issue', 'GitHub API error', 500);
      }

      const issue = await issueResponse.json();
      const wishlist = parseIssueToWishlist(issue);
      updatedCache = addWishlistToCache(cache, wishlist);
    } else if (action === 'remove') {
      updatedCache = removeWishlistFromCache(cache, issueNumber);
    } else {
      return jsonError('Invalid action', 'action must be "add" or "remove"', 400);
    }

    // Cache is now updated in memory
    // The GitHub Action will regenerate from GitHub API for permanent update
    // This just ensures immediate client-side updates

    return jsonSuccess({
      updated: true,
      totalWishlists: updatedCache.totalWishlists,
      approvedCount: updatedCache.approvedCount,
    });
  } catch (error) {
    console.error('Error updating cache:', error);
    return jsonError(
      'Server error',
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    );
  }
};
