# GitHub Copilot Instructions for OSS Wishlist

## Project Overview

OSS Wishlist is a platform connecting open source maintainers with professional practitioners who can help with non-code needs (governance, funding, security audits, etc.). The platform uses GitHub OAuth for authentication and GitHub Issues as the backend data store.

## Tech Stack

- **Framework**: Astro v5.14.4 with SSR (Server-Side Rendering)
- **Adapter**: @astrojs/node for Node.js deployment
- **Frontend**: React + TypeScript for interactive components
- **Styling**: Tailwind CSS v3 with @tailwindcss/typography plugin
- **Content**: Astro Content Collections with markdown files
- **Authentication**: GitHub OAuth via @octokit/oauth-app
- **Data Storage**: GitHub Issues in oss-wishlist/wishlists repository
- **Validation**: Zod schemas for type safety

## Architecture Patterns

### 1. Content Collections

All content uses Astro's Content Collections with `type: 'content'` (NOT glob loaders):

```typescript
const collection = defineCollection({
  type: 'content',  // Use this, NOT loader: glob()
  schema: z.object({...})
});
```

**Why**: The `type: 'content'` approach provides:
- Built-in `.render()` method for markdown
- Proper `slug` generation
- Better TypeScript support
- No external dependencies needed

**Rendering Pattern**:
```astro
const { Content } = await entry.render();
<div class="prose">
  <Content />
</div>
```

### 2. Authentication Flow

- Uses GitHub OAuth with session-based auth
- Sessions stored in `Astro.locals.user`
- Protected routes check `Astro.locals.user` in middleware
- Client components receive user via props (never from window/global)

**Pattern**:
```astro
---
const user = Astro.locals.user;
---
<AuthenticatedComponent user={user} />
```

### 3. Base Path Handling

The site supports deployment with a base path (e.g., `/oss-wishlist-website` for GitHub Pages).

**Always use**:
```typescript
import { getBasePath } from '../../lib/paths';
const basePath = getBasePath();

// Then use basePath for all links
href={`${basePath}services/${service.slug}`}
```

### 4. GitHub Integration

- **Wishlists**: Stored as GitHub Issues in oss-wishlist/wishlists repo
- **Issue Form Parser**: `src/lib/issue-form-parser.ts` parses GitHub issue form responses
- **Octokit**: Use `@octokit/rest` for GitHub API calls
- **Rate Limits**: Be mindful of GitHub API rate limits

### 5. Content Moderation

- Uses `@2toad/profanity` library (secure, maintained)
- Applied to user-submitted content (wishlist descriptions, etc.)
- See `src/lib/content-moderation.ts`

## Key Directories

```
src/
├── components/          # Astro + React components
│   ├── *.astro         # Astro components (for layouts, static)
│   └── *.tsx           # React components (for interactivity)
├── content/            # Content collections (markdown)
│   ├── services/       # Service offerings
│   ├── practitioners/  # Practitioner profiles
│   ├── guardians/      # Ecosystem sponsors
│   ├── playbooks/      # External docs (Git submodule)
│   ├── faq/           # FAQ entries
│   └── config.ts      # Collection schemas
├── lib/               # Utility functions
│   ├── github.ts      # GitHub API helpers
│   ├── validation.ts  # Zod schemas
│   └── paths.ts       # Base path utilities
├── pages/             # Routes (file-based routing)
│   ├── api/          # API endpoints
│   └── auth/         # OAuth callbacks
└── styles/
    └── global.css     # Global Tailwind styles
```

## Important Patterns & Conventions

### Security Best Practices

1. **Never install unvetted packages**: Only use well-known, secure, maintained packages
2. **Dev server**: Always bind to `localhost` only (not `host: true`)
3. **Environment variables**: All secrets in `.env` (gitignored)
4. **Content moderation**: Apply to all user-submitted text
5. **OAuth scopes**: Request minimal GitHub permissions needed

### Content Collection Schemas

All collections must have complete Zod schemas with:
- Required frontmatter fields (title, description, etc.)
- Proper types (z.string(), z.array(), z.enum(), etc.)
- Optional fields marked with `.optional()`
- Dates as z.date()

### React Components

- **Client directives**: Use `client:load` or `client:only` when needed
- **Props typing**: Always type props with TypeScript interfaces
- **User prop**: Pass user data as props, never from global state
- **Error handling**: Include try/catch blocks for API calls

### Dynamic Routes

```astro
---
export const prerender = true; // For static routes

export async function getStaticPaths() {
  const items = await getCollection('collectionName');
  return items.map((item) => ({
    params: { slug: item.slug },  // Use .slug not .id
    props: { item },
  }));
}

const { item } = Astro.props;
const { Content } = await item.render();
---
```

### API Routes

- Return proper HTTP status codes
- Use `ApiResponse` type from `src/lib/api-response.ts`
- Validate all inputs with Zod schemas
- Handle errors gracefully

### Styling

- Use Tailwind utility classes
- Use `prose` class for markdown content
- Follow existing color/spacing patterns
- Responsive: mobile-first (sm:, md:, lg: breakpoints)

## External Dependencies

### Git Submodules

The `playbooks` collection uses a Git submodule:
- **Location**: `src/content/playbooks-external/`
- **Repo**: https://github.com/oss-wishlist/wishlist-playbooks
- **Sync**: Use regular git submodule commands to pull updates (no local copy/sync script)
- **Files**: Rendered directly from `src/content/playbooks-external/` (no local duplication)

**Important**: When cloning fresh:
```bash
git submodule init
git submodule update
```

### Wishlist Cache

- Static wishlists cached in `public/wishlist-cache/`
- Populated by `scripts/populate-cache.mjs`
- Used for static builds (GitHub Pages)

## Common Tasks

### Adding a New Service

1. Create `src/content/services/new-service.md`
2. Add proper frontmatter (use existing services as template)
3. Service automatically appears in catalog
4. Optionally create playbook in external repo

### Adding a New Practitioner

1. Create `src/content/practitioners/name-practitioner.md`
2. Add frontmatter with expertise, rates, etc.
3. Profile automatically appears in directory

### Adding API Endpoint

1. Create `src/pages/api/endpoint-name.ts`
2. Export async function for HTTP method
3. Use Zod validation for request body
4. Return ApiResponse format

### Debugging

- Check browser console for client errors
- Check terminal for server errors
- Use `console.log` sparingly (clean up before commits)
- Run `npm audit` before commits (0 vulnerabilities required)

## Deployment

- **Platform**: Digital Ocean App Platform
- **Build**: `npm run build`
- **Start**: `npm start` (serves `dist/server/entry.mjs`)
- **Environment**: Set all `.env` variables in platform
- **Submodules**: Ensure submodules clone during build

## Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Follow existing patterns
- **Comments**: Use for complex logic only
- **Naming**: 
  - camelCase for variables/functions
  - PascalCase for components
  - kebab-case for files/folders

## Testing Checklist

Before committing:
- [ ] No console.log statements (except error handling)
- [ ] `npm audit` shows 0 vulnerabilities
- [ ] No TypeScript errors
- [ ] Test authentication flow
- [ ] Test base path routing (if applicable)
- [ ] Mobile responsive check
- [ ] All links use `basePath`

## Resources

- [Astro Docs](https://docs.astro.build)
- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [GitHub OAuth Apps](https://docs.github.com/en/apps/oauth-apps)
- [Octokit REST](https://octokit.github.io/rest.js/)

## Questions?

Check existing code patterns first. The codebase is the source of truth for:
- How collections are structured
- How authentication works
- How GitHub integration works
- Component patterns and styling
