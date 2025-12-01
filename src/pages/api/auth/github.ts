import type { APIRoute } from 'astro';
import { generateState, getGitHubAuthUrl } from '../../../lib/github-oauth';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect, locals, request }) => {
  // In Astro 5 with adapter, we need to check both import.meta.env and process.env
  const clientId = import.meta.env.GITHUB_CLIENT_ID ?? process.env.GITHUB_CLIENT_ID;
  const redirectUri = import.meta.env.GITHUB_REDIRECT_URI ?? process.env.GITHUB_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    return new Response(
      JSON.stringify({ 
        error: 'GitHub OAuth not configured',
        debug: {
          hasClientId: !!clientId,
          hasRedirectUri: !!redirectUri,
          availableEnvVars: Object.keys(process.env).filter(k => k.includes('GITHUB'))
        }
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Check if user wants to force re-authentication (for testing)
  const url = new URL(request.url);
  const forceLogin = url.searchParams.get('force') === 'true';
  const returnTo = url.searchParams.get('returnTo');

  // Store returnTo in a cookie so we can use it after OAuth callback
  if (returnTo) {
    cookies.set('oauth_return_to', returnTo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/'
    });
  }

  // Generate secure state parameter
  const state = generateState();
  
  // Store state in a secure, httpOnly cookie
  cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/'
  });
  
  // Store provider name for callback to know which provider to use
  cookies.set('oauth_provider', 'github', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/'
  });

  // Redirect to GitHub OAuth
  const authUrl = getGitHubAuthUrl(clientId, redirectUri, state, forceLogin);
  return redirect(authUrl);
};