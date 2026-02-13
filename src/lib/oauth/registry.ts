/**
 * OAuth Provider Registry
 * 
 * Central registry for managing OAuth providers.
 * Provides factory functions to instantiate providers based on configuration.
 */

import type { OAuthProvider, OAuthProviderName } from './types.js';
import { createGitHubProvider } from './providers/github.js';
import { createGitLabProvider } from './providers/gitlab.js';
// import { createCodebergProvider } from './providers/codeberg.js';

/**
 * Registry of available OAuth providers
 */
const PROVIDER_FACTORIES = {
  github: createGitHubProvider,
  gitlab: createGitLabProvider,
  // codeberg: createCodebergProvider,
  // Add more providers as needed:
  // google: createGoogleProvider,
} as const;

/**
 * Cache instantiated providers to avoid recreating them
 */
const providerCache: Partial<Record<OAuthProviderName, OAuthProvider | null>> = {};

/**
 * Get an OAuth provider by name
 * @param name - Provider name (github, gitlab, google, etc.)
 * @returns OAuth provider instance or null if not available/configured
 */
export function getOAuthProvider(name: OAuthProviderName): OAuthProvider | null {
  // Check cache first
  if (name in providerCache) {
    return providerCache[name] ?? null;
  }
  
  // Get factory function
  const factory = PROVIDER_FACTORIES[name];
  
  if (!factory) {
    console.warn(`[OAuth] No provider factory found for: ${name}`);
    providerCache[name] = null;
    return null;
  }
  
  // Create provider instance
  const provider = factory();
  
  // Cache it (even if null, to avoid repeated attempts)
  providerCache[name] = provider;
  
  return provider;
}

/**
 * Get all available (configured) OAuth providers
 * @returns Array of available provider instances
 */
export function getAvailableProviders(): OAuthProvider[] {
  const available: OAuthProvider[] = [];
  
  for (const name of Object.keys(PROVIDER_FACTORIES) as OAuthProviderName[]) {
    const provider = getOAuthProvider(name);
    if (provider) {
      available.push(provider);
    }
  }
  
  return available;
}

/**
 * Check if a specific provider is configured and available
 * @param name - Provider name to check
 * @returns True if provider is available
 */
export function isProviderAvailable(name: OAuthProviderName): boolean {
  return getOAuthProvider(name) !== null;
}

/**
 * Clear provider cache (useful for testing or config reload)
 */
export function clearProviderCache(): void {
  for (const key in providerCache) {
    delete providerCache[key as OAuthProviderName];
  }
}
