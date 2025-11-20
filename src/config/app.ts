/**
 * Application configuration
 * Centralizes all configuration to avoid hardcoding and ensure security best practices
 */

// Site metadata
export const SITE_TITLE = 'Open Source Wishlist';
export const SITE_DESCRIPTION = 'Connecting open source projects with expert help and resources';

// Get the base path from Astro's built-in BASE_URL (set by astro.config.mjs)
export const BASE_PATH = import.meta.env.BASE_URL || '/';

// Construct full base URL for client-side usage
export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin + base path
    const basePath = BASE_PATH.endsWith('/') ? BASE_PATH.slice(0, -1) : BASE_PATH;
    return `${window.location.origin}${basePath}`;
  }
  // Server-side: construct from env vars
  const protocol = import.meta.env.PUBLIC_SITE_URL?.startsWith('https') ? 'https' : 'http';
  const host = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4324';
  const basePath = BASE_PATH.endsWith('/') ? BASE_PATH.slice(0, -1) : BASE_PATH;
  return `${host}${basePath}`;
};

// Helper to construct API paths with base
export const getApiPath = (path: string) => {
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const basePath = BASE_PATH === '/' ? '' : (BASE_PATH.endsWith('/') ? BASE_PATH.slice(0, -1) : BASE_PATH);
  return `${basePath}${cleanPath}`;
};

// Helper to construct full API URLs
export const getApiUrl = (path: string) => {
  return `${getBaseUrl()}${getApiPath(path)}`;
};

// OAuth Configuration
export const OAUTH_CONFIG = {
  clientId: import.meta.env.GITHUB_CLIENT_ID || import.meta.env.PUBLIC_GITHUB_CLIENT_ID,
  redirectUri: import.meta.env.GITHUB_REDIRECT_URI || import.meta.env.PUBLIC_GITHUB_REDIRECT_URI,
  scope: 'read:user user:email',
};

// Security Configuration
export const SECURITY_CONFIG = {
  // Use secure cookies in production
  secureCookies: import.meta.env.PROD || import.meta.env.PUBLIC_SITE_MODE === 'production',
  // Session timeout in seconds (default: 24 hours)
  sessionTimeout: 60 * 60 * 24,
  // OAuth state timeout in seconds (default: 10 minutes)
  oauthStateTimeout: 60 * 10,
  // Use sameSite strict in production
  cookieSameSite: (import.meta.env.PROD ? 'strict' : 'lax') as 'strict' | 'lax' | 'none',
};
