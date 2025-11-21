#!/usr/bin/env node
/**
 * Generate minimal JSON feed for external consumers
 * 
 * This script creates a static JSON file at public/wishlist-cache/all-wishlists.json
 * with minimal wishlist data (id, repositoryUrl, wishlistUrl only) for external
 * integrations like ecosyste.ms.
 * 
 * The internal wishlists page uses /api/wishlists which returns full data.
 * 
 * Run with: node scripts/generate-minimal-json.mjs
 */

// (Certificate validation is now enforced for TLS connections)

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load DATABASE_URL from environment or .env file
let DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/^DATABASE_URL=(.*)$/m);
      if (match) {
        DATABASE_URL = match[1].replace(/^['"]|['"]$/g, '');
      }
    }
  } catch (error) {
    console.error('Failed to load DATABASE_URL from .env:', error.message);
  }
}

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment or .env file');
  process.exit(1);
}

// SSL configuration for Digital Ocean managed PostgreSQL
// Always use SSL with rejectUnauthorized: false to avoid certificate issues
const sslConfig = {
  rejectUnauthorized: true, // Enforce certificate validation
  // If needed, add `ca: fs.readFileSync('path/to/ca-cert.pem').toString()` here
};

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: sslConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Extract repository name from GitHub URL
 * e.g., "https://github.com/emma/awesomelibrary" -> "awesomelibrary"
 */
function extractRepoName(repoUrl) {
  try {
    const url = new URL(repoUrl);
    const parts = url.pathname.split('/').filter(p => p);
    return parts[parts.length - 1] || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function generateMinimalJSON() {
  const startTime = Date.now();
  
  try {
    console.log('📊 Fetching approved wishlists from database...');
    
    // Query approved wishlists
    const result = await pool.query(
      'SELECT id, repository_url FROM wishlists WHERE approved = TRUE ORDER BY created_at DESC'
    );
    
    const wishlists = result.rows;
    console.log(`   Found ${wishlists.length} approved wishlists`);
    
    // Get base URL from environment (for production) or use default
    const baseUrl = process.env.PUBLIC_URL || 'https://oss-wishlist.org';
    const basePath = process.env.BASE_PATH || '';
    
    // Map to minimal format
    const minimalWishlists = wishlists.map((wishlist) => {
      const repoName = extractRepoName(wishlist.repository_url);
      const id = `${wishlist.id}-${repoName}`;
      const wishlistUrl = `${baseUrl}${basePath}/fulfill?issue=${wishlist.id}`;
      
      return {
        id,
        repositoryUrl: wishlist.repository_url,
        wishlistUrl
      };
    });
    
    // Build response object
    const jsonData = {
      wishlists: minimalWishlists,
      metadata: {
        total: minimalWishlists.length,
        generated: new Date().toISOString(),
        format: 'minimal',
        description: 'Minimal wishlist data for external integrations. For full data, maintainers should use the OSS Wishlist website.'
      }
    };
    
    // Ensure output directory exists
    const outputDir = path.join(__dirname, '..', 'public', 'wishlist-cache');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`   Created directory: ${outputDir}`);
    }
    
    // Write JSON file
    const outputPath = path.join(outputDir, 'all-wishlists.json');
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
    
    const duration = Date.now() - startTime;
    console.log(`✅ Generated ${outputPath}`);
    console.log(`   ${minimalWishlists.length} wishlists written`);
    console.log(`   Completed in ${duration}ms`);
    
  } catch (error) {
    console.error('❌ Error generating minimal JSON:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
generateMinimalJSON();
