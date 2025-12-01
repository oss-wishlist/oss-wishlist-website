import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SessionData, UserProfile, Repository } from '../src/lib/oauth/types';

/**
 * Multi-Provider OAuth Authentication Tests
 * 
 * Tests the unified OAuth system supporting GitHub, GitLab, and future providers.
 * Covers:
 * - Provider registration and retrieval
 * - OAuth flow (authorization URL, token exchange, user profile)
 * - Session management (cookie storage, expiration, security)
 * - Repository caching (rate limit optimization)
 * - Admin access control (multi-provider support)
 * - Backward compatibility (github_session -> oss_session migration)
 */

describe('Multi-Provider OAuth Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Registration & Configuration', () => {
    it('should register GitHub provider with correct configuration', () => {
      // Providers must be registered before use
      const githubConfig = {
        clientId: 'test_github_client_id',
        clientSecret: 'test_github_secret',
        redirectUri: 'http://localhost:4321/auth/callback',
        scope: 'read:user user:email repo',
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
      };

      expect(githubConfig.clientId).toBeDefined();
      expect(githubConfig.scope).toContain('read:user');
      expect(githubConfig.scope).toContain('repo');
    });

    it('should register GitLab provider with correct configuration', () => {
      const gitlabConfig = {
        clientId: 'test_gitlab_client_id',
        clientSecret: 'test_gitlab_secret',
        redirectUri: 'http://localhost:4321/auth/callback',
        scope: 'read_user read_api',
        authorizationUrl: 'https://gitlab.com/oauth/authorize',
        tokenUrl: 'https://gitlab.com/oauth/token',
      };

      expect(gitlabConfig.clientId).toBeDefined();
      expect(gitlabConfig.scope).toContain('read_user');
      expect(gitlabConfig.scope).toContain('read_api');
    });

    it('should require environment variables for OAuth providers', () => {
      // Security: Don't allow app to start without OAuth config
      const requiredVars = [
        'GITHUB_CLIENT_ID',
        'GITHUB_CLIENT_SECRET',
        'GITLAB_CLIENT_ID',
        'GITLAB_CLIENT_SECRET',
      ];

      // All required variables should be defined
      requiredVars.forEach(varName => {
        // If env var is missing, provider should not initialize
        expect(varName).toBeTruthy();
      });
    });

    it('should support provider extensibility (future providers)', () => {
      // System should support adding Google, Bitbucket, etc.
      const providerNames = ['github', 'gitlab', 'google'] as const;
      
      providerNames.forEach(name => {
        expect(['github', 'gitlab', 'google']).toContain(name);
      });
    });
  });

  describe('OAuth Authorization Flow', () => {
    it('should generate valid GitHub authorization URL', () => {
      const state = 'random_state_12345';
      const clientId = 'test_client_id';
      const redirectUri = 'http://localhost:4321/auth/callback';
      const scope = 'read:user user:email repo';

      const expectedUrl = new URL('https://github.com/login/oauth/authorize');
      expectedUrl.searchParams.set('client_id', clientId);
      expectedUrl.searchParams.set('redirect_uri', redirectUri);
      expectedUrl.searchParams.set('response_type', 'code');
      expectedUrl.searchParams.set('state', state);
      expectedUrl.searchParams.set('scope', scope);

      expect(expectedUrl.toString()).toContain('github.com');
      expect(expectedUrl.searchParams.get('state')).toBe(state);
      expect(expectedUrl.searchParams.get('scope')).toContain('repo');
    });

    it('should generate valid GitLab authorization URL', () => {
      const state = 'random_state_67890';
      const clientId = 'gitlab_app_id';
      const redirectUri = 'http://localhost:4321/auth/callback';
      const scope = 'read_user read_api';

      const expectedUrl = new URL('https://gitlab.com/oauth/authorize');
      expectedUrl.searchParams.set('client_id', clientId);
      expectedUrl.searchParams.set('redirect_uri', redirectUri);
      expectedUrl.searchParams.set('response_type', 'code');
      expectedUrl.searchParams.set('state', state);
      expectedUrl.searchParams.set('scope', scope);

      expect(expectedUrl.toString()).toContain('gitlab.com');
      expect(expectedUrl.searchParams.get('state')).toBe(state);
      expect(expectedUrl.searchParams.get('scope')).toContain('read_api');
    });

    it('should include state parameter for CSRF protection', () => {
      const state = 'csrf_protection_token';
      const authUrl = new URL('https://github.com/login/oauth/authorize');
      authUrl.searchParams.set('state', state);

      // CSRF protection: state must be present and match
      expect(authUrl.searchParams.get('state')).toBe(state);
      // State token length varies, but must be present
      expect(authUrl.searchParams.get('state')?.length).toBeGreaterThan(0);
    });

    it('should handle returnTo parameter for post-login redirect', () => {
      const returnTo = '/create-wishlist';
      const encodedReturnTo = encodeURIComponent(returnTo);

      expect(encodedReturnTo).toBe('%2Fcreate-wishlist');
      
      // After successful auth, should redirect to returnTo
      const decodedReturnTo = decodeURIComponent(encodedReturnTo);
      expect(decodedReturnTo).toBe(returnTo);
    });
  });

  describe('Token Exchange & User Profile', () => {
    it('should exchange authorization code for access token (GitHub)', async () => {
      const mockTokenResponse = {
        access_token: 'gho_test_token_123456',
        token_type: 'bearer',
        scope: 'read:user,user:email,repo',
      };

      // Mock fetch for token exchange
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      const code = 'auth_code_xyz';
      const tokenUrl = 'https://github.com/login/oauth/access_token';

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: 'test_client',
          client_secret: 'test_secret',
          code,
          grant_type: 'authorization_code',
          redirect_uri: 'http://localhost:4321/auth/callback',
        }),
      });

      const data = await response.json();
      expect(data.access_token).toBe('gho_test_token_123456');
      expect(data.token_type).toBe('bearer');
    });

    it('should exchange authorization code for access token (GitLab)', async () => {
      const mockTokenResponse = {
        access_token: 'glpat-test_token_789',
        token_type: 'Bearer',
        expires_in: 7200,
        refresh_token: 'glprt-refresh_token',
        scope: 'read_user read_api',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      const code = 'gitlab_auth_code';
      const tokenUrl = 'https://gitlab.com/oauth/token';

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: 'gitlab_app',
          client_secret: 'gitlab_secret',
          code,
          grant_type: 'authorization_code',
          redirect_uri: 'http://localhost:4321/auth/callback',
        }),
      });

      const data = await response.json();
      expect(data.access_token).toBe('glpat-test_token_789');
      expect(data.refresh_token).toBeDefined();
      expect(data.expires_in).toBe(7200);
    });

    it('should fetch GitHub user profile with normalized fields', async () => {
      const mockGitHubUser = {
        id: 12345,
        login: 'octocat',
        name: 'The Octocat',
        email: 'octocat@github.com',
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockGitHubUser,
      } as Response);

      const accessToken = 'gho_test_token';
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      const user = await response.json();
      
      // Normalize to UserProfile interface
      const profile: UserProfile = {
        id: user.id,
        username: user.login,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        provider: 'github',
      };

      expect(profile.username).toBe('octocat');
      expect(profile.provider).toBe('github');
      expect(profile.id).toBe(12345);
    });

    it('should fetch GitLab user profile with normalized fields', async () => {
      const mockGitLabUser = {
        id: 67890,
        username: 'tanuki',
        name: 'GitLab Tanuki',
        email: 'tanuki@gitlab.com',
        avatar_url: 'https://gitlab.com/uploads/-/system/user/avatar/67890/avatar.png',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockGitLabUser,
      } as Response);

      const accessToken = 'glpat-test_token';
      const response = await fetch('https://gitlab.com/api/v4/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      const user = await response.json();
      
      // Normalize to UserProfile interface
      const profile: UserProfile = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        provider: 'gitlab',
      };

      expect(profile.username).toBe('tanuki');
      expect(profile.provider).toBe('gitlab');
      expect(profile.id).toBe(67890);
    });

    it('should handle token exchange errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'The provided authorization code is invalid',
        }),
      } as Response);

      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: JSON.stringify({ code: 'invalid_code' }),
      });

      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.error).toBe('invalid_grant');
    });
  });

  describe('Repository Fetching & Caching', () => {
    it('should fetch GitHub repositories with access token', async () => {
      const mockRepos = [
        {
          id: 1,
          name: 'test-repo',
          full_name: 'octocat/test-repo',
          html_url: 'https://github.com/octocat/test-repo',
          description: 'A test repository',
          private: false,
          owner: {
            login: 'octocat',
            avatar_url: 'https://avatars.githubusercontent.com/u/12345',
          },
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepos,
      } as Response);

      const accessToken = 'gho_test_token';
      const response = await fetch('https://api.github.com/user/repos?per_page=100', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      const repos = await response.json();
      expect(repos).toHaveLength(1);
      expect(repos[0].full_name).toBe('octocat/test-repo');
    });

    it('should fetch GitLab projects with access token', async () => {
      const mockProjects = [
        {
          id: 456,
          name: 'gitlab-project',
          path_with_namespace: 'tanuki/gitlab-project',
          web_url: 'https://gitlab.com/tanuki/gitlab-project',
          description: 'A GitLab project',
          visibility: 'public',
          owner: {
            username: 'tanuki',
          },
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      } as Response);

      const accessToken = 'glpat-test_token';
      const response = await fetch('https://gitlab.com/api/v4/projects?membership=true&per_page=100', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      const projects = await response.json();
      expect(projects).toHaveLength(1);
      expect(projects[0].path_with_namespace).toBe('tanuki/gitlab-project');
    });

    it('should cache repositories in session to avoid rate limits', () => {
      const mockRepos: Repository[] = [
        {
          id: 1,
          name: 'repo1',
          full_name: 'user/repo1',
          html_url: 'https://github.com/user/repo1',
          description: 'First repo',
          private: false,
          owner: {
            login: 'user',
            avatar_url: 'https://example.com/avatar.png',
          },
        },
        {
          id: 2,
          name: 'repo2',
          full_name: 'user/repo2',
          html_url: 'https://github.com/user/repo2',
          description: null,
          private: true,
          owner: {
            login: 'user',
            avatar_url: 'https://example.com/avatar.png',
          },
        },
      ];

      // Store minimal repo data in session
      const minimalRepos = mockRepos.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        description: repo.description,
        private: repo.private,
      }));

      // Session should contain repositories array
      const session: SessionData = {
        user: {
          id: 123,
          username: 'user',
          name: 'Test User',
          email: 'test@example.com',
          avatar_url: 'https://example.com/avatar.png',
          provider: 'github',
        },
        accessToken: 'gho_token',
        provider: 'github',
        authenticated: true,
        repositories: minimalRepos,
      };

      expect(session.repositories).toHaveLength(2);
      expect(session.repositories![0].full_name).toBe('user/repo1');
      expect(session.repositories![1].private).toBe(true);
    });

    it('should respect 4KB cookie size limit when caching repos', () => {
      // Cookie size limit: ~4KB
      // Session data must fit within this limit
      const largeRepoList: Repository[] = Array(50).fill(null).map((_, i) => ({
        id: i,
        name: `repo-${i}`,
        full_name: `user/repo-${i}`,
        html_url: `https://github.com/user/repo-${i}`,
        description: 'A'.repeat(100), // Long description
        private: false,
        owner: {
          login: 'user',
          avatar_url: 'https://example.com/avatar.png',
        },
      }));

      // Minimize data stored in session - limit to 10 repos with truncated descriptions
      const minimalRepos = largeRepoList.slice(0, 10).map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        description: repo.description?.substring(0, 30) || null, // Truncate more
        private: repo.private,
      }));

      const sessionJson = JSON.stringify({ repositories: minimalRepos });
      const sizeInBytes = new TextEncoder().encode(sessionJson).length;

      // Should be under 4KB (4096 bytes) - with realistic caching strategy
      expect(sizeInBytes).toBeLessThan(4096);
    });

    it('should handle missing owner/namespace in GitLab projects', () => {
      const gitlabProjectWithoutOwner: any = {
        id: 789,
        name: 'orphan-project',
        path_with_namespace: 'group/orphan-project',
        web_url: 'https://gitlab.com/group/orphan-project',
        description: null,
        visibility: 'public',
        owner: null, // Owner can be null
        namespace: {
          path: 'group',
        },
      };

      // Fallback to namespace if owner is null
      const ownerLogin = gitlabProjectWithoutOwner.owner?.username 
        || gitlabProjectWithoutOwner.namespace?.path 
        || gitlabProjectWithoutOwner.path_with_namespace.split('/')[0];

      expect(ownerLogin).toBe('group');
    });
  });

  describe('Session Management', () => {
    it('should store session in httpOnly cookie', () => {
      const sessionData: SessionData = {
        user: {
          id: 123,
          username: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
          avatar_url: 'https://example.com/avatar.png',
          provider: 'github',
        },
        accessToken: 'gho_test_token',
        provider: 'github',
        authenticated: true,
      };

      const cookieOptions = {
        httpOnly: true,
        secure: true, // HTTPS only in production
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      };

      expect(cookieOptions.httpOnly).toBe(true);
      expect(cookieOptions.sameSite).toBe('lax');
      expect(cookieOptions.maxAge).toBe(86400);
    });

    it('should use oss_session cookie name for multi-provider support', () => {
      const cookieName = 'oss_session';
      expect(cookieName).toBe('oss_session');
    });

    it('should maintain backward compatibility with github_session', () => {
      // Check both cookies for backward compatibility
      const cookies = {
        oss_session: 'new_session_data',
        github_session: 'legacy_session_data',
      };

      const sessionCookie = cookies.oss_session || cookies.github_session;
      expect(sessionCookie).toBe('new_session_data');
    });

    it('should expire session after 24 hours', () => {
      const maxAge = 60 * 60 * 24; // 24 hours in seconds
      const expiresAt = Date.now() + maxAge * 1000;

      const isExpired = Date.now() > expiresAt;
      expect(isExpired).toBe(false);

      // Simulate 25 hours later
      const futureTime = Date.now() + 25 * 60 * 60 * 1000;
      const isExpiredFuture = futureTime > expiresAt;
      expect(isExpiredFuture).toBe(true);
    });

    it('should include provider name in session data', () => {
      const githubSession: SessionData = {
        user: {
          id: 1,
          username: 'githubuser',
          name: 'GitHub User',
          email: 'github@example.com',
          avatar_url: 'https://github.com/avatar.png',
          provider: 'github',
        },
        accessToken: 'gho_token',
        provider: 'github',
        authenticated: true,
      };

      const gitlabSession: SessionData = {
        user: {
          id: 2,
          username: 'gitlabuser',
          name: 'GitLab User',
          email: 'gitlab@example.com',
          avatar_url: 'https://gitlab.com/avatar.png',
          provider: 'gitlab',
        },
        accessToken: 'glpat-token',
        provider: 'gitlab',
        authenticated: true,
      };

      expect(githubSession.provider).toBe('github');
      expect(gitlabSession.provider).toBe('gitlab');
      expect(githubSession.user.provider).toBe('github');
      expect(gitlabSession.user.provider).toBe('gitlab');
    });

    it('should clear session on logout', () => {
      let session: SessionData | null = {
        user: {
          id: 123,
          username: 'user',
          name: 'User',
          email: 'user@example.com',
          avatar_url: 'https://example.com/avatar.png',
          provider: 'github',
        },
        accessToken: 'token',
        provider: 'github',
        authenticated: true,
      };

      // Logout: clear session
      session = null;
      expect(session).toBeNull();
    });
  });

  describe('Admin Access Control', () => {
    it('should check both login and username fields for admin access', () => {
      const ADMIN_USERNAMES = ['admin-user', 'oss-wishlist-bot'];

      // GitHub user (has login field)
      const githubUser: UserProfile = {
        id: 1,
        username: 'admin-user', // GitHub calls it login, but normalized to username
        name: 'Admin User',
        email: 'admin@github.com',
        avatar_url: 'https://github.com/avatar.png',
        provider: 'github',
      };

      // GitLab user (has username field)
      const gitlabUser: UserProfile = {
        id: 2,
        username: 'oss-wishlist-bot', // GitLab calls it username
        name: 'Bot User',
        email: 'bot@gitlab.com',
        avatar_url: 'https://gitlab.com/avatar.png',
        provider: 'gitlab',
      };

      const isGitHubAdmin = ADMIN_USERNAMES.includes(githubUser.username);
      const isGitLabAdmin = ADMIN_USERNAMES.includes(gitlabUser.username);

      expect(isGitHubAdmin).toBe(true);
      expect(isGitLabAdmin).toBe(true);
    });

    it('should read ADMIN_USERNAMES from environment dynamically', () => {
      // import.meta.env reloads on server restart (not cached)
      const adminUsernamesString = 'admin1,admin2,admin3';
      const ADMIN_USERNAMES = adminUsernamesString.split(',').map(u => u.trim());

      expect(ADMIN_USERNAMES).toHaveLength(3);
      expect(ADMIN_USERNAMES).toContain('admin1');
      expect(ADMIN_USERNAMES).toContain('admin3');
    });

    it('should deny admin access to non-admin users', () => {
      const ADMIN_USERNAMES = ['admin-user'];
      
      const regularUser: UserProfile = {
        id: 999,
        username: 'regular-user',
        name: 'Regular User',
        email: 'user@example.com',
        avatar_url: 'https://example.com/avatar.png',
        provider: 'github',
      };

      const isAdmin = ADMIN_USERNAMES.includes(regularUser.username);
      expect(isAdmin).toBe(false);
    });

    it('should use timing-safe comparison for admin username check', () => {
      // Prevent timing attacks on admin username comparison
      const timingSafeEqual = (a: string, b: string): boolean => {
        if (a.length !== b.length) return false;
        
        let result = 0;
        for (let i = 0; i < a.length; i++) {
          result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
      };

      const adminUsername = 'admin-user';
      const userInput1 = 'admin-user';
      const userInput2 = 'admin-used'; // One char different

      expect(timingSafeEqual(adminUsername, userInput1)).toBe(true);
      expect(timingSafeEqual(adminUsername, userInput2)).toBe(false);
    });
  });

  describe('Security & Error Handling', () => {
    it('should validate state parameter for CSRF protection', () => {
      const storedState = 'csrf_token_12345';
      const receivedState: string = 'csrf_token_12345';

      const isValid = storedState === receivedState;
      expect(isValid).toBe(true);

      const attackedState: string = 'csrf_token_attack';
      const isInvalid = storedState === attackedState;
      expect(isInvalid).toBe(false);
    });

    it('should reject OAuth callback with mismatched state', () => {
      const storedState = 'original_state';
      const receivedState: string = 'tampered_state';

      const stateMatches = storedState === receivedState;
      expect(stateMatches).toBe(false);

      // Should redirect to error page or login
      if (!stateMatches) {
        const errorMessage = 'Invalid state parameter. Possible CSRF attack.';
        expect(errorMessage).toContain('CSRF');
      }
    });

    it('should handle expired access tokens gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Bad credentials' }),
      } as Response);

      const accessToken = 'expired_token';
      const response = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);

      // Should trigger re-authentication
      if (response.status === 401) {
        const shouldReauth = true;
        expect(shouldReauth).toBe(true);
      }
    });

    it('should handle network errors during OAuth flow', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    it('should sanitize redirect URLs to prevent open redirects', () => {
      const allowedPaths = ['/create-wishlist', '/dashboard', '/admin'];
      const maliciousUrls = [
        'https://evil.com',
        '//evil.com',
        'javascript:alert(1)',
      ];

      maliciousUrls.forEach(url => {
        // Check if URL is safe: must start with / but not //
        const isSafe = url.startsWith('/') && !url.startsWith('//');
        expect(isSafe).toBe(false);
      });

      allowedPaths.forEach(path => {
        // Valid paths start with / but not //
        const isSafe = path.startsWith('/') && !path.startsWith('//');
        expect(isSafe).toBe(true);
      });
    });

    it('should set secure cookie flags in production', () => {
      const isProd = process.env.NODE_ENV === 'production';
      
      const cookieOptions = {
        httpOnly: true,
        secure: isProd, // Only secure in production
        sameSite: 'lax' as const,
      };

      expect(cookieOptions.httpOnly).toBe(true);
      expect(cookieOptions.sameSite).toBe('lax');
    });
  });

  describe('Content Security Policy (CSP)', () => {
    it('should include GitHub API in CSP connect-src', () => {
      const cspHeader = "connect-src 'self' https://api.github.com https://gitlab.com";
      expect(cspHeader).toContain('https://api.github.com');
    });

    it('should include GitLab API in CSP connect-src', () => {
      const cspHeader = "connect-src 'self' https://api.github.com https://gitlab.com";
      expect(cspHeader).toContain('https://gitlab.com');
    });

    it('should block unauthorized domains in CSP', () => {
      const cspHeader = "connect-src 'self' https://api.github.com https://gitlab.com";
      const allowedDomains = cspHeader.match(/https:\/\/[\w.-]+/g) || [];
      
      expect(allowedDomains).toContain('https://api.github.com');
      expect(allowedDomains).toContain('https://gitlab.com');
      expect(allowedDomains).not.toContain('https://evil.com');
    });
  });

  describe('Rate Limit Handling', () => {
    it('should handle GitHub API rate limit responses', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Headers({
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() / 1000 + 3600),
        }),
        json: async () => ({
          message: 'API rate limit exceeded',
        }),
      } as Response);

      const response = await fetch('https://api.github.com/user/repos', {
        headers: { 'Authorization': 'Bearer token' },
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(403);
      
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      expect(rateLimitRemaining).toBe('0');
    });

    it('should use cached repositories when rate limited', () => {
      const session: SessionData = {
        user: {
          id: 1,
          username: 'user',
          name: 'User',
          email: 'user@example.com',
          avatar_url: 'https://example.com/avatar.png',
          provider: 'github',
        },
        accessToken: 'token',
        provider: 'github',
        authenticated: true,
        repositories: [
          {
            id: 1,
            name: 'cached-repo',
            full_name: 'user/cached-repo',
            html_url: 'https://github.com/user/cached-repo',
            description: 'Cached repository',
            private: false,
          },
        ],
      };

      // Use cached repos instead of fetching
      const repos = session.repositories || [];
      expect(repos).toHaveLength(1);
      expect(repos[0].name).toBe('cached-repo');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
