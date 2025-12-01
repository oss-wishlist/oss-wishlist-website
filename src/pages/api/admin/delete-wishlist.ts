// API endpoint to delete a wishlist (admin only)
import type { APIRoute } from 'astro';
import { deleteWishlist } from '../../../lib/db';
import { verifySession } from '../../../lib/github-oauth';
import { triggerJsonUpdate } from '../../../lib/trigger-json-update';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verify admin authentication
    const sessionCookie = cookies.get('oss_session') || cookies.get('github_session');
    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET;
    const ADMIN_USERNAMES = (import.meta.env.ADMIN_USERNAMES || 'emmairwin').split(',').map(u => u.trim());

    if (!sessionCookie?.value) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = verifySession(sessionCookie.value, sessionSecret);
    const userIdentifier = session?.user?.login || session?.user?.username;
    if (!userIdentifier || !ADMIN_USERNAMES.includes(userIdentifier)) {
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

    console.log(`[delete-wishlist] Attempting to delete wishlist #${id}`);

    // Delete wishlist from database
    const deleted = await deleteWishlist(id);

    if (!deleted) {
      console.error(`[delete-wishlist] Failed to delete wishlist #${id} - not found or already deleted`);
      return new Response(JSON.stringify({ 
        error: 'Wishlist not found or already deleted'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[delete-wishlist] ✓ Successfully deleted wishlist #${id}`);

    // Trigger JSON feed update
    triggerJsonUpdate('deleted', id).catch(err => 
      console.error('[admin] Failed to trigger JSON update:', err)
    );

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Wishlist deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[delete-wishlist] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete wishlist',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
