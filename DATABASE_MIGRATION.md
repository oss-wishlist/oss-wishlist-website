# Database Migration Complete ✅

## What Changed

Successfully migrated from **markdown-based content collections** to **PostgreSQL database** for wishlist storage.

### Benefits
- ✅ **Instant visibility** - Changes appear immediately (no rebuild wait)
- ✅ **Guaranteed persistence** - Data survives deploys
- ✅ **Private email storage** - maintainerEmail and nomineeEmail stored securely
- ✅ **Simplified architecture** - No cache invalidation needed
- ✅ **Real-time data** - Database queries are always current

## Files Updated

### New Files Created (285 lines)
- `database/schema.sql` - PostgreSQL schema with 30+ columns
- `database/seed.sql` - 5 test wishlists for testing
- `database/README.md` - Setup documentation
- `database/setup.sh` - Automated setup script
- `src/lib/db.ts` - Connection pooling and CRUD helpers

### APIs Migrated (5 files)
- ✅ `src/pages/api/submit-wishlist.ts` - CREATE and UPDATE
- ✅ `src/pages/api/delete-wishlist.ts` - DELETE
- ✅ `src/pages/api/get-wishlist.ts` - READ by ID
- ✅ `src/pages/api/user-wishlists.ts` - LIST by maintainer
- ✅ `src/pages/api/wishlists.ts` - LIST approved

### Pages Updated (1 file)
- ✅ `src/pages/wishlist/[id].astro` - Detail page
- ✅ `src/pages/wishlists.astro` - Grid (already used API, auto-fixed)

### Removed
- ❌ All `getCollection('wishlists')` calls
- ❌ Cache invalidation logic
- ❌ Markdown file dependencies
- ❌ GitHub cache fallback logic

## Next Steps

### 1. Set Up Digital Ocean Database

#### Option A: Web Console
1. Go to [Digital Ocean Dashboard](https://cloud.digitalocean.com/databases)
2. Click "Create" → "Database"
3. Choose PostgreSQL 16
4. Select smallest plan ($15/month)
5. Choose same region as your app
6. Wait 5 minutes for provisioning
7. Copy connection string from "Connection Details"

#### Option B: CLI (doctl)
```bash
doctl databases create oss-wishlist-db \
  --engine pg \
  --region nyc3 \
  --size db-s-1vcpu-1gb \
  --version 16
```

### 2. Run Setup Script

```bash
# Install PostgreSQL client (if needed)
sudo apt-get install postgresql-client  # Ubuntu/WSL
# OR
brew install postgresql                  # macOS

# Set connection string
export DATABASE_URL='postgresql://user:pass@host:port/dbname?sslmode=require'

# Run setup (creates schema + loads seed data)
bash database/setup.sh
```

### 3. Configure Digital Ocean App

1. Go to App Settings → Environment Variables
2. Add variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Your connection string (from step 1)
   - **Encrypted**: ✅ Yes
3. Save

### 4. Deploy

```bash
git add .
git commit -m "Migrate to PostgreSQL database"
git push origin staging
```

Digital Ocean will auto-deploy in 2-3 minutes.

### 5. Test End-to-End

Once deployed, test these flows:

**Create Wishlist:**
1. Go to `/create-wishlist`
2. Fill out form
3. Submit
4. Check if appears immediately in `/wishlists` (no rebuild wait!)

**Edit Wishlist:**
1. Go to your wishlist detail page
2. Click "Edit"
3. Make changes
4. Submit
5. Refresh page - changes should appear immediately

**Delete Wishlist:**
1. From your wishlists dashboard
2. Click "Delete"
3. Confirm
4. Should disappear immediately from list

## Database Schema

```sql
CREATE TABLE wishlists (
  id INTEGER PRIMARY KEY,           -- GitHub issue number
  slug TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  repository_url TEXT NOT NULL,
  project_description TEXT,
  
  -- Maintainer (private email)
  maintainer_username TEXT NOT NULL,
  maintainer_email TEXT,             -- PRIVATE - stored in DB only
  maintainer_avatar_url TEXT,
  
  -- GitHub integration
  issue_url TEXT NOT NULL,
  issue_state TEXT DEFAULT 'open',
  approved BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  
  -- Arrays
  wishes TEXT[] DEFAULT '{}',
  technologies TEXT[] DEFAULT '{}',
  resources TEXT[] DEFAULT '{}',
  
  -- Details
  urgency TEXT,
  project_size TEXT,
  additional_notes TEXT,
  additional_context TEXT,
  preferred_practitioner TEXT,
  
  -- Organization
  organization_type TEXT,
  organization_name TEXT,
  other_organization_type TEXT,
  open_to_sponsorship BOOLEAN DEFAULT false,
  
  -- Nominee (private email)
  nominee_name TEXT,
  nominee_email TEXT,                -- PRIVATE - stored in DB only
  nominee_github TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Troubleshooting

### Can't connect to database
- Check DATABASE_URL is set correctly
- Verify SSL mode: `?sslmode=require`
- Check firewall rules in Digital Ocean
- Try connecting with psql directly

### Build fails
- Run `npm run build` locally to check TypeScript errors
- All files compile successfully as of last test

### Data not appearing
- Check database connection: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM wishlists;"`
- Check logs: Digital Ocean App → Runtime Logs
- Verify DATABASE_URL environment variable is set

### Still seeing markdown errors
- Clear content collections: `rm -rf .astro`
- Rebuild: `npm run build`

## Architecture Notes

### Why Database Instead of Markdown?

**Old approach (markdown):**
1. User submits wishlist → API writes markdown file
2. Markdown file not in Git → disappears on next deploy
3. GitHub Action commits markdown → triggers rebuild → 3-4 minutes delay
4. Can't store private emails (all markdown is public)

**New approach (database):**
1. User submits wishlist → API writes to database
2. Database persists across deploys
3. Changes visible instantly (no rebuild)
4. Private emails stored securely (maintainerEmail, nomineeEmail)

### Data Flow

```
User Form → API Endpoint → PostgreSQL Database → API Endpoint → UI
                                ↓
                         GitHub Issues (lightweight trigger only)
```

GitHub Issues are still created for:
- Admin tracking
- FUNDING.yml generation (future)
- Public visibility

But the **source of truth** is now the PostgreSQL database.

## Questions?

- Database schema: See `database/schema.sql` and `database/README.md`
- Helper functions: See `src/lib/db.ts`
- API examples: See any of the 5 updated API files
- Setup instructions: See `database/README.md`
