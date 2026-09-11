import type { APIRoute } from 'astro';
import { verifySession } from '../../../lib/github-oauth';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Try new unified cookie first, then fall back to old github_session
    let sessionCookie = cookies.get('oss_session');
    let cookieName = 'oss_session';
    
    if (!sessionCookie?.value) {
      sessionCookie = cookies.get('github_session');
      cookieName = 'github_session';
    }
    
    if (!sessionCookie?.value) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET || process.env.OAUTH_STATE_SECRET;
    
    const session = verifySession(sessionCookie.value, sessionSecret);
    
    if (!session) {
      // Clear invalid cookie
      cookies.delete(cookieName, { path: '/' });
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // The OAuth token stays on the server. It used to be included here, which
    // handed it to any script on the origin and undid the httpOnly cookie it
    // is stored in. Nothing in the browser needs it.
    const { accessToken, ...safeSession } = session as Record<string, unknown>;
    void accessToken;

    return new Response(JSON.stringify(safeSession), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    return new Response(JSON.stringify({ 
      authenticated: false,
      error: 'Session check failed'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};