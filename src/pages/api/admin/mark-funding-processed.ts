import type { APIRoute } from 'astro';
import { markFundingProcessed } from '../../../lib/db';
import { jsonSuccess, jsonError } from '../../../lib/api-response';

export const prerender = false;

/**
 * Mark a wishlist as having FUNDING.yml processed
 * Called by GitHub Actions after successfully creating FUNDING.yml PR
 * 
 * Authentication: Requires GITHUB_TOKEN (from GitHub Actions)
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Verify request is from GitHub Actions (check for GitHub token in header)
    const authHeader = request.headers.get('Authorization');
    const expectedToken = process.env.GITHUB_TOKEN || import.meta.env.GITHUB_TOKEN;
    
    if (!authHeader || !expectedToken) {
      return jsonError('Unauthorized', 'Authentication required', 401);
    }

    // Extract token from "Bearer <token>" or "token <token>"
    const token = authHeader.replace(/^(Bearer|token)\s+/i, '');
    
    if (token !== expectedToken) {
      return jsonError('Forbidden', 'Invalid token', 403);
    }

    const { wishlist_id } = await request.json();
    
    if (!wishlist_id) {
      return jsonError('Bad Request', 'wishlist_id required', 400);
    }

    const wishlist = await markFundingProcessed(wishlist_id);
    
    if (!wishlist) {
      return jsonError('Not Found', 'Wishlist not found', 404);
    }

    console.log(`[admin] Marked wishlist #${wishlist_id} as funding_yml_processed=true`);

    return jsonSuccess({ 
      success: true,
      wishlist: {
        id: wishlist.id,
        project_name: wishlist.project_name,
        funding_yml_processed: wishlist.funding_yml_processed,
      }
    });
  } catch (error) {
    console.error('[admin] Error marking funding processed:', error);
    return jsonError('Internal Server Error', error instanceof Error ? error.message : 'Unknown error', 500);
  }
};
