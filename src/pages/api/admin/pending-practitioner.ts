import type { APIRoute } from 'astro';
import { verifySession } from '../../../lib/github-oauth';
import { rejectPractitioner } from '../../../lib/db';
import { jsonSuccess, jsonError } from '../../../lib/api-response';

export const prerender = false;

/**
 * Move an approved practitioner back to pending status
 * This sets approved = false on the practitioner
 */
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
      return jsonError('Bad Request', 'Practitioner ID required', 400);
    }

    // Use rejectPractitioner function which sets approved = false
    const practitioner = await rejectPractitioner(id);
    
    if (!practitioner) {
      return jsonError('Not Found', 'Practitioner not found', 404);
    }

    console.log(`[admin] Moved practitioner #${id} (${practitioner.name}) to pending by @${userIdentifier}`);

    return jsonSuccess({ 
      pending: true, 
      practitioner: {
        id: practitioner.id,
        name: practitioner.name,
        approved: practitioner.approved
      }
    });
  } catch (error) {
    console.error('[admin] Error moving practitioner to pending:', error);
    return jsonError('Internal Server Error', error instanceof Error ? error.message : 'Unknown error', 500);
  }
};
