# Database Setup for OSS Wishlist

This directory contains the PostgreSQL schema and setup scripts for the OSS Wishlist platform.

## Quick Start

### 1. Create Database on Digital Ocean

1. Go to Digital Ocean → Databases → Create Database
2. Choose **PostgreSQL** version 16+
3. Select a datacenter close to your app
4. Choose a plan (Basic $15/mo recommended for staging)
5. Name it: `oss-wishlist-db`

### 2. Get Connection Details

After database is created, go to the "Connection Details" tab and note:
- Host
- Port
- Database name
- Username
- Password

### 3. Set Environment Variables

Add to Digital Ocean App Platform (Settings → App-Level Environment Variables):

```bash
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
```

Or set individual variables:
```bash
PGHOST=your-db-host.ondigitalocean.com
PGPORT=25060
PGDATABASE=defaultdb
PGUSER=doadmin
PGPASSWORD=your-password
PGSSLMODE=require
```

### 4. Run Schema Migration

From your local machine (requires `psql` installed):

```bash
# Using connection string
psql "postgresql://username:password@host:port/database?sslmode=require" -f database/schema.sql

# Or using environment variables
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f database/schema.sql
```

### 5. Load Seed Data (Optional - for testing)

```bash
psql "postgresql://username:password@host:port/database?sslmode=require" -f database/seed.sql
```

## Local Development

For local testing, use Docker:

```bash
# Start PostgreSQL locally
docker run --name oss-wishlist-postgres \
  -e POSTGRES_PASSWORD=localpass \
  -e POSTGRES_DB=oss_wishlist \
  -p 5432:5432 \
  -d postgres:16

# Run migrations
psql "postgresql://postgres:localpass@localhost:5432/oss_wishlist" -f database/schema.sql

# Load seed data
psql "postgresql://postgres:localpass@localhost:5432/oss_wishlist" -f database/seed.sql
```

Then add to your local `.env`:
```bash
DATABASE_URL=postgresql://postgres:localpass@localhost:5432/oss_wishlist
```

## Schema Overview

### `wishlists` Table

Stores all wishlist submissions with the following key fields:

- **Identifiers**: `id` (GitHub issue #), `slug` (URL-friendly)
- **Project Info**: `project_name`, `repository_url`, `project_description`
- **Maintainer**: `maintainer_username`, `maintainer_email` (private)
- **Services**: `wishes` (array of service slugs)
- **Status**: `approved`, `status`, `issue_state`
- **Details**: `urgency`, `project_size`, `technologies`
- **Organization**: `organization_type`, `organization_name`
- **Coordination**: `nominee_name`, `nominee_email` (private)

### Indexes

- `maintainer_username` - Fast user wishlist lookups
- `approved` - Quick filtering of approved wishlists
- `status` - Status-based queries
- `created_at` - Chronological sorting
- `issue_state` - Open/closed filtering

## Querying Examples

```sql
-- Get all approved wishlists
SELECT * FROM wishlists WHERE approved = TRUE ORDER BY created_at DESC;

-- Get wishlists by maintainer
SELECT * FROM wishlists WHERE maintainer_username = 'username';

-- Get wishlist by issue number
SELECT * FROM wishlists WHERE id = 100;

-- Search by service type
SELECT * FROM wishlists WHERE 'governance-setup' = ANY(wishes);

-- Count pending wishlists
SELECT COUNT(*) FROM wishlists WHERE approved = FALSE;
```

## Migration Notes

- The `updated_at` column automatically updates on any row change (via trigger)
- Arrays are used for `wishes`, `technologies`, and `resources` for flexible querying
- Private fields (`maintainer_email`, `nominee_email`) are stored but never exposed in public APIs
- The `slug` field maintains URL compatibility with the old markdown-based system
