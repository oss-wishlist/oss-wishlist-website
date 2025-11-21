
# Contributing to OSS Wishlist

Contributions are welcome! Whether you want to report a bug, suggest an enhancement, or submit a pull request, your input is appreciated.

- Please be kind and respectful. All contributors must follow our [Code of Conduct](./CODE_OF_CONDUCT.md).
- This repository is for the OSS Wishlist website: [oss-wishlist-website](https://github.com/oss-wish-list/oss-wishlist-website)
- For issues or feature requests, please use GitHub Issues.

## Architecture Overview

OSS Wishlist uses a **database-driven architecture**:

- **Database**: PostgreSQL (hosted on Digital Ocean) stores all wishlists, practitioners, and fulfillments
- **Authentication**: GitHub OAuth for user login and identity
- **Public API**: JSON feed at `/wishlist-cache/all-wishlists.json` auto-updates via GitHub Actions
- **Frontend**: Astro v5 with SSR, React components, and Tailwind CSS

**No more GitHub Issues backend!** All data is in the database, synced in real-time.

## Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or hosted)
- GitHub OAuth App credentials

### Initial Setup

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
   # Edit .env with your credentials
   ```

   Required variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `GITHUB_CLIENT_ID` - GitHub OAuth app client ID
   - `GITHUB_CLIENT_SECRET` - GitHub OAuth app secret
   - `OAUTH_STATE_SECRET` - Random string for session encryption
   - `GITHUB_TOKEN` - GitHub PAT for triggering workflows (optional)

4. **Initialize the database**
   ```bash
   # Run schema.sql against your PostgreSQL database
   psql $DATABASE_URL -f schema.sql
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   Visit: http://localhost:4321

### Running Tests

```bash
npm test                    # Run all tests
npm test -- <filename>      # Run specific test file
npm run test:ui            # Run with UI (if configured)
```

We have 278+ tests covering:
- Database operations (wishlists, practitioners, fulfillments)
- API endpoints (submit, approve, reject, delete)
- Form validation and security
- Authentication flows
- Admin dashboard

## Contributing Code

### Workflow

1. **Fork the repository** and create a new branch from `staging`
   ```bash
   git checkout -b feature/your-feature-name staging
   ```

2. **Make your changes** following our code style
   - Use TypeScript for type safety
   - Follow existing patterns in the codebase
   - Add tests for new features
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm test                 # All tests must pass
   npm run build           # Must build successfully
   ```

4. **Commit with clear messages**
   ```bash
   git commit -m "Add feature: clear description of what changed"
   ```

5. **Push and create a Pull Request** to the `staging` branch
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Style Guidelines

- **Centralized Styles**: All CSS in `src/styles/global.css` - NO inline styles or per-page CSS
- **Color Palette**: Grayscale only (Gray-50 to Gray-900) + purple accents for highlights
- **Components**: Use Astro components for static content, React for interactivity
- **Base Paths**: Always use `getBasePath()` for links (supports deployment to subdirectories)
- **Authentication**: Check `Astro.locals.user` in pages, pass as props to components
- **Database**: Use functions from `src/lib/db.ts` - never write raw SQL in pages

### Key Files to Know

- `src/lib/db.ts` - All database operations
- `src/lib/github-oauth.ts` - Authentication logic
- `src/pages/api/` - API endpoints
- `src/pages/admin.astro` - Admin dashboard
- `src/styles/global.css` - All styles (buttons, alerts, forms, etc.)
- `schema.sql` - Database schema

## Contributing Content

### Playbooks
Playbooks are maintained in a separate repository: [oss-wishlist/wishlist-playbooks](https://github.com/oss-wishlist/wishlist-playbooks). To contribute a new playbook or improve an existing one, please submit a pull request to that repository.

### Services
Add new services to `src/content/services/`. Each service needs:
- Markdown frontmatter with title, description, category
- Clear description of what the service provides
- Examples of when maintainers need this service

### Practitioners
Practitioners apply via the website at `/apply-practitioner`. After admin approval, they appear in the directory.

**Do not add practitioner profiles manually** - they must go through the application and approval process.

### Campaigns
To feature a campaign, submit a pull request adding a markdown file to the `src/content/campaigns/` folder. Campaigns should be time-bound, sustainability-focused initiatives. See existing files in that directory for examples.

## Database Schema

Key tables:
- `wishlists` - Project wishlist submissions
- `practitioners` - Verified practitioners offering services
- `fulfillments` - Practitioners fulfilling wishlists
- All tables have `approved` boolean for moderation

See `schema.sql` for full schema definition.

## Admin Workflow

Admins can:
1. **Approve/Reject Wishlists** - Sets `approved` flag, triggers JSON rebuild
2. **Approve/Reject Practitioners** - Makes them visible in directory
3. **Approve/Reject Fulfillments** - Shows on wishlist pages
4. **Delete Content** - Hard deletes from database

Admin actions trigger GitHub Actions to rebuild `all-wishlists.json`.

## Deployment

The site deploys to Digital Ocean App Platform:
- **Staging**: Automatic deploy from `staging` branch
- **Production**: Automatic deploy from `main` branch

Environment variables must be set in the App Platform dashboard.

### Testing Deployment

See `copilot_notes/DEPLOYMENT_QUICK_TEST.md` for step-by-step testing guide:
1. Approve a wishlist via admin panel
2. Verify GitHub Action triggers
3. Check `all-wishlists.json` updates
4. Verify wishlist appears on public page

## Getting Help

- **Questions?** Open a GitHub Issue
- **Bugs?** Open a GitHub Issue with reproduction steps
- **Feature Ideas?** Open an issue tagged "enhancement"
- **Discord**: Join our community at https://discord.gg/9BY9P5FD

## Pull Request Checklist

Before submitting:

- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors or warnings
- [ ] Followed code style guidelines
- [ ] Added/updated tests for new features
- [ ] Updated documentation if needed
- [ ] Tested with authentication (logged in/out)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for helping make OSS Wishlist better! 🎉
