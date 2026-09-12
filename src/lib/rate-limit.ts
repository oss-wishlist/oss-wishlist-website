/**
 * Simple rate limiting middleware for API endpoints
 * Tracks requests per IP address with a sliding window
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (use Redis in production for multi-instance deployments)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

// Default configurations for different endpoint types
export const RATE_LIMITS = {
  // Strict limits for write operations
  SUBMIT: { windowMs: 60 * 1000, maxRequests: 5 },  // 5 per minute
  AUTH: { windowMs: 60 * 1000, maxRequests: 10 },  // 10 per minute
  ADMIN: { windowMs: 60 * 1000, maxRequests: 30 },  // 30 per minute
  
  // Moderate limits for read operations
  API_READ: { windowMs: 60 * 1000, maxRequests: 60 },  // 60 per minute
  
  // Generous limits for public pages
  PUBLIC: { windowMs: 60 * 1000, maxRequests: 100 },  // 100 per minute
};

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (usually IP address)
 * @param config - Rate limit configuration
 * @returns true if request should be blocked, false if allowed
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig): {
  limited: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      limited: false,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);

  return {
    limited: false,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client identifier from request (IP address or fallback)
 */
export function getClientIdentifier(request: Request): string {
  /*
    The first entry in X-Forwarded-For is whatever the client sent. A client
    that sets its own X-Forwarded-For gets a fresh bucket on every request, so
    reading the leftmost value made every limit here advisory.

    The order below is by how forgeable each header is:

    CF-Connecting-IP is written by Cloudflare, which fronts this site, and
    overwrites anything the client sent under that name. It is the true client
    address and cannot be set from outside.

    X-Real-IP is set by the platform's own proxy, which is the last hop before
    the app.

    The rightmost X-Forwarded-For entry is the one appended by the nearest
    trusted proxy, unlike the leftmost, which is the one the client chose.
  */
  const cloudflare = request.headers.get('cf-connecting-ip');
  if (cloudflare) return cloudflare.trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const hops = forwardedFor.split(',').map((hop) => hop.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  // Everything without an identifiable source shares one bucket, which is
  // restrictive rather than permissive. That is the right way round here.
  return 'unknown';
}

/**
 * What to count a request against.
 *
 * For a signed-in caller, the account: it survives a changed address, and it
 * cannot be rotated the way an IP can. For everyone else, the address.
 *
 * The identity comes from a verified session, so it is not something a caller
 * can assert to claim someone else's bucket.
 */
export function getRateLimitKey(
  request: Request,
  session?: { provider?: string | null; user?: { login?: string | null; username?: string | null } | null } | null
): string {
  const name = session?.user?.login || session?.user?.username;
  if (name) {
    const provider = session?.provider || 'github';
    return `user:${provider}:${String(name).toLowerCase()}`;
  }
  return `ip:${getClientIdentifier(request)}`;
}

/**
 * Create a rate-limited response
 */
export function createRateLimitResponse(resetTime: number): Response {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
  
  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString(),
      },
    }
  );
}
