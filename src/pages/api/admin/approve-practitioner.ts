import type { APIRoute } from 'astro';
import { verifySession } from '../../../lib/github-oauth';
import { approvePractitioner } from '../../../lib/db';
import { jsonSuccess, jsonError } from '../../../lib/api-response';

export const prerender = false;

const ADMIN_USERNAMES = (process.env.ADMIN_USERNAMES || 'emmairwin').split(',');

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

    const practitioner = await approvePractitioner(id);
    
    if (!practitioner) {
      return jsonError('Not Found', 'Practitioner not found', 404);
    }

    console.log(`[admin] Approved practitioner #${id} (${practitioner.name}) by @${session.user.login}`);

    return jsonSuccess({ 
      approved: true, 
      practitioner: {
        id: practitioner.id,
        name: practitioner.name,
        status: practitioner.status,
        approved: practitioner.approved
      }
    });
  } catch (error) {
    console.error('[admin] Error approving practitioner:', error);
    return jsonError('Internal Server Error', error instanceof Error ? error.message : 'Unknown error', 500);
  }
};
