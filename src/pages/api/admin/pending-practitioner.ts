import type { APIRoute } from 'astro';
import { verifySession } from '../../../lib/github-oauth';
import { rejectPractitioner } from '../../../lib/db';
import { jsonSuccess, jsonError } from '../../../lib/api-response';

export const prerender = false;

const ADMIN_USERNAMES = (process.env.ADMIN_USERNAMES || 'emmairwin').split(',');

/**
 * Move an approved practitioner back to pending status
 * This sets approved = false on the practitioner
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verify admin session
    const sessionCookie = cookies.get('github_session');
    if (!sessionCookie?.value) {
      return jsonError('Unauthorized', 'Admin access required', 401);
    }

    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET;
    const session = verifySession(sessionCookie.value, sessionSecret);
    
    if (!session?.user?.login || !ADMIN_USERNAMES.includes(session.user.login)) {
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

    console.log(`[admin] Moved practitioner #${id} (${practitioner.name}) to pending by @${session.user.login}`);

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
