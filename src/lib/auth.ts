/**
 * Centralized Authentication Library
 * 
 * This module provides a unified authentication interface that:
 * 1. Works with any OAuth provider (currently GitHub, extensible to others)
 * 2. Handles both server-side (Astro) and client-side (React) contexts
 * 3. Provides consistent session management across the app
 * 4. Uses secure, httpOnly cookies for server auth
 * 5. Caches session data in sessionStorage for performance
 */

import type { AstroCookies } from 'astro';
import { verifySession, type SessionData } from './github-oauth';

/**
 * User interface - provider-agnostic
 */
export interface User {
  id: number | string;
  username: string;  // login/username from provider
  name: string | null;
  email: string | null;
  avatar_url: string;
  provider: 'github' | 'gitlab' | 'google'; // Extensible for future providers
}

/**
 * Session interface - what we store and return
 */
export interface AuthSession {
  user: User;
  authenticated: boolean;
  accessToken?: string; // OAuth token for API calls
  expiresAt?: number; // Timestamp when session expires
}

/**
 * Auth configuration
 */
export const AUTH_CONFIG = {
  SESSION_COOKIE_NAME: 'github_session', // Use existing cookie name from OAuth system
  SESSION_STORAGE_KEY: 'oss_auth_cache',
  SESSION_MAX_AGE: 60 * 60 * 24, // 24 hours in seconds
  SESSION_STORAGE_MAX_AGE: 60 * 60 * 24 * 1000, // 24 hours in milliseconds
} as const;

/**
 * Convert provider-specific session data to our unified User format
 */
function sessionDataToUser(sessionData: SessionData): User {
  return {
    id: sessionData.user.id,
    username: sessionData.user.login,
    name: sessionData.user.name,
    email: sessionData.user.email,
    avatar_url: sessionData.user.avatar_url,
    provider: 'github', // Currently only GitHub, but ready for extension
  };
}

/**
 * SERVER-SIDE: Get current session from cookies
 * Use this in Astro pages and API routes
 */
export function getSession(cookies: AstroCookies): AuthSession | null {
  try {
    const sessionCookie = cookies.get(AUTH_CONFIG.SESSION_COOKIE_NAME);
    
    if (!sessionCookie?.value) {
      return null;
    }

    // Get session secret from environment
    // Using import.meta.env (Astro standard for build-time env vars)
    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET;
    
    if (!sessionSecret) {
      console.error('[Auth] Session secret not configured - set OAUTH_STATE_SECRET in .env');
      return null;
    }

    // Verify and decode the session
    const sessionData = verifySession(sessionCookie.value, sessionSecret);
    
    if (!sessionData || !sessionData.authenticated) {
      // Invalid session, clear the cookie
      cookies.delete(AUTH_CONFIG.SESSION_COOKIE_NAME, { path: '/' });
      return null;
    }

    // Convert to our unified format
    return {
      user: sessionDataToUser(sessionData),
      authenticated: true,
      accessToken: sessionData.accessToken,
    };
  } catch (error) {
    console.error('[Auth] Error getting session:', error);
    return null;
  }
}

/**
 * SERVER-SIDE: Require authentication, redirect if not authenticated
 * Use this in Astro pages that need auth
 * 
 * @example
 * const session = requireAuth(Astro.cookies, Astro.redirect);
 */
export function requireAuth(
  cookies: AstroCookies,
  redirect: (url: string) => Response,
  redirectTo: string = '/'
): AuthSession {
  const session = getSession(cookies);
  
  if (!session) {
    throw redirect(redirectTo);
  }
  
  return session;
}

/**
 * SERVER-SIDE: Check if user is authenticated (boolean check)
 * Use this when you need to conditionally show content
 */
export function isAuthenticated(cookies: AstroCookies): boolean {
  return getSession(cookies) !== null;
}

/**
 * CLIENT-SIDE: Get session from sessionStorage cache
 * Use this in React components for fast, synchronous access
 * Always verify with server on mount/page load
 */
export function getCachedSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cached = sessionStorage.getItem(AUTH_CONFIG.SESSION_STORAGE_KEY);
    
    if (!cached) {
      return null;
    }

    const session = JSON.parse(cached);
    
    // Check if cache is expired
    const now = Date.now();
    const timestamp = session.timestamp || 0;
    const age = now - timestamp;

    if (age > AUTH_CONFIG.SESSION_STORAGE_MAX_AGE) {
      sessionStorage.removeItem(AUTH_CONFIG.SESSION_STORAGE_KEY);
      return null;
    }

    return session.data;
  } catch (error) {
    console.error('Error reading cached session:', error);
    return null;
  }
}

/**
 * CLIENT-SIDE: Cache session in sessionStorage
 */
export function setCachedSession(session: AuthSession | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (session) {
      sessionStorage.setItem(
        AUTH_CONFIG.SESSION_STORAGE_KEY,
        JSON.stringify({
          data: session,
          timestamp: Date.now(),
        })
      );
    } else {
      sessionStorage.removeItem(AUTH_CONFIG.SESSION_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Error caching session:', error);
  }
}

/**
 * CLIENT-SIDE: Fetch current session from server
 * Use this to verify the session is still valid
 */
import { withBasePath } from './paths';

export async function fetchSession(): Promise<AuthSession | null> {
  try {
    const response = await fetch(withBasePath('api/auth/session'));
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.authenticated) {
      return null;
    }

    // Convert provider data to our format
    const session: AuthSession = {
      user: {
        id: data.user.id,
        username: data.user.login,
        name: data.user.name,
        email: data.user.email,
        avatar_url: data.user.avatar_url,
        provider: 'github',
      },
      authenticated: true,
      accessToken: data.accessToken,
    };

    // Cache it
    setCachedSession(session);
    
    return session;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}

/**
 * CLIENT-SIDE: Clear session cache
 */
export function clearSessionCache(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  sessionStorage.removeItem(AUTH_CONFIG.SESSION_STORAGE_KEY);
}

/**
 * Get login URL for a provider
 */
export function getLoginUrl(provider: 'github' = 'github'): string {
  // Currently only GitHub, but ready for extension
  switch (provider) {
    case 'github':
      return withBasePath('api/auth/github');
    default:
      throw new Error(`Unknown auth provider: ${provider}`);
  }
}

/**
 * Get logout URL
 */
export function getLogoutUrl(): string {
  return withBasePath('api/auth/logout');
}
