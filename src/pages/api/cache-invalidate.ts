// Cache invalidation endpoint
// Clears the in-memory wishlists cache to force a fresh fetch from GitHub
//
// This is called:
// 1. After a wishlist is created or updated via the website form
// 2. By the GitHub Action workflow (optional, for label changes)
//
// Purpose: Ensures the website shows updated data immediately, not after 45s TTL
//
import type { APIRoute } from 'astro';
import { cacheManager } from '../../lib/cache-manager';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, RATE_LIMITS } from '../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateCheck = checkRateLimit(clientId, RATE_LIMITS.SUBMIT);
  if (rateCheck.limited) {
    return createRateLimitResponse(rateCheck.resetTime);
  }

  // Webhook secret check (required when WEBHOOK_SECRET is configured)
  const secret = request.headers.get('x-webhook-secret');
  const expectedSecret = import.meta.env.WEBHOOK_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get the cache key from the request body (optional, defaults to all wishlists cache)
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const cacheKey = body?.cacheKey || 'wishlists_full_cache';

    // Clear the specified cache key
    cacheManager.clear(cacheKey);
    
    console.log(`✓ Cache cleared: ${cacheKey}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cache key cleared: ${cacheKey}`,
        cacheKey
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
