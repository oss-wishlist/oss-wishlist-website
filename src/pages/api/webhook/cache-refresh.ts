/**
 * Webhook endpoint for cache refresh
 * Called by GitHub Action after wishlists JSON is updated
 * 
 * Usage: Add this to the wishlists repo GitHub Action:
 * 
 * - name: Notify website to refresh cache
 *   run: |
 *     curl -X POST https://yoursite.com/api/webhook/cache-refresh \
 *       -H "x-webhook-secret: ${{ secrets.WEBHOOK_SECRET }}" \
 *       -H "Content-Type: application/json"
 */

import type { APIRoute } from 'astro';
import { cacheManager } from '../../../lib/cache-manager';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Verify webhook secret for security (optional but recommended)
    const secret = request.headers.get('x-webhook-secret');
    const expectedSecret = import.meta.env.WEBHOOK_SECRET;
    
    if (expectedSecret && secret !== expectedSecret) {
      console.warn('⚠️ Webhook called with invalid secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Clear both wishlist caches
    cacheManager.clear('wishlists_full_cache');
    cacheManager.clear('user_wishlists_full_cache');
    
    console.log('✓ Caches cleared via webhook - fresh data will be fetched on next request');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Caches cleared successfully',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Error in cache refresh webhook:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
