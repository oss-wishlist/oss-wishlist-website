import type { APIRoute } from 'astro';
import { verifySession } from '../../lib/github-oauth';
import { getOAuthProvider } from '../../lib/oauth/registry.js';
import type { OAuthProviderName } from '../../lib/oauth/types';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Get and verify session from cookie (check both new and old cookie names)
    const sessionCookie = cookies.get('oss_session') || cookies.get('github_session');
    if (!sessionCookie?.value) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify the session signature
    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET || process.env.OAUTH_STATE_SECRET;
    const session = verifySession(sessionCookie.value, sessionSecret);
    
    if (!session || !session.authenticated) {
      // Clear invalid cookies
      cookies.delete('github_session', { path: '/' });
      cookies.delete('oss_session', { path: '/' });
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Determine which provider to use
    // New sessions have 'provider' field, old GitHub sessions don't
    const providerName: OAuthProviderName = ('provider' in session && session.provider) 
      ? session.provider as OAuthProviderName
      : 'github';
    
    const provider = getOAuthProvider(providerName);
    
    if (!provider) {
      return new Response(JSON.stringify({ 
        error: `Provider '${providerName}' not configured`,
        message: 'OAuth provider is not available'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Fetch repositories using the provider's method
    const accessToken = session.accessToken;
    if (!accessToken) {
      return new Response(JSON.stringify({ 
        error: 'No access token in session' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const repositories = await provider.fetchUserRepositories(accessToken);

    return new Response(JSON.stringify({ 
      repositories,
      user: session.user,
      provider: providerName
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error getting repositories:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch repositories',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};