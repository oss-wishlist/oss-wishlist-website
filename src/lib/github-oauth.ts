import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';

export interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  permissions: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

/**
 * Generate a secure random state parameter for OAuth flow
 */
export function generateState(): string {
  if (typeof window !== 'undefined') {
    // Browser environment - use Web Crypto API
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Server environment - use Node.js crypto
    return randomBytes(32).toString('hex');
  }
}

/**
 * Verify the state parameter matches what we sent
 */
export function verifyState(receivedState: string, expectedState: string): boolean {
  if (typeof window !== 'undefined') {
    // Browser environment - simple string comparison (constant time not critical here)
    return receivedState === expectedState;
  } else {
    // Server environment - use timing-safe comparison
    // Convert strings to buffers with UTF-8 encoding
    const receivedBuffer = Buffer.from(receivedState, 'utf8');
    const expectedBuffer = Buffer.from(expectedState, 'utf8');
    
    // Ensure buffers are same length before comparison
    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(receivedBuffer, expectedBuffer);
  }
}

/**
 * Generate the GitHub OAuth authorization URL
 */
export function getGitHubAuthUrl(clientId: string, redirectUri: string, state: string, forceLogin: boolean = false): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email read:org', // User profile + organization membership/repos
    state: state,
    response_type: 'code'
  });

  // Add prompt=login to force re-authentication (useful for testing)
  if (forceLogin) {
    params.append('prompt', 'login');
  }

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code for token: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

/**
 * Fetch user information from GitHub API
 */
export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Fetch user's public repositories using their username
 * This uses the public API and doesn't require repo OAuth scopes
 */
export async function fetchUserRepositories(username: string): Promise<GitHubRepository[]> {
  // Accept an optional accessToken for authenticated requests
  let accessToken = undefined;
  if (arguments.length > 1 && typeof arguments[1] === 'string') {
    accessToken = arguments[1];
  }

  // Timeout helper
  function fetchWithTimeout(resource: RequestInfo, options: RequestInit = {}, timeout = 10000) {
    return Promise.race([
      fetch(resource, options),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeout))
    ]);
  }

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'OSS-Wishlist-App'
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetchWithTimeout(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated&type=owner`, {
    headers
  }, 10000) as Response;

  if (!response.ok) {
    throw new Error(`Failed to fetch repositories: ${response.statusText}`);
  }

  const repos = await response.json();
  // Return all repositories (they're already filtered to ones the user owns)
  return repos;
}

/**
 * Revoke a GitHub OAuth access token
 */
export async function revokeGitHubToken(
  clientId: string,
  clientSecret: string,
  accessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://api.github.com/applications/${clientId}/token`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        access_token: accessToken
      })
    });

    return response.status === 204; // 204 = successfully revoked
  } catch (error) {
    console.error('[Auth] Failed to revoke GitHub token:', error);
    return false;
  }
}

/**
 * Session data interface
 */
export interface SessionData {
  user: GitHubUser;
  repositories: GitHubRepository[];
  authenticated: boolean;
  accessToken?: string; // OAuth access token for API calls
}

/**
 * Create a signed session token
 */
export function createSession(data: SessionData, secret: string): string {
  if (typeof window !== 'undefined') {
    throw new Error('Session creation must be done server-side');
  }
  
  const payload = JSON.stringify(data);
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  // Combine payload and signature with a separator that won't appear in base64
  // Use :: as separator since it won't appear in JSON
  return Buffer.from(`${payload}::${signature}`).toString('base64');
}

/**
 * Verify and decode a session token
 */
export function verifySession(sessionToken: string, secret?: string): SessionData | null {
  try {
    if (typeof window !== 'undefined') {
      throw new Error('Session verification must be done server-side');
    }
    
    if (!secret) {
      throw new Error('Session secret not provided');
    }
    
    const decoded = Buffer.from(sessionToken, 'base64').toString('utf8');
    const parts = decoded.split('::');
    
    if (parts.length !== 2) {
      return null;
    }
    
    const [payload, signature] = parts;
    
    if (!payload || !signature) {
      return null;
    }
    
    // Verify signature
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    // Simple string comparison is sufficient and avoids timing issues
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Parse and return data
    return JSON.parse(payload) as SessionData;
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}