import type { APIRoute } from 'astro';
import { 
  verifyState, 
  createSession,
  verifySession,
} from '../../lib/github-oauth';
import type { SessionData as OldSessionData } from '../../lib/github-oauth';
import type { SessionData, OAuthProviderName } from '../../lib/oauth/types';
import { getOAuthProvider } from '../../lib/oauth/registry';
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
  // Check both new and old cookie names
  const existingSessionCookie = cookies.get('oss_session')?.value || cookies.get('github_session')?.value;
  if (existingSessionCookie && code) {
    // Verify if the session is actually valid
    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET;
    const sessionData = verifySession(existingSessionCookie, sessionSecret);
    
    // If session exists but doesn't have accessToken, clear it (old format)
    if (sessionData && !sessionData.accessToken) {
      cookies.delete('github_session', { path: '/' });
      cookies.delete('oss_session', { path: '/' });
    } else if (sessionData) {
        const normalized = resolveNormalizedReturnPath();
        return redirect(withBasePath(normalized));
    } else {
      // Clear the invalid cookies
      cookies.delete('github_session', { path: '/' });
      cookies.delete('oss_session', { path: '/' });
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
    // Check if user has a valid session (check both new and old cookie names)
    const existingSession = cookies.get('oss_session')?.value || cookies.get('github_session')?.value;
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
  const providerName = (cookies.get('oauth_provider')?.value || 'github') as OAuthProviderName;
  
  // If no stored state, this might be a duplicate/refresh of the callback
  if (!storedState) {
    // Check if user has a valid session
    const existingSession = cookies.get('oss_session')?.value || cookies.get('github_session')?.value;
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
  
  // Clear the state and provider cookies
  cookies.delete('oauth_state');
  cookies.delete('oauth_provider');
  
  try {
    // Get the OAuth provider based on the stored provider name
    const provider = getOAuthProvider(providerName);
    
    if (!provider) {
      throw new Error(`OAuth provider '${providerName}' not configured`);
    }
    
    // Exchange code for access token
    const accessToken = await provider.exchangeCodeForToken(code);
    
    // Get user information
    const userProfile = await provider.fetchUserProfile(accessToken);
    
    // Fetch repositories and store minimal info in session to avoid rate limits
    // Only store essential fields to keep cookie size manageable
    let repositories: Array<{
      id: string | number;
      name: string;
      full_name: string;
      html_url: string;
      description: string | null;
      private: boolean;
    }> = [];
    try {
      const fullRepositories = await provider.fetchUserRepositories(accessToken);
      // Store only essential fields to minimize session size (cookies have 4KB limit)
      repositories = fullRepositories.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        description: repo.description,
        private: repo.private,
      }));
    } catch (repoError) {
      console.error(`[OAuth] Failed to fetch repositories during login:`, repoError);
      // Continue without repositories - they can be fetched later if needed
    }
    
    // Create session data with repositories to avoid rate limits on subsequent requests
    const sessionData: SessionData = {
      user: userProfile,
      authenticated: true,
      accessToken: accessToken,
      provider: providerName,
      repositories: repositories, // Include repos to avoid hitting rate limits
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
    
    // Use new unified cookie name
    cookies.set('oss_session', sessionToken, {
      path: cookiePath || '/',
      maxAge: maxAge,
      httpOnly: true,
      sameSite: 'lax',
      secure: import.meta.env.PROD
    });
    
    // Also set with old name for backwards compatibility (will be removed in future)
    if (providerName === 'github') {
      cookies.set('github_session', sessionToken, {
        path: cookiePath || '/',
        maxAge: maxAge,
        httpOnly: true,
        sameSite: 'lax',
        secure: import.meta.env.PROD
      });
    }
    
    // Resolve desired return path and clear cookie if set
    const normalized = resolveNormalizedReturnPath();
    const cookieReturnTo = cookies.get('oauth_return_to')?.value;
    if (cookieReturnTo) cookies.delete('oauth_return_to', { path: '/' });
    const redirectPath = withBasePath(normalized);
    return redirect(redirectPath);
  } catch (error) {
    console.error(`Error in ${providerName} OAuth callback:`, error);
    
    // If we already have a session set, the error might be from a duplicate request
    const existingSession = cookies.get('oss_session')?.value || cookies.get('github_session')?.value;
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