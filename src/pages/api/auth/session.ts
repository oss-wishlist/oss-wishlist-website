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
    
    // Return session even if accessToken is missing (legacy sessions)
    return new Response(JSON.stringify(session), {
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