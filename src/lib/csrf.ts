/**
 * CSRF Protection Utilities
 * 
 * Implements token-based CSRF protection for Astro SSR.
 * 
 * IMPORTANT: Astro's Actions API (astro:actions) has built-in CSRF protection
 * and is the RECOMMENDED approach for new forms. Use Actions when possible:
 * - Automatic validation with Zod
 * - Built-in CSRF protection
 * - Type-safe client/server communication
 * - See: https://docs.astro.build/en/guides/actions/
 * 
 * This utility is for LEGACY API routes that cannot use Actions.
 * For new features, prefer Astro Actions over manual API endpoints.
 * 
 * Usage (Legacy API Routes Only):
 * 1. Generate token in page: const csrfToken = generateCSRFToken(Astro);
 * 2. Include in form: <input type="hidden" name="csrf_token" value={csrfToken} />
 * 3. Validate in API: const valid = await validateCSRFToken(request, Astro);
 */

import type { AstroGlobal } from 'astro';
import { timingSafeEqual } from 'node:crypto';

/**
 * CSRF token storage key in Astro.locals
 */
const CSRF_TOKEN_KEY = '_csrf_token';

/**
 * CSRF token form field name
 */
export const CSRF_FIELD_NAME = 'csrf_token';

/**
 * Generate a cryptographically secure random token
 */
function generateRandomToken(): string {
  // Use Web Crypto API (available in Astro SSR via Node.js)
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a CSRF token for the current session
 * 
 * The token is stored in Astro.locals and tied to the user's session.
 * Returns the same token for subsequent calls within the same request.
 * 
 * @param Astro - Astro global object
 * @returns CSRF token string
 */
export function generateCSRFToken(Astro: AstroGlobal): string {
  // Check if token already exists in this request
  const existingToken = (Astro.locals as any)[CSRF_TOKEN_KEY];
  if (existingToken && typeof existingToken === 'string') {
    return existingToken;
  }

  // Generate new token
  const token = generateRandomToken();
  
  // Store in locals for this request
  (Astro.locals as any)[CSRF_TOKEN_KEY] = token;
  
  // Store in cookie for verification (httpOnly, sameSite)
  const cookieOptions = {
    httpOnly: true,
    secure: import.meta.env.PROD, // HTTPS only in production
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60 * 2, // 2 hours
  };
  
  Astro.cookies.set(CSRF_TOKEN_KEY, token, cookieOptions);
  
  return token;
}

/**
 * Validate CSRF token from form submission
 * 
 * Compares the token from the form field with the token stored in the cookie.
 * Uses timing-safe comparison to prevent timing attacks.
 * 
 * @param request - Request object (for POST/PUT/DELETE)
 * @param Astro - Astro global object
 * @returns true if token is valid, false otherwise
 */
export async function validateCSRFToken(
  request: Request,
  Astro: AstroGlobal
): Promise<boolean> {
  try {
    // Get token from cookie
    const cookieToken = Astro.cookies.get(CSRF_TOKEN_KEY)?.value;
    if (!cookieToken) {
      console.warn('[CSRF] No token in cookie');
      return false;
    }

    // Get token from request body
    let formToken: string | null = null;

    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // JSON body
      const body = await request.json();
      formToken = body[CSRF_FIELD_NAME];
    } else if (contentType.includes('application/x-www-form-urlencoded') || 
               contentType.includes('multipart/form-data')) {
      // Form data
      const formData = await request.formData();
      formToken = formData.get(CSRF_FIELD_NAME) as string;
    }

    if (!formToken) {
      console.warn('[CSRF] No token in request body');
      return false;
    }

    // Timing-safe comparison
    const isValid = timingSafeEqual(
      Buffer.from(cookieToken, 'utf-8'),
      Buffer.from(formToken, 'utf-8')
    );

    if (!isValid) {
      console.warn('[CSRF] Token mismatch');
    }

    return isValid;
  } catch (error) {
    console.error('[CSRF] Validation error:', error);
    return false;
  }
}

/**
 * Middleware helper: Check if request method requires CSRF protection
 * 
 * GET, HEAD, OPTIONS don't modify state, so they don't need CSRF protection.
 * POST, PUT, DELETE, PATCH do modify state and require tokens.
 */
export function requiresCSRFProtection(method: string): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  return !safeMethods.includes(method.toUpperCase());
}

/**
 * Create a standardized CSRF error response
 */
export function createCSRFErrorResponse(): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Invalid CSRF token. Please refresh the page and try again.',
      code: 'CSRF_VALIDATION_FAILED'
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}
