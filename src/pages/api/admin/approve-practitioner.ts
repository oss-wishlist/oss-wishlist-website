import type { APIRoute } from 'astro';
import { verifySession } from '../../../lib/github-oauth';
import { approvePractitioner } from '../../../lib/db';
import { jsonSuccess, jsonError } from '../../../lib/api-response';
import { isAdminSession, adminLabel } from '../../../lib/admin';
import { checkRateLimit, getRateLimitKey, createRateLimitResponse, RATE_LIMITS } from '../../../lib/rate-limit';

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
    
    // Admins come from ADMIN_USERNAMES and are tied to the provider that
    // issued the login; an unset variable means nobody is an admin.
    if (!isAdminSession(session)) {
      return jsonError('Forbidden', 'Admin access required', 403);
    }
    const userIdentifier = adminLabel(session);

    /*
      Counted against the account rather than the address, now that the account
      is known. An admin cannot lift their own limit by changing network, and a
      caller cannot spend someone else's budget.
    */
    const rateCheck = checkRateLimit(getRateLimitKey(request, session), RATE_LIMITS.ADMIN);
    if (rateCheck.limited) { return createRateLimitResponse(rateCheck.resetTime); }

    const { id } = await request.json();
    
    if (!id) {
      return jsonError('Bad Request', 'Practitioner ID required', 400);
    }

    const practitioner = await approvePractitioner(id);
    
    if (!practitioner) {
      return jsonError('Not Found', 'Practitioner not found', 404);
    }

    console.log(`[admin] Approved practitioner #${id} (${practitioner.name}) by @${userIdentifier}`);

    return jsonSuccess({ 
      approved: true, 
      practitioner: {
        id: practitioner.id,
        name: practitioner.name,
        approved: practitioner.approved
      }
    });
  } catch (error) {
    console.error('[admin] Error approving practitioner:', error);
    return jsonError('Internal Server Error', error instanceof Error ? error.message : 'Unknown error', 500);
  }
};
