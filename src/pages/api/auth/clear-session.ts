import type { APIRoute } from 'astro';

/**
 * Dev helper endpoint to clear session
 * Navigate to /api/auth/clear-session to test login flow
 */
export const GET: APIRoute = async ({ cookies, redirect }) => {
  // Clear the session cookie
  cookies.delete('github_session', {
    path: '/',
  });

  // Session cleared
  
  // Redirect to home or maintainers page
  const basePath = import.meta.env.BASE_URL || '/';
  const normalized = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return redirect(normalized);
};
