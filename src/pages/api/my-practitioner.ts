import type { APIRoute } from 'astro';
import { getPractitionersBySubmitter } from '../../lib/db';
import { verifySession } from '../../lib/github-oauth';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Verify user is logged in
    const sessionCookie = cookies.get('oss_session') || cookies.get('github_session');
    if (!sessionCookie?.value) {
      return new Response(JSON.stringify({
        success: false,
        error: 'You must be logged in',
        code: 'UNAUTHORIZED'
      }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET;
    const session = verifySession(sessionCookie.value, sessionSecret);
    
    // Support both GitHub (login) and GitLab (username)
    const userIdentifier = session?.user?.login || session?.user?.username;
    if (!session || !userIdentifier) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid session',
        code: 'UNAUTHORIZED'
      }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const username = userIdentifier;
    const practitioners = await getPractitionersBySubmitter(username);
    
    if (practitioners.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No practitioner profile found',
        code: 'NOT_FOUND'
      }), { 
        status: 404, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return the most recent practitioner profile
    return new Response(JSON.stringify({
      success: true,
      practitioner: practitioners[0]
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[My Practitioner API] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
