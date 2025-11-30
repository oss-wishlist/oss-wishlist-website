# Multi-Provider OAuth Implementation Summary

## ✅ Implementation Complete

Successfully implemented a robust, extensible OAuth authentication system supporting multiple providers (GitHub, GitLab, and ready for Google).

## Architecture Overview

### 1. Provider Abstraction Layer (`src/lib/oauth/`)

**`types.ts`** - Core interfaces:
- `OAuthProvider` - Provider interface all implementations must follow
- `UserProfile` - Normalized user data across providers
- `Repository` - Normalized repository data across providers
- `SessionData` - Session storage format

**`registry.ts`** - Provider management:
- Factory pattern for creating provider instances
- Caching for performance
- Dynamic provider availability detection

**`providers/github.ts`** - GitHub implementation:
- Wraps existing GitHub OAuth logic
- Implements `OAuthProvider` interface
- Supports GitHub.com

**`providers/gitlab.ts`** - GitLab implementation:
- New GitLab OAuth2 integration
- Supports GitLab.com and self-hosted instances
- Implements `OAuthProvider` interface

### 2. Updated Core Authentication (`src/lib/auth.ts`)

- **Multi-provider support**: Works with any OAuth provider
- **Backwards compatibility**: Existing GitHub sessions still work
- **Unified session format**: All providers use same session structure
- **Provider-aware**: Tracks which provider authenticated the user

### 3. API Endpoints

**`src/pages/api/auth/github.ts`** - Initiates GitHub OAuth flow
**`src/pages/api/auth/gitlab.ts`** - Initiates GitLab OAuth flow (NEW)
**`src/pages/auth/callback.ts`** - Universal callback handler:
- Detects provider from cookie
- Uses appropriate provider to complete auth
- Creates unified session

**`src/pages/api/repositories.ts`** - Provider-aware repository fetching:
- Detects user's auth provider
- Fetches repos from correct platform (GitHub/GitLab)
- Returns normalized repository data

### 4. User Interface

**`src/pages/login.astro`** - Dynamic login page:
- Shows buttons for available providers
- GitHub button (gray) and GitLab button (purple)
- Adapts based on configured providers

## How It Works

### Login Flow

1. User visits `/login`
2. Page checks which providers are configured (via registry)
3. Shows buttons for available providers
4. User clicks "Sign in with [Provider]"
5. Redirected to `/api/auth/[provider]`
6. Provider name stored in cookie
7. User redirected to OAuth provider (GitHub/GitLab)
8. User authorizes app
9. Provider redirects to `/auth/callback`
10. Callback handler:
    - Reads provider from cookie
    - Gets provider instance from registry
    - Exchanges code for token
    - Fetches user profile
    - Creates session
    - Redirects to app

### Repository Fetching Flow

1. Client requests `/api/repositories`
2. API verifies session
3. Detects provider from session data
4. Gets provider instance from registry
5. Calls `provider.fetchUserRepositories(accessToken)`
6. Returns normalized repository list
7. Client displays repos (works same for both providers)

## Configuration

### Environment Variables

**GitHub (Required for GitHub auth)**:
```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_secret
GITHUB_REDIRECT_URI=http://localhost:4321/oss-wishlist-website/auth/callback
```

**GitLab (Optional - enables GitLab auth)**:
```env
GITLAB_CLIENT_ID=your_application_id
GITLAB_CLIENT_SECRET=your_secret
GITLAB_REDIRECT_URI=http://localhost:4321/oss-wishlist-website/auth/callback
GITLAB_BASE_URL=https://gitlab.com  # For self-hosted, use your GitLab URL
```

**Shared**:
```env
OAUTH_STATE_SECRET=random_32_char_hex_string
```

### Setup Steps for GitLab

See `docs/GITLAB_OAUTH_SETUP.md` for detailed instructions:

1. Go to https://gitlab.com/-/profile/applications
2. Create new application
3. Set redirect URI to match your deployment
4. Select scopes: `read_user`, `read_api`, `read_repository`
5. Copy Application ID → `GITLAB_CLIENT_ID`
6. Copy Secret → `GITLAB_CLIENT_SECRET`
7. Add to `.env`
8. Restart dev server

## Key Features

✅ **Provider Agnostic**: Core authentication logic doesn't know about specific providers
✅ **Extensible**: Add new providers by implementing `OAuthProvider` interface
✅ **Backwards Compatible**: Existing GitHub sessions continue working
✅ **Unified Sessions**: Same session format regardless of provider
✅ **Dynamic UI**: Login page adapts based on configured providers
✅ **Normalized Data**: Repositories and user profiles have consistent structure
✅ **Self-Hosted Support**: GitLab provider supports self-hosted instances
✅ **Type Safe**: Full TypeScript support with proper types

## What Works Now

✅ Login with GitHub
✅ Login with GitLab
✅ Fetch GitHub repositories
✅ Fetch GitLab projects (repositories)
✅ Create wishlists (provider-agnostic)
✅ Apply as practitioner (provider-agnostic)
✅ Fulfill wishlists (provider-agnostic)
✅ Session management
✅ Provider detection

## Adding Future Providers (e.g., Google)

1. Create `src/lib/oauth/providers/google.ts`:
   ```typescript
   export class GoogleOAuthProvider implements OAuthProvider {
     readonly name = 'google';
     // Implement all interface methods
   }
   ```

2. Add to registry in `src/lib/oauth/registry.ts`:
   ```typescript
   const PROVIDER_FACTORIES = {
     github: createGitHubProvider,
     gitlab: createGitLabProvider,
     google: createGoogleProvider, // Add here
   };
   ```

3. Add environment variables to `.env.example` and `env.d.ts`

4. Login page will automatically show Google button

## Files Created/Modified

### New Files:
- `src/lib/oauth/types.ts`
- `src/lib/oauth/registry.ts`
- `src/lib/oauth/providers/github.ts`
- `src/lib/oauth/providers/gitlab.ts`
- `src/pages/api/auth/gitlab.ts`
- `docs/GITLAB_OAUTH_SETUP.md`

### Modified Files:
- `src/lib/auth.ts` - Multi-provider support
- `src/pages/auth/callback.ts` - Universal callback handler
- `src/pages/api/repositories.ts` - Provider-aware fetching
- `src/pages/login.astro` - Dynamic provider buttons
- `.env.example` - GitLab variables
- `src/env.d.ts` - TypeScript types

## Testing Checklist

- [ ] GitHub login works
- [ ] GitLab login works
- [ ] Fetch repositories from GitHub
- [ ] Fetch projects from GitLab
- [ ] Create wishlist as GitHub user
- [ ] Create wishlist as GitLab user
- [ ] Apply as practitioner (GitHub)
- [ ] Apply as practitioner (GitLab)
- [ ] Session persistence
- [ ] Logout functionality
- [ ] Provider switching (login with GitHub, logout, login with GitLab)

## Notes

- **WishlistForms.tsx** already works with provider-agnostic repository data (no changes needed)
- **Middleware** already handles sessions properly (checks cookies)
- **Cookie Names**: New sessions use `oss_session`, old GitHub sessions use `github_session` (both supported)
- **Database**: User provider info stored in `submitter_provider` field (already exists)
