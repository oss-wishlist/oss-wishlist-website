import type { APIRoute } from 'astro';
import { getOAuthProvider } from '../../../lib/oauth/registry.js';
import { generateState } from '../../../lib/github-oauth';

export const prerender = false;

/**
 * Initiate GitLab OAuth flow
 * GET /api/auth/gitlab
 */
export const GET: APIRoute = async ({ cookies, redirect, request }) => {
  try {
    const provider = getOAuthProvider('gitlab');
    
    if (!provider) {
      return new Response(
        JSON.stringify({ 
          error: 'GitLab OAuth not configured',
          message: 'GitLab authentication is not available. Please configure GITLAB_CLIENT_ID, GITLAB_CLIENT_SECRET, and GITLAB_REDIRECT_URI in your environment variables.'
        }), 
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get returnTo parameter from query string
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
    
    // Store state and provider in secure, httpOnly cookies
    cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/'
    });
    
    cookies.set('oauth_provider', 'gitlab', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/'
    });

    // Redirect to GitLab OAuth
    const authUrl = provider.getAuthorizationUrl(state, forceLogin);
    return redirect(authUrl);
  } catch (error) {
    console.error('[GitLab OAuth] Error initiating auth flow:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'Failed to initiate GitLab authentication'
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
