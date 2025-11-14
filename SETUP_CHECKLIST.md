# Digital Ocean Database Setup Checklist

## ✅ Code Changes Complete

- [x] Database schema created (30+ columns with indexes)
- [x] Seed data created (5 test wishlists)
- [x] Connection utility with pooling (src/lib/db.ts)
- [x] 5 API endpoints migrated to database
- [x] 1 page migrated to database
- [x] Build passes with no TypeScript errors
- [x] Setup script created (database/setup.sh)

**Total changes:** 14 files modified/created

## 📝 Setup Steps (Do These Now)

### Step 1: Create Digital Ocean Database (5 min)

1. Go to: https://cloud.digitalocean.com/databases
2. Click "Create Database"
3. Choose:
   - **Engine**: PostgreSQL
   - **Version**: 16
   - **Plan**: Basic ($15/month for starter)
   - **Region**: Same as your app (check app settings)
   - **Database name**: `oss_wishlist`
4. Click "Create Database Cluster"
5. Wait ~5 minutes for provisioning
6. Copy **Connection String** from "Connection Details" tab
   - Should look like: `postgresql://doadmin:xxx@yyy-do-user-zzz.db.ondigitalocean.com:25060/oss_wishlist?sslmode=require`

### Step 2: Run Setup Script (2 min)

**On your local machine (WSL/Ubuntu):**

```bash
# Install PostgreSQL client (if not already installed)
sudo apt-get update
sudo apt-get install postgresql-client

# Set your connection string
export DATABASE_URL='YOUR-CONNECTION-STRING-FROM-STEP-1'

# Navigate to project
cd ~/oss-wish/emma

# Run setup script
bash database/setup.sh
```

Expected output:
```
🚀 Setting up PostgreSQL database...
📋 Creating database schema...
✅ Schema created
🌱 Loading seed data...
✅ Seed data loaded
🔍 Verifying setup...
✅ Found 5 wishlists in database
🎉 Database setup complete!
```

### Step 3: Configure Digital Ocean App (2 min)

1. Go to: https://cloud.digitalocean.com/apps
2. Click your app (oss-wishlist-website)
3. Go to "Settings" tab
4. Click "App-Level Environment Variables"
5. Click "Edit" or "Add Variable"
6. Add:
   - **Key**: `DATABASE_URL`
   - **Value**: Your connection string (same as Step 1)
   - **Encrypt**: ✅ Check this box
7. Click "Save"

### Step 4: Deploy Code (3 min)

```bash
# Check what's changed
git status

# Stage all changes
git add .

# Commit
git commit -m "Migrate to PostgreSQL database for instant visibility"

# Push to staging
git push origin staging
```

Digital Ocean will auto-deploy in 2-3 minutes.

### Step 5: Test End-to-End (5 min)

Once deployment completes (check Digital Ocean dashboard):

**Test 1: Create Wishlist**
1. Go to: `https://your-app.ondigitalocean.app/create-wishlist`
2. Log in with GitHub
3. Fill out form
4. Submit
5. ✅ Should redirect to `/wishlists` and appear **immediately** (no wait!)

**Test 2: View Wishlist**
1. Click on your new wishlist
2. ✅ Should see all details

**Test 3: Edit Wishlist**
1. Click "Edit" button
2. Change project name
3. Submit
4. Refresh page
5. ✅ Changes should appear **immediately** (no rebuild!)

**Test 4: Delete Wishlist** (optional)
1. Go to your wishlists dashboard
2. Click "Delete" on test wishlist
3. Confirm
4. ✅ Should disappear **immediately**

## ⏱️ Total Time Estimate

- **Database creation**: 5 min (mostly waiting)
- **Setup script**: 2 min
- **App configuration**: 2 min
- **Deploy**: 3 min
- **Testing**: 5 min

**Total: ~17 minutes**

## 🎯 Success Criteria

After completing all steps, you should see:

- ✅ No 3-4 minute delays for changes to appear
- ✅ Wishlists persist across deploys
- ✅ Create/edit/delete all work instantly
- ✅ Emails still sent correctly
- ✅ GitHub issues still created

## 🐛 Troubleshooting

### Database connection fails
```bash
# Test connection manually
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM wishlists;"
```

Should output: `5` (from seed data)

### Build fails on Digital Ocean
- Check Runtime Logs in Digital Ocean dashboard
- Look for "DATABASE_URL" in environment variables
- Verify no TypeScript errors: `npm run build` locally

### Data not showing
1. Check database has data:
   ```bash
   psql "$DATABASE_URL" -c "SELECT id, project_name, approved FROM wishlists;"
   ```
2. Check API endpoint:
   ```bash
   curl https://your-app.ondigitalocean.app/api/wishlists
   ```
3. Check browser console for errors

## 📞 Need Help?

- Database schema: See `database/schema.sql`
- API examples: See `src/pages/api/*.ts`
- Full docs: See `DATABASE_MIGRATION.md`
- Setup details: See `database/README.md`

## 🚀 Ready?

Run the steps above and let me know when:
1. Database is created
2. Setup script completes
3. Deploy finishes

Then we'll test together! 🎉
