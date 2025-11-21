import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const envInfo = {
    GITHUB_CLIENT_ID: import.meta.env.GITHUB_CLIENT_ID || 'MISSING',
    GITHUB_CLIENT_SECRET: import.meta.env.GITHUB_CLIENT_SECRET ? 'SET' : 'MISSING',
    GITHUB_REDIRECT_URI: import.meta.env.GITHUB_REDIRECT_URI || 'MISSING',
    OAUTH_STATE_SECRET: import.meta.env.OAUTH_STATE_SECRET ? 'SET' : 'MISSING',
    BASE_PATH: import.meta.env.PUBLIC_BASE_PATH || '/',
    SITE_URL: import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321',
    clientIdPreview: (import.meta.env.GITHUB_CLIENT_ID || '').substring(0, 8),
    redirectUriPreview: (import.meta.env.GITHUB_REDIRECT_URI || '').substring(0, 30)
  };

  const envDebug = {
    raw: envInfo,
    timestamp: new Date().toISOString(),
    mode: import.meta.env.MODE,
    prod: import.meta.env.PROD,
    dev: import.meta.env.DEV
  };

  return new Response(JSON.stringify(envDebug, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  } catch (error) {
    // Log the actual error details for server-side debugging
    console.error('Error in /api/debug-env:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
