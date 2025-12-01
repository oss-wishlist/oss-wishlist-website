/**
 * Base OAuth Provider Implementation
 * 
 * Abstract base class that implements common OAuth patterns.
 * Provider-specific implementations extend this and override as needed.
 */

import type { 
  OAuthProvider, 
  OAuthConfig, 
  UserProfile, 
  Repository,
  OAuthProviderName 
} from './types.js';

/**
 * Abstract base class for OAuth providers
 * Implements common patterns to reduce code duplication
 */
export abstract class BaseOAuthProvider implements OAuthProvider {
  abstract readonly name: OAuthProviderName;
  abstract readonly config: OAuthConfig;
  
  /**
   * Generate OAuth authorization URL
   * Common pattern across most OAuth 2.0 providers
   */
  getAuthorizationUrl(state: string, forceLogin: boolean = false): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      state: state,
      scope: this.config.scope,
    });

    // Provider-specific force login parameter
    if (forceLogin) {
      this.addForceLoginParam(params);
    }

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }
  
  /**
   * Add provider-specific force login parameter
   * Override in subclass if provider uses different parameter
   */
  protected addForceLoginParam(params: URLSearchParams): void {
    // Default: no-op (not all providers support this)
  }
  
  /**
   * Exchange authorization code for access token
   * Standard OAuth 2.0 token exchange
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: this.getTokenExchangeHeaders(),
      body: this.buildTokenExchangeBody(code),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code for token: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OAuth error: ${data.error_description || data.error}`);
    }

    return data.access_token;
  }
  
  /**
   * Get headers for token exchange request
   * Override if provider needs different headers
   */
  protected getTokenExchangeHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }
  
  /**
   * Build request body for token exchange
   * Override if provider needs different format
   */
  protected buildTokenExchangeBody(code: string): string {
    return JSON.stringify({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUri,
    });
  }
  
  /**
   * Fetch user profile - must be implemented by each provider
   */
  abstract fetchUserProfile(accessToken: string): Promise<UserProfile>;
  
  /**
   * Fetch user repositories - must be implemented by each provider
   */
  abstract fetchUserRepositories(accessToken: string): Promise<Repository[]>;
  
  /**
   * Revoke access token
   * Default implementation - override if provider has specific revoke endpoint
   */
  async revokeToken(accessToken: string): Promise<boolean> {
    // Default: no-op, not all providers support token revocation
    console.warn(`[OAuth] Token revocation not implemented for ${this.name}`);
    return false;
  }
  
  /**
   * Validate access token is still valid
   * Common pattern: try to fetch user profile
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.fetchUserProfile(accessToken);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Helper: Make authenticated API request
   */
  protected async fetchWithAuth(
    url: string, 
    accessToken: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      ...options.headers,
    };
    
    return fetch(url, {
      ...options,
      headers,
    });
  }
  
  /**
   * Helper: Load environment variable with fallback
   */
  protected static getEnvVar(key: string): string | undefined {
    return import.meta.env[key] ?? process.env[key];
  }
  
  /**
   * Helper: Require environment variable or throw
   */
  protected static requireEnvVar(key: string, providerName: string): string {
    const value = this.getEnvVar(key);
    if (!value) {
      throw new Error(`${providerName} OAuth configuration missing: ${key} not set`);
    }
    return value;
  }
}
