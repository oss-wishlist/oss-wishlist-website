/**
 * OAuth Provider Abstraction Layer
 * 
 * This module defines provider-agnostic interfaces for OAuth authentication.
 * Designed to support GitHub, GitLab, Google, and future providers.
 */

/**
 * Normalized user profile from any OAuth provider
 */
export interface UserProfile {
  id: string | number;
  username: string;  // login/username from provider
  name: string | null;
  email: string | null;
  avatar_url: string;
  provider: OAuthProviderName;
}

/**
 * Normalized repository from any Git hosting provider
 */
export interface Repository {
  id: string | number;
  name: string;
  full_name: string;  // e.g., "owner/repo"
  html_url: string;   // Web URL to repository
  description: string | null;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
  };
  // Optional fields that might not be available from all providers
  default_branch?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * OAuth provider names
 */
export type OAuthProviderName = 'github' | 'gitlab' | 'google';

/**
 * OAuth configuration for a provider
 */
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;  // Optional - some providers return user info with token
}

/**
 * OAuth token response
 */
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Session data stored in cookie
 */
export interface SessionData {
  user: UserProfile;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  provider: OAuthProviderName;
  authenticated: boolean;
  repositories?: Array<{
    id: string | number;
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    private: boolean;
  }>; // Minimal repo info to avoid rate limits, optional for backwards compatibility
}

/**
 * OAuth Provider Interface
 * 
 * All OAuth providers must implement these methods to integrate
 * with the authentication system.
 */
export interface OAuthProvider {
  /**
   * Provider name (github, gitlab, google, etc.)
   */
  readonly name: OAuthProviderName;
  
  /**
   * Provider configuration
   */
  readonly config: OAuthConfig;
  
  /**
   * Generate the authorization URL for OAuth flow
   * @param state - Security state parameter
   * @param forceLogin - Force user to re-authenticate
   * @returns Authorization URL to redirect user to
   */
  getAuthorizationUrl(state: string, forceLogin?: boolean): string;
  
  /**
   * Exchange authorization code for access token
   * @param code - Authorization code from OAuth callback
   * @returns Access token
   */
  exchangeCodeForToken(code: string): Promise<string>;
  
  /**
   * Fetch user profile using access token
   * @param accessToken - OAuth access token
   * @returns Normalized user profile
   */
  fetchUserProfile(accessToken: string): Promise<UserProfile>;
  
  /**
   * Fetch user's repositories using access token
   * @param accessToken - OAuth access token
   * @returns Array of normalized repositories
   */
  fetchUserRepositories(accessToken: string): Promise<Repository[]>;
  
  /**
   * Revoke access token (logout)
   * @param accessToken - Token to revoke
   * @returns True if successfully revoked
   */
  revokeToken(accessToken: string): Promise<boolean>;
  
  /**
   * Validate access token is still valid
   * @param accessToken - Token to validate
   * @returns True if token is valid
   */
  validateToken(accessToken: string): Promise<boolean>;
}

/**
 * Provider factory function type
 */
export type OAuthProviderFactory = () => OAuthProvider | null;
