/**
 * GitHub OAuth Provider Implementation
 * 
 * Extends BaseOAuthProvider with GitHub-specific implementation.
 * Wraps existing GitHub OAuth logic into the provider abstraction.
 */

import { BaseOAuthProvider } from '../base-provider.js';
import type { 
  OAuthConfig, 
  UserProfile, 
  Repository,
  OAuthProviderName 
} from '../types.js';
import {
  exchangeCodeForToken as githubExchangeCode,
  fetchGitHubUser,
  fetchUserRepositories as githubFetchRepos,
  revokeGitHubToken
} from '../../github-oauth.js';

export class GitHubOAuthProvider extends BaseOAuthProvider {
  readonly name: OAuthProviderName = 'github';
  readonly config: OAuthConfig;
  
  constructor() {
    super();
    
    const clientId = BaseOAuthProvider.requireEnvVar('GITHUB_CLIENT_ID', 'GitHub');
    const clientSecret = BaseOAuthProvider.requireEnvVar('GITHUB_CLIENT_SECRET', 'GitHub');
    const redirectUri = BaseOAuthProvider.requireEnvVar('GITHUB_REDIRECT_URI', 'GitHub');
    
    this.config = {
      clientId,
      clientSecret,
      redirectUri,
      scope: 'read:user user:email read:org',
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
    };
  }
  
  /**
   * GitHub uses 'prompt=login' for force login
   */
  protected addForceLoginParam(params: URLSearchParams): void {
    params.append('prompt', 'login');
  }
  
  /**
   * GitHub uses existing helper function for token exchange
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    return await githubExchangeCode(
      this.config.clientId,
      this.config.clientSecret,
      code,
      this.config.redirectUri
    );
  }
  
  async fetchUserProfile(accessToken: string): Promise<UserProfile> {
    const githubUser = await fetchGitHubUser(accessToken);
    
    // Normalize to our UserProfile interface
    return {
      id: githubUser.id,
      username: githubUser.login,
      name: githubUser.name,
      email: githubUser.email,
      avatar_url: githubUser.avatar_url,
      provider: 'github',
    };
  }
  
  async fetchUserRepositories(accessToken: string): Promise<Repository[]> {
    // GitHub's fetchUserRepositories uses the username, so we need to get that first
    const user = await this.fetchUserProfile(accessToken);
    const githubRepos = await githubFetchRepos(user.username, accessToken);
    
    // Normalize to our Repository interface
    // Note: githubFetchRepos returns a filtered list with permissions already checked
    return githubRepos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      description: repo.description,
      private: (repo as any).private ?? false,  // Type workaround for API response
      owner: {
        login: (repo as any).owner?.login ?? user.username,
        avatar_url: (repo as any).owner?.avatar_url ?? '',
      },
      default_branch: (repo as any).default_branch,
      created_at: (repo as any).created_at,
      updated_at: (repo as any).updated_at,
    }));
  }
  
  /**
   * GitHub uses existing helper function for token revocation
   */
  async revokeToken(accessToken: string): Promise<boolean> {
    return await revokeGitHubToken(
      this.config.clientId,
      this.config.clientSecret,
      accessToken
    );
  }
}

/**
 * Create GitHub OAuth provider instance
 */
export function createGitHubProvider(): GitHubOAuthProvider | null {
  try {
    return new GitHubOAuthProvider();
  } catch (error) {
    console.error('[OAuth] Failed to create GitHub provider:', error);
    return null;
  }
}
