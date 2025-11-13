# GitHub Copilot Instructions for OSS Wishlist

## Working Style with Emma (Developer)

**Git Workflow**:
- ✅ You make code fixes and verify they work
- ✅ You run tests automatically when it makes sense (to catch issues early)
- ✅ You alert when changes are ready for commit
- ❌ You do NOT commit or push - Emma handles all git operations
- **Result**: Emma has full control over commit messages and git history

**Testing**:
- Run tests automatically after making changes
- Report test results clearly
- Alert Emma when tests pass and changes are ready

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

**CRITICAL: All styles must be centralized in `/src/styles/global.css` - NEVER add inline page-specific styles.**

**⚠️ BEFORE ADDING ANY NEW STYLES, YOU MUST:**
1. **ALWAYS search `/src/styles/global.css` for existing classes** that might already do what you need
2. **ALWAYS check if a similar component style already exists** (e.g., `.btn-*`, `.alert-*`, `.link-*`)
3. **ONLY create new styles if no equivalent exists** - reuse existing classes instead
4. **For gradients/hover effects**: Check if `.btn-sparkle` or similar patterns already handle it
5. **NEVER assume you need to add new styles** - 90% of the time the style already exists

**Common Existing Styles You MUST Check For:**
- Button styles: `.btn-primary`, `.btn-secondary`, `.btn-sparkle`
- Alert styles: `.alert-info`, `.alert-error`, `.alert-warning`, `.alert-success`
- Link styles: `.link-secondary`
- Form styles: `.field-required`, `.form-input`, `.form-label`
- Gradient effects: Check for sparkle button patterns (gray-to-purple hover)
- Menu items: `.wishlist-menu-item` (with gradient hover and sparkle particles)

#### Color System

- **Palette**: Strict grayscale only (Gray-50 to Gray-900)
- **Accent Colors**: Purple-500, Purple-600, Violet-700 (for hover/sparkle effects ONLY)
- **NO Other Colors**: Blue, red, green, orange, etc. are NOT permitted
- **Grayscale Compliance**: All critical UI must use grayscale colors for WCAG AA contrast

#### CSS Architecture

1. **Centralized Utility Classes** (`/src/styles/global.css`):
   - All reusable styles defined as `.class-name` utilities
   - Examples: `.btn-primary`, `.btn-sparkle`, `.alert-error`, `.link-secondary`
   - One source of truth for all styling

2. **Button Variants** (defined in global.css):
   - `.btn-primary` - Primary action button (gray with hover effect)
   - `.btn-secondary` - Secondary action button (bordered)
   - `.btn-sparkle` - Premium gradient button with purple hover + particle animations
   - `.btn-sparkle.w-full` - Full-width variant

3. **Alert Boxes** (defined in global.css):
   - `.alert-info` - Informational messages (grayscale)
   - `.alert-error` - Error messages (grayscale, no red)
   - `.alert-warning` - Warning messages (grayscale)
   - `.alert-success` - Success messages (grayscale)

4. **Form Styling** (defined in global.css):
   - `.field-required` - Required field indicator (grayscale alternative to red asterisk)
   - `.form-input` - Standard form input styling
   - `.form-label` - Standard label styling

5. **Links** (defined in global.css):
   - `.link-secondary` - Grayscale link with subtle hover effect

#### Sparkle Effect System

**Sparkle Button** (`.btn-sparkle`):
- Base: Gray gradient (rgb(55,65,81) to rgb(17,24,39))
- Hover: Purple gradient (rgb(147,51,234) to rgb(109,40,217))
- On Hover: 3 purple particles animate outward for 600ms (single burst, not infinite)
- Particle colors: rgb(196,181,253), rgb(167,139,250), rgb(217,213,254)
- Use for: High-value CTAs ("Fulfill wish" buttons, premium actions)

**Sparkle Menu Items** (`.wishlist-menu-item`):
- Background: Purple gradient on hover (from-purple-500 to-violet-700)
- Text: White on hover
- On Hover: 2 purple particles animate outward for 600ms
- Particle colors: rgb(196,181,253), rgb(167,139,250)
- Use for: Menu items you want to highlight as premium

#### When Adding Styles

1. **Check if it exists**: Search `global.css` for similar classes first
2. **Reuse utilities**: Use existing classes before creating new ones
3. **No inline styles**: NEVER add `style=""` attributes or inline `<style>` tags
4. **No per-page CSS**: NEVER add page-specific CSS files
5. **Use Tailwind for structure only**: Apply Tailwind classes for layout/spacing, but colors must be from palette
6. **Color validation**: Before using any color, ask: "Is this gray, purple, or accent-only?"

#### Tailwind + Standard CSS Approach

- **Tailwind used for**: Layout (flex, grid, spacing, sizing), typography (font-size, font-weight)
- **Standard CSS used for**: Colors (grayscale only), gradients, animations, hover effects
- **Why**: Tailwind utilities don't have enough control for custom gradients/animations needed for sparkle effect

#### Testing Styles

Before committing:
- [ ] No inline `style=""` attributes in any file
- [ ] No new color values outside grayscale + purple
- [ ] All buttons use utility classes (not inline)
- [ ] All alerts use `.alert-*` classes
- [ ] Menu items use `.wishlist-menu-item` class
- [ ] Sparkle effects only on high-value CTAs
- [ ] Responsive: works on mobile (sm:), tablet (md:), desktop (lg:)

#### Example: Adding a Button

**DO (Correct)**:
```astro
<!-- Page file (fill.astro) -->
<button class="btn-sparkle w-full">
  <svg class="btn-sparkle-icon">...</svg>
  <span class="btn-sparkle-text">Submit</span>
  <div class="btn-sparkle-particles">
    <!-- particles with animation -->
  </div>
</button>

<!-- Defined once in global.css -->
.btn-sparkle {
  /* all styles here, reused everywhere */
}
```

**DON'T (Incorrect)**:
```astro
<!-- Page file (fill.astro) -->
<button style="background: linear-gradient(...); color: white;">
  Submit
</button>
```

#### Responsive Design

- Mobile-first: Start with mobile styles, add breakpoints
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Example: `class="px-2 md:px-4 lg:px-8"`

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
