/**
 * GitLab OAuth Provider Implementation
 * 
 * Extends BaseOAuthProvider with GitLab-specific implementation.
 * Supports both GitLab.com and self-hosted GitLab instances.
 */

import { BaseOAuthProvider } from '../base-provider.js';
import type { 
  OAuthConfig, 
  UserProfile, 
  Repository,
  OAuthProviderName 
} from '../types.js';

interface GitLabUser {
  id: number;
  username: string;
  name: string;
  email: string;
  avatar_url: string;
  web_url: string;
}

interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;  // e.g., "owner/repo"
  web_url: string;
  description: string | null;
  visibility: 'public' | 'internal' | 'private';
  owner?: {
    username: string;
    avatar_url: string;
  };
  namespace?: {
    path: string;
    avatar_url?: string;
  };
  default_branch: string;
  created_at: string;
  last_activity_at: string;
}

export class GitLabOAuthProvider extends BaseOAuthProvider {
  readonly name: OAuthProviderName = 'gitlab';
  readonly config: OAuthConfig;
  private readonly baseUrl: string;
  
  constructor() {
    super();
    
    const clientId = BaseOAuthProvider.requireEnvVar('GITLAB_CLIENT_ID', 'GitLab');
    const clientSecret = BaseOAuthProvider.requireEnvVar('GITLAB_CLIENT_SECRET', 'GitLab');
    const redirectUri = BaseOAuthProvider.requireEnvVar('GITLAB_REDIRECT_URI', 'GitLab').trim();
    // Support self-hosted GitLab instances
    const baseUrl = BaseOAuthProvider.getEnvVar('GITLAB_BASE_URL')?.trim() ?? 'https://gitlab.com';
    
    this.baseUrl = baseUrl;
    this.config = {
      clientId,
      clientSecret,
      redirectUri,
      scope: 'read_user read_api',
      authorizationUrl: `${baseUrl}/oauth/authorize`,
      tokenUrl: `${baseUrl}/oauth/token`,
      userInfoUrl: `${baseUrl}/api/v4/user`,
    };
  }
  
  async fetchUserProfile(accessToken: string): Promise<UserProfile> {
    const response = await this.fetchWithAuth(`${this.baseUrl}/api/v4/user`, accessToken);

    if (!response.ok) {
      throw new Error(`Failed to fetch GitLab user: ${response.statusText}`);
    }

    const gitlabUser: GitLabUser = await response.json();
    
    // Normalize to our UserProfile interface
    return {
      id: gitlabUser.id,
      username: gitlabUser.username,
      name: gitlabUser.name,
      email: gitlabUser.email,
      avatar_url: gitlabUser.avatar_url,
      provider: 'gitlab',
    };
  }
  
  async fetchUserRepositories(accessToken: string): Promise<Repository[]> {
    // Fetch projects (GitLab's term for repositories) that user has maintainer or owner access to
    // min_access_level=40 means Maintainer level or higher (Owner=50, Maintainer=40)
    // This ensures user can manage the repository and accept PRs
    const response = await this.fetchWithAuth(
      `${this.baseUrl}/api/v4/projects?membership=true&min_access_level=40&per_page=100&order_by=last_activity_at`,
      accessToken
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch GitLab projects: ${response.statusText}`);
    }

    const gitlabProjects: GitLabProject[] = await response.json();
    
    // Normalize to our Repository interface
    return gitlabProjects.map(project => {
      // Extract owner info from either owner or namespace (GitLab can have both)
      const ownerLogin = project.owner?.username 
        || project.namespace?.path 
        || project.path_with_namespace.split('/')[0];
      const ownerAvatar = project.owner?.avatar_url 
        || project.namespace?.avatar_url 
        || '';
      
      return {
        id: project.id,
        name: project.name,
        full_name: project.path_with_namespace,
        html_url: project.web_url,
        description: project.description,
        private: project.visibility === 'private',
        owner: {
          login: ownerLogin,
          avatar_url: ownerAvatar,
        },
        default_branch: project.default_branch,
        created_at: project.created_at,
        updated_at: project.last_activity_at,
      };
    });
  }
  
  async revokeToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/oauth/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          token: accessToken,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[OAuth] Failed to revoke GitLab token:', error);
      return false;
    }
  }
}

/**
 * Create GitLab OAuth provider instance
 */
export function createGitLabProvider(): GitLabOAuthProvider | null {
  try {
    return new GitLabOAuthProvider();
  } catch (error) {
    console.error('[OAuth] Failed to create GitLab provider:', error);
    return null;
  }
}
