import type { APIRoute } from 'astro';
import { 
  verifyState, 
  exchangeCodeForToken, 
  fetchGitHubUser, 
  fetchUserRepositories,
  createSession,
  verifySession,
  type SessionData
} from '../../lib/github-oauth';
import { withBasePath, withBaseUrl } from '../../lib/paths';

export const prerender = false;

// In-memory set to track used OAuth codes (prevents duplicate processing)
const usedCodes = new Set<string>();

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  // Helper to resolve desired return path from cookie or query, normalized to a site-relative path
  const resolveNormalizedReturnPath = (): string => {
    const basePath = import.meta.env.BASE_URL || '/';
    const cookieReturnTo = cookies.get('oauth_return_to')?.value || '';
    const queryReturnTo = url.searchParams.get('returnTo') || '';
    let rawReturnTo = cookieReturnTo || queryReturnTo || '/';

    // If full URL, extract path+search+hash
    try {
      if (rawReturnTo.startsWith('http://') || rawReturnTo.startsWith('https://')) {
        const u = new URL(rawReturnTo);
        rawReturnTo = u.pathname + u.search + u.hash;
      }
    } catch {}

    // Remove basePath prefix if duplicated
    const base = basePath.endsWith('/') ? basePath : basePath + '/';
    if (rawReturnTo.startsWith(base)) {
      rawReturnTo = rawReturnTo.slice(base.length - 1);
    }
    if (!rawReturnTo.startsWith('/')) rawReturnTo = '/' + rawReturnTo;
    if (rawReturnTo === '/login') rawReturnTo = '/';
    return rawReturnTo;
  };
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  
  // Check if we already have a VALID session to prevent double processing
  const existingSessionCookie = cookies.get('github_session')?.value;
  if (existingSessionCookie && code) {
    // Verify if the session is actually valid
    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET;
    const sessionData = verifySession(existingSessionCookie, sessionSecret);
    
    // If session exists but doesn't have accessToken, clear it (old format)
    if (sessionData && !sessionData.accessToken) {
      cookies.delete('github_session', { path: '/' });
    } else if (sessionData) {
        const normalized = resolveNormalizedReturnPath();
        return redirect(withBasePath(normalized));
    } else {
      // Clear the invalid cookie
      cookies.delete('github_session', { path: '/' });
    }
  }
  
  // Handle OAuth errors
  if (error) {
    console.error('GitHub OAuth error:', error);
    const normalized = resolveNormalizedReturnPath();
    return redirect(withBasePath(normalized));
  }
  
  if (!code || !state) {
    console.error('Missing OAuth parameters:', { code: !!code, state: !!state });
    const normalized = resolveNormalizedReturnPath();
    return redirect(withBasePath(normalized));
  }
  
  // Check if this code was already used (prevents duplicate processing)
  if (usedCodes.has(code)) {
    // Check if user has a valid session
    const existingSession = cookies.get('github_session')?.value;
    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET;
    
    if (existingSession) {
      const sessionData = verifySession(existingSession, sessionSecret);
      if (sessionData) {
        // User is logged in, redirect to intended destination
        const normalized = resolveNormalizedReturnPath();
        return redirect(withBasePath(normalized));
      }
    }
    
    // No valid session, redirect to login with desired returnTo
    const normalized = resolveNormalizedReturnPath();
    return redirect(withBasePath('login?returnTo=' + encodeURIComponent(withBasePath(normalized))));
  }
  
  // Mark this code as used immediately
  usedCodes.add(code);
  
  // Clean up old codes (keep only last 100 to prevent memory leak)
  if (usedCodes.size > 100) {
    const codesToKeep = Array.from(usedCodes).slice(-100);
    usedCodes.clear();
    codesToKeep.forEach(c => usedCodes.add(c));
  }
  
  // Verify state parameter
  const storedState = cookies.get('oauth_state')?.value;
  
  // If no stored state, this might be a duplicate/refresh of the callback
  if (!storedState) {
    // Check if user has a valid session
    const existingSession = cookies.get('github_session')?.value;
    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET;
    
    if (existingSession) {
      const sessionData = verifySession(existingSession, sessionSecret);
      if (sessionData) {
        const normalized = resolveNormalizedReturnPath();
        return redirect(withBasePath(normalized));
      }
    }
    
    // No valid session, redirect to login with desired returnTo
    const normalized = resolveNormalizedReturnPath();
    return redirect(withBasePath('login?returnTo=' + encodeURIComponent(withBasePath(normalized))));
  }
  
  if (!verifyState(state, storedState)) {
    const normalized = resolveNormalizedReturnPath();
    return redirect(withBasePath(normalized));
  }
  
  // Clear the state cookie
  cookies.delete('oauth_state');
  
  try {
    const clientId = import.meta.env.GITHUB_CLIENT_ID;
    const clientSecret = import.meta.env.GITHUB_CLIENT_SECRET;
    const redirectUri = import.meta.env.GITHUB_REDIRECT_URI;
    
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('GitHub OAuth configuration missing');
    }
    
    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(clientId, clientSecret, code, redirectUri);
    
    // Get user information
    const user = await fetchGitHubUser(accessToken);
    
    // Create session data with MINIMAL info to avoid cookie size limits
    const sessionData: SessionData = {
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
      },
      repositories: [], // Don't store repos in cookie - fetch via API instead!
      authenticated: true,
      accessToken: accessToken, // Store token for API calls (small string, ~40 chars)
    };
    
    // Create signed session token
    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET;
    if (!sessionSecret) {
      throw new Error('Session secret not configured');
    }
    
    const sessionToken = createSession(sessionData, sessionSecret);
    
    // Set session cookie using Astro's API
    const maxAge = 60 * 60 * 24; // 24 hours
    const basePath = import.meta.env.BASE_URL || '/';
    const cookiePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
    
    cookies.set('github_session', sessionToken, {
      path: cookiePath || '/',
      maxAge: maxAge,
      httpOnly: true,
      sameSite: 'lax',
      secure: import.meta.env.PROD
    });
    
    // Resolve desired return path and clear cookie if set
    const normalized = resolveNormalizedReturnPath();
    const cookieReturnTo = cookies.get('oauth_return_to')?.value;
    if (cookieReturnTo) cookies.delete('oauth_return_to', { path: '/' });
    const redirectPath = withBasePath(normalized);
    return redirect(redirectPath);
  } catch (error) {
    console.error('Error in GitHub OAuth callback:', error);
    
    // If we already have a session set, the error might be from a duplicate request
    const existingSession = cookies.get('github_session')?.value;
    if (existingSession) {
      const normalized = resolveNormalizedReturnPath();
      return redirect(withBasePath(normalized));
    }
    
    // Include error message in redirect for debugging
    const errorMsg = error instanceof Error ? error.message : 'unknown_error';
    const normalized = resolveNormalizedReturnPath();
    return redirect(withBasePath(normalized));
  }
};