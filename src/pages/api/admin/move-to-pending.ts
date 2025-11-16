// API endpoint to move wishlist back to pending status (admin only)
import type { APIRoute } from 'astro';
import { moveToPending } from '../../../lib/db';
import { verifySession } from '../../../lib/github-oauth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verify admin authentication
    const sessionCookie = cookies.get('github_session');
    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET;
    const ADMIN_USERNAMES = (import.meta.env.ADMIN_USERNAMES || 'emmairwin').split(',');

    if (!sessionCookie?.value) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = verifySession(sessionCookie.value, sessionSecret);
    if (!session?.user?.login || !ADMIN_USERNAMES.includes(session.user.login)) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get wishlist ID from request body
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Wishlist ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use rejectWishlist which sets approved=false, status='rejected'
    // Then we'll need to update to status='pending' instead
    // Actually, let's update the db function to handle this
    await moveToPending(id);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Wishlist moved to pending'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[move-to-pending] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to move wishlist to pending',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
