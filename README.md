# OSS Wishlist Website

A platform connecting open source maintainers with supporters and practitioners who can help with project needs. Built with Astro, Tailwind CSS, and React.

## 🚀 Setting up your dev environment

### Prerequisites
- Node.js (v18+ recommended)
- npm 
- Git
- GitHub account (for API access)

### Step-by-step setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/oss-wish-list/oss-wishlist-website.git
   cd oss-wishlist-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file and add your configuration:
   
   ```env
   # Site Mode - Controls which homepage to display
   # Set to 'placeholder' for "Coming Soon" page
   # Set to 'full' for complete website
   PUBLIC_SITE_MODE=full
   
   # Required: GitHub Personal Access Token (only needed for full mode)
   # Create one at: https://github.com/settings/tokens/new
   # Needs 'repo' scope for creating issues
   GITHUB_TOKEN=your_github_token_here
   
   # GitHub OAuth (optional - only needed for user authentication)
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   GITHUB_REDIRECT_URI=http://localhost:4323/oss-wishlist-website/auth/callback
   
   # Email settings (optional)
   EMAIL_FROM=noreply@oss-wishlist.com
   EMAIL_TO=your_email@example.com
   
   # Environment
   NODE_ENV=development
   PUBLIC_SITE_URL=http://localhost:4323/oss-wishlist-website
   BASE_URL=http://localhost:4323/oss-wishlist-website
   ```

   **🎭 Switching Between Placeholder and Full Site:**
   - **Placeholder mode**: Set `PUBLIC_SITE_MODE=placeholder` in `.env`
   - **Full site mode**: Set `PUBLIC_SITE_MODE=full` in `.env`
   - After changing, restart the dev server (`Ctrl+C` then `npm run dev`)

   **🔑 Creating a GitHub Token:**
   1. Go to [GitHub Settings > Personal access tokens](https://github.com/settings/tokens/new)
   2. Click "Generate new token (classic)"
   3. Give it a name like "OSS Wishlist Dev"
   4. Select scopes: `repo` (for creating issues)
   5. Copy the token and paste it in your `.env` file

4. **Start development server**
   ```bash
   npm run dev
   ```
   
   The server will run on port 4324 by default and display the URLs:
   ```
   Local:    http://localhost:4324/
   Network:  http://192.168.1.x:4324/
   ```
   
   **Note:** Port 4324 is configured in `astro.config.mjs` for local development only. Production deployments use environment variables.

5. **You're ready!** Open the Local URL in your browser.

### Quick Start (Demo Mode)
If you just want to see the site without GitHub integration:
```bash
git clone https://github.com/oss-wish-list/oss-wishlist-website.git
cd oss-wishlist-website
npm install
npm run dev
```
The site will work for browsing, but wishlist creation will be disabled without a GitHub token.

### Placeholder Mode
The site includes a "Coming Soon" placeholder page for pre-launch use:

1. **Enable placeholder mode:**
   - Create or edit `.env` file
   - Set `PUBLIC_SITE_MODE=placeholder`
   - Restart dev server

2. **Return to full site:**
   - Change to `PUBLIC_SITE_MODE=full` in `.env`
   - Restart dev server

The placeholder page displays:
- Project logo
- "Coming November 2025" message
- Brief description for maintainers, practitioners, and sponsors
- GitHub link in footer

## 🎯 What This Platform Does

- **For Maintainers**: Create wishlists describing what help your project needs
- **For Practitioners**: Browse projects that need your expertise 
- **For Ecosystem Sponsors**: Support critical open source infrastructure
- **Service Catalog**: Browse available services and expertise areas

## 🛠️ Tech Stack

- **Astro** (v5.x) - SSR with Node adapter
- **Tailwind CSS** (v3.x) - Styling
- **React** + **TypeScript** - Interactive components
- **GitHub OAuth** - Authentication
- **Markdown** - Content management

## 📒 Playbooks (submodule)

Playbooks are maintained in an external repository and included here as a Git submodule.

- Location in this repo: `src/content/playbooks-external/`
- Source repo: https://github.com/oss-wishlist/wishlist-playbooks
- We don’t duplicate playbooks into a local content folder; the submodule is the single source of truth

### Initialize or update the submodule

```bash
git submodule init
git submodule update
```

### Linking playbooks from a Service

In a service frontmatter (e.g., `src/content/services/funding-strategy.md`), link to the playbook folder name:

```yaml
---
title: Funding Strategy
playbook: funding-strategy      # or use `playbooks: ["a", "b"]` for multiple
---
```

This maps to `src/content/playbooks-external/funding-strategy/playbook.md`.

### Adding or editing a playbook

Playbooks live in the external repo. To add or improve one:
1. Open the source repo: https://github.com/oss-wishlist/wishlist-playbooks
2. Add a new folder (kebab-case) and a `playbook.md` inside
3. Submit a PR to that repo

Note: Manual edits to submodule files should be done in the source repo via PR; changes made locally in the submodule will be overwritten on update.

## � Key Files & Folders

```
src/
├── pages/                 # Website pages
│   ├── index.astro       # Homepage
│   ├── practitioners.astro # Browse practitioners
│   ├── maintainers.astro  # Create wishlists
│   └── ecosystem-guardians.astro # Sponsor info
├── content/              # Content collections (markdown files)
│   ├── practitioners/    # Practitioner profiles
│   ├── guardians/        # Sponsor organizations
│   ├── services/         # Available services
│   ├── wishlists/        # Project wishlists
│   └── faq/              # FAQ entries
└── components/           # Reusable components
```

## 🎨 Making Changes

### Adding Content
All content is in markdown files under `src/content/`:

- **New Practitioner**: Add file to `src/content/practitioners/`
- **New Service**: Add file to `src/content/services/`
- **New FAQ**: Add file to `src/content/faq/`
- **New Sponsor**: Add file to `src/content/guardians/`

### Updating Pages
Main pages are in `src/pages/` as `.astro` files. Edit directly and save - the dev server will auto-reload.

### Environment Variables
Copy `.env` file for any API keys or configuration. The site works without setup for demo purposes.

## 🚀 Deployment

```bash
npm run build    # Build for production
npm run preview  # Preview built site locally
```

## 🔒 Common Issues

**Port already in use?** The dev server will automatically try different ports (4323, 4324, 4325, etc.)

**Changes not showing?** The dev server auto-reloads, but try refreshing your browser.

**Content not loading?** Check the markdown frontmatter matches the schema in `src/content/config.ts`

## 🚀 Staging Environment Setup

For staging deployments, prevent search engine indexing by adding to your `.env`:

```env
DISABLE_INDEXING=true
```

This will:
- Add `X-Robots-Tag: noindex, nofollow` headers to all pages
- Generate a `robots.txt` that disallows all crawlers
- Prevent search engines from indexing your staging site

**For production**: Omit `DISABLE_INDEXING` or set it to `false` in your `.env`

## 📝 Quick Reference

### Available Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production  
npm run preview  # Preview production build
```

### Key URLs (when running locally)
- **Homepage**: `/` - Main landing page
- **For Maintainers**: `/maintainers` - Create project wishlists
- **Practitioners**: `/practitioners` - Browse available practitioners
- **Ecosystem Sponsors**: `/ecosystem-guardians` - Sponsor organizations
- **FAQ**: `/faq` - Frequently asked questions
- **Service Catalog**: `/catalog` - Browse all services

### Content Structure Example
```markdown
---
# Frontmatter (metadata)
name: "Example Person"
specialties: ["Security", "Community"]
---

# Content goes here in markdown
This person specializes in...
```

---

## 📚 Additional Info

### Project Status
This is a working demo platform connecting open source maintainers with practitioners and ecosystem sponsors.

### AI Assistance
Portions of this codebase were developed with assistance from AI tools, specifically GitHub Copilot with Claude Sonnet 4.5. All AI-generated code has been reviewed, tested, and modified to meet project standards and security requirements.

### Contributing
The platform uses markdown-based content management. To add new content, create markdown files in the appropriate `src/content/` subdirectory.

### Support
For questions about setup or deployment, check the git history for configuration details or contact the development team.

