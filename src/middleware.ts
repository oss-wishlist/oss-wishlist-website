/**
 * Astro Middleware for Authentication
 * 
 * This runs on every request and can:
 * 1. Protect routes that require authentication
 * 2. Add session data to locals for use in pages
 * 3. Handle common auth patterns like redirects
 * 
 * Configure protected routes in the PROTECTED_ROUTES array below
 */

import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/auth';
import { getBasePath } from './lib/paths';

/**
 * Routes that require authentication
 * Add paths here to automatically protect them
 * 
 * Note: /maintainers page handles its own auth via AuthenticatedForm component
 * so it's not listed here - users can view the page but must log in to use the form
 */
const PROTECTED_ROUTES = [
  '/api/wishlists/create',
  '/api/wishlists/update',
  '/api/submit-wishlist',
  '/api/close-wishlist',
];

/**
 * Routes that should redirect to home if user IS authenticated
 * (e.g., login pages)
 */
const GUEST_ONLY_ROUTES: string[] = [
  // Add routes here like '/login' if you have custom login pages
];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, locals, redirect } = context;
  
  // Add X-Robots-Tag header if indexing is disabled (for staging environments)
  const disableIndexing = import.meta.env.DISABLE_INDEXING === 'true';
  const isPlaceholder = import.meta.env.PUBLIC_SITE_MODE === 'placeholder';
  
  // Get current path (without base path)
  const pathname = url.pathname.replace(getBasePath(), '/').replace('//', '/');
  
  // If in placeholder mode, only allow the homepage and static assets; redirect everything else
  if (isPlaceholder) {
    const basePath = getBasePath();
    // Allowed relative paths when placeholder is active
    const allowedPrefixes = [
      '/',
      '/favicon.ico',
      '/robots.txt',
      '/logo.png',
      '/_astro/',
      '/assets/',
      '/images/',
      '/public/'
    ];
    const isAllowed = allowedPrefixes.some((p) => pathname === p || pathname.startsWith(p));
    if (!isAllowed) {
      const redirectUrl = `${basePath}`; // basePath already has trailing slash
      return redirect(redirectUrl);
    }
  }

  // Check if route requires authentication
  const requiresAuth = PROTECTED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  
  // Check if route is for guests only
  const guestOnly = GUEST_ONLY_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  
  // Get session
  const session = getSession(cookies);
  
  // Backward-compatible user object for templates/components that expect `login`
  const userForTemplates = session?.user
    ? ({
        ...session.user,
        // Many pages/components check `user.login`; map it from our unified `username`
        login: (session.user as any).login ?? session.user.username,
      } as any)
    : null;

  // Add session to locals for access in pages
  (locals as any).session = session 
    ? ({ ...session, user: userForTemplates } as any)
    : null;
  (locals as any).user = userForTemplates;
  
  // Protect routes that require auth
  if (requiresAuth && !session) {
    const basePath = getBasePath();
    const redirectUrl = `${basePath}/`.replace('//', '/');
    return redirect(redirectUrl);
  }
  
  // Redirect authenticated users away from guest-only routes
  if (guestOnly && session) {
    const basePath = getBasePath();
    const redirectUrl = `${basePath}/`.replace('//', '/');
    return redirect(redirectUrl);
  }
  
  // Continue to next middleware/page
  const response = await next();
  
  // Add noindex header if indexing is disabled
  if (disableIndexing || isPlaceholder) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  
  // Add security headers
  // Content Security Policy - Allow same origin, GitHub/GitLab OAuth, and necessary external resources
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.statcounter.com", // unsafe-inline needed for Astro hydration, StatCounter for analytics
      "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Tailwind
      "img-src 'self' data: https:", // Allow images from HTTPS and data URIs
      "font-src 'self'",
      "connect-src 'self' https://api.github.com https://gitlab.com https://c.statcounter.com", // GitHub/GitLab APIs, StatCounter tracking
      "frame-src https://lu.ma https://luma.com", // Allow Luma calendar embeds
      "frame-ancestors 'none'", // Prevent clickjacking
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Disable legacy XSS protection (modern browsers use CSP instead)
  response.headers.set('X-XSS-Protection', '0');
  
  // Enforce HTTPS (only in production)
  if (import.meta.env.PROD) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }
  
  return response;
});
