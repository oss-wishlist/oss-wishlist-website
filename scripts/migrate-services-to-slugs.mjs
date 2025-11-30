#!/usr/bin/env node

/**
 * Data Migration Script: Convert Service Titles to Slugs
 * 
 * Problem: Practitioner services stored inconsistently - some as titles, others as slugs
 * Solution: Query all practitioners, convert service titles to slugs using service collection
 * 
 * Usage: node scripts/migrate-services-to-slugs.mjs
 */

import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env file
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found. Please create one with DATABASE_PROD_URL.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const match = envContent.match(/^DATABASE_PROD_URL\s*=\s*(.*)$/m);
if (!match) {
  console.error('❌ DATABASE_PROD_URL not found in .env file.');
  process.exit(1);
}

const DATABASE_URL = match[1].replace(/^['"]|['"]$/g, '').trim();

// SSL configuration
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Service title -> slug mapping
const SERVICE_MAP = {
  'Funding Strategy': 'funding-strategy',
  'Leadership Continuity & Succession Planning': 'leadership-continuity-succession-planning',
  'Project and Community Governance': 'governance-setup',
  'Governance Setup': 'governance-setup',
  'Leadership Onboarding': 'leadership-onboarding',
  'Moderation Strategy': 'moderation-strategy',
  'Accessibility Audit': 'accessibility-audit',
  'Security Audit': 'security-audit',
  'Diversity & Inclusion Strategy': 'diversity-inclusion-strategy',
  'Mentorship Program Setup': 'mentorship-program-setup',
  'Event Planning': 'event-planning',
  'Community Health Assessment': 'community-health-assessment',
  'Documentation Strategy': 'documentation-strategy',
  'Communication Strategy': 'communication-strategy',
  'Contributor Onboarding': 'contributor-onboarding',
  'Code of Conduct Development': 'code-of-conduct-development'
};

async function migrateServices() {
  console.log('🔧 Starting service migration...\n');

  try {
    // Get all practitioners with services
    const result = await pool.query(
      'SELECT id, name, slug, services FROM practitioners WHERE services IS NOT NULL AND array_length(services, 1) > 0'
    );

    console.log(`📊 Found ${result.rows.length} practitioners with services\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const practitioner of result.rows) {
      const services = practitioner.services;
      let needsUpdate = false;
      const newServices = [];

      console.log(`👤 ${practitioner.name}:`);
      console.log(`   Current services:`, services);

      for (const service of services) {
        // Check if it's already a slug (contains hyphens and all lowercase)
        const isSlug = service.includes('-') && service === service.toLowerCase();
        
        if (isSlug) {
          newServices.push(service);
          console.log(`   ✓ Already slug: ${service}`);
        } else {
          // It's a title, convert to slug
          const slug = SERVICE_MAP[service];
          if (slug) {
            newServices.push(slug);
            needsUpdate = true;
            console.log(`   🔄 Converting: "${service}" → "${slug}"`);
          } else {
            console.log(`   ⚠️  No mapping found for: "${service}" (keeping as-is)`);
            newServices.push(service);
          }
        }
      }

      if (needsUpdate) {
        // Update the database
        await pool.query(
          'UPDATE practitioners SET services = $1 WHERE id = $2',
          [newServices, practitioner.id]
        );
        console.log(`   ✅ Updated in database\n`);
        updatedCount++;
      } else {
        console.log(`   ⏭️  No changes needed\n`);
        skippedCount++;
      }
    }

    console.log('━'.repeat(60));
    console.log(`✅ Migration complete!`);
    console.log(`   Updated: ${updatedCount} practitioners`);
    console.log(`   Skipped: ${skippedCount} practitioners (already using slugs)`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
migrateServices().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
