/**
 * Central ecosystem/package manager configuration
 * Used across the application for consistent ecosystem selection and filtering
 */

export const SUPPORTED_ECOSYSTEMS = [
  'npm (Node.js/JavaScript)',
  'PyPI (Python)',
  'Crates.io (Rust)',
  'NuGet (.NET)',
  'Maven Central (Java)',
  'RubyGems (Ruby)',
  'Packagist (PHP)',
  'Go Modules (Go)',
  'Hex (Elixir)',
  'Pub (Dart/Flutter)',
  'CPAN (Perl)',
  'Hackage (Haskell)',
  'Clojars (Clojure)',
  'CocoaPods (iOS/macOS)',
  'Other/Custom',
];

export interface EcosystemStats {
  [key: string]: {
    count: number;
    wishlists: number[];
  };
}

/**
 * Get all supported ecosystems
 */
export function getEcosystems(): string[] {
  return SUPPORTED_ECOSYSTEMS;
}

/**
 * Normalize ecosystem name (remove parenthetical descriptions for matching)
 */
export function normalizeEcosystem(ecosystem: string): string {
  return ecosystem.split(' (')[0].trim();
}

/**
 * Get display name for ecosystem (full name with description)
 */
export function getEcosystemDisplayName(ecosystem: string): string {
  return SUPPORTED_ECOSYSTEMS.find(e => 
    normalizeEcosystem(e) === normalizeEcosystem(ecosystem)
  ) || ecosystem;
}
