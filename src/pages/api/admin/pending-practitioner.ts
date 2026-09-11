import type { APIRoute } from 'astro';
import { verifySession } from '../../../lib/github-oauth';
import { rejectPractitioner } from '../../../lib/db';
import { jsonSuccess, jsonError } from '../../../lib/api-response';
import { isAdminSession, adminLabel } from '../../../lib/admin';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, RATE_LIMITS } from '../../../lib/rate-limit';

export const prerender = false;

/**
 * Move an approved practitioner back to pending status
 * This sets approved = false on the practitioner
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const clientId = getClientIdentifier(request);
    const rateCheck = checkRateLimit(clientId, RATE_LIMITS.ADMIN);
    if (rateCheck.limited) { return createRateLimitResponse(rateCheck.resetTime); }

    // Verify admin session (check both new and legacy cookies)
    const sessionCookie = cookies.get('oss_session') || cookies.get('github_session');
    if (!sessionCookie?.value) {
      return jsonError('Unauthorized', 'Admin access required', 401);
    }

    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET;
    const session = verifySession(sessionCookie.value, sessionSecret);
    
    // Admins come from ADMIN_USERNAMES and are tied to the provider that
    // issued the login; an unset variable means nobody is an admin.
    if (!isAdminSession(session)) {
      return jsonError('Forbidden', 'Admin access required', 403);
    }
    const userIdentifier = adminLabel(session);

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
