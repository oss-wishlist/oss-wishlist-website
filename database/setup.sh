#!/bin/bash
# Digital Ocean PostgreSQL Setup Script
# 
# Usage:
#   1. Set DATABASE_URL environment variable
#   2. Run: bash database/setup.sh
#
# Or pass connection string as argument:
#   bash database/setup.sh "postgresql://user:pass@host:port/dbname?sslmode=require"

set -e  # Exit on error

# Get connection string from argument or environment
CONNECTION_STRING="${1:-$DATABASE_URL}"

if [ -z "$CONNECTION_STRING" ]; then
  echo "❌ Error: DATABASE_URL not set"
  echo ""
  echo "Usage:"
  echo "  export DATABASE_URL='postgresql://user:pass@host:port/dbname?sslmode=require'"
  echo "  bash database/setup.sh"
  echo ""
  echo "Or:"
  echo "  bash database/setup.sh 'postgresql://user:pass@host:port/dbname?sslmode=require'"
  exit 1
fi

echo "🚀 Setting up PostgreSQL database..."
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "❌ Error: psql command not found"
  echo "Install PostgreSQL client:"
  echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
  echo "  macOS: brew install postgresql"
  exit 1
fi

# Run schema
echo "📋 Creating database schema..."
psql "$CONNECTION_STRING" -f database/schema.sql
echo "✅ Schema created"
echo ""

# Load seed data
echo "🌱 Loading seed data..."
psql "$CONNECTION_STRING" -f database/seed.sql
echo "✅ Seed data loaded"
echo ""

# Verify
echo "🔍 Verifying setup..."
WISHLIST_COUNT=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM wishlists;")
echo "✅ Found $WISHLIST_COUNT wishlists in database"
echo ""

echo "🎉 Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Set DATABASE_URL in Digital Ocean App Settings"
echo "  2. Push code to GitHub"
echo "  3. Test at your-app-url.ondigitalocean.app"
