import type { APIRoute } from 'astro';
import { verifySession } from '../../../lib/github-oauth';
import { approveWishlist } from '../../../lib/db';
import { jsonSuccess, jsonError } from '../../../lib/api-response';
import { triggerJsonUpdate } from '../../../lib/trigger-json-update';
import { triggerWishlistActions } from '../../../lib/trigger-wishlist-actions';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verify admin session (check both new and legacy cookies)
    const sessionCookie = cookies.get('oss_session') || cookies.get('github_session');
    if (!sessionCookie?.value) {
      return jsonError('Unauthorized', 'Admin access required', 401);
    }

    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET;
    const session = verifySession(sessionCookie.value, sessionSecret);
    
    // Read admin usernames dynamically from environment
    const ADMIN_USERNAMES = (import.meta.env.ADMIN_USERNAMES || 'emmairwin').split(',').map(u => u.trim());
    
    // Check both login (GitHub) and username (all providers) fields
    const userIdentifier = session?.user?.login || session?.user?.username;
    if (!userIdentifier || !ADMIN_USERNAMES.includes(userIdentifier)) {
      return jsonError('Forbidden', 'Admin access required', 403);
    }

    const { id } = await request.json();
    
    if (!id) {
      return jsonError('Bad Request', 'Wishlist ID required', 400);
    }

    const wishlist = await approveWishlist(id);
    
    if (!wishlist) {
      return jsonError('Not Found', 'Wishlist not found', 404);
    }

    console.log(`[admin] Approved wishlist #${id} by @${userIdentifier}`);

    // Trigger JSON feed update
    triggerJsonUpdate('approved', id).catch(err => 
      console.error('[admin] Failed to trigger JSON update:', err)
    );

    // Trigger wishlist actions workflow (FUNDING.yml, etc.)
    triggerWishlistActions(id, wishlist).catch(err =>
      console.error('[admin] Failed to trigger wishlist actions:', err)
    );

    return jsonSuccess({ 
      approved: true, 
      wishlist: {
        id: wishlist.id,
        projectName: wishlist.project_name,
        approved: wishlist.approved
      }
    });
  } catch (error) {
    console.error('[admin] Error approving wishlist:', error);
    return jsonError('Internal Server Error', error instanceof Error ? error.message : 'Unknown error', 500);
  }
};
