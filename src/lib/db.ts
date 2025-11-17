/**
 * PostgreSQL database connection utility
 * Handles connection pooling and query execution
 */

import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const { Pool } = pg;

// Load DATABASE_URL from .env file if not in environment
let DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL && typeof import.meta.env?.DATABASE_URL !== 'undefined') {
  DATABASE_URL = import.meta.env.DATABASE_URL;
}
// Fallback: try to load from .env file directly
if (!DATABASE_URL) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/^DATABASE_URL=(.*)$/m);
      if (match) {
        DATABASE_URL = match[1].replace(/^['"]|['"]$/g, ''); // Remove quotes
      }
    }
  } catch (error) {
    console.error('[Database] Failed to load DATABASE_URL from .env:', error);
  }
}

if (!DATABASE_URL) {
  console.error('[Database] DATABASE_URL not found in environment or .env file');
}

const PGSSLMODE = process.env.PGSSLMODE || import.meta.env?.PGSSLMODE;
const NODE_TLS_REJECT = process.env.NODE_TLS_REJECT_UNAUTHORIZED || import.meta.env?.NODE_TLS_REJECT_UNAUTHORIZED;

// SSL configuration for Digital Ocean managed PostgreSQL
// Bypasses certificate validation to avoid "self-signed certificate in chain" errors
// Always use rejectUnauthorized: false for local development or when NODE_TLS_REJECT_UNAUTHORIZED=0
const shouldUseSSL = DATABASE_URL?.includes('sslmode=require') || PGSSLMODE === 'require';
const sslConfig = shouldUseSSL
  ? {
      rejectUnauthorized: NODE_TLS_REJECT === '0' ? false : false, // Always false for staging DB
      checkServerIdentity: () => undefined,
    }
  : false;

// Connection pool configuration
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: sslConfig,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection not available
});

// Log pool errors
pool.on('error', (err) => {
  console.error('[Database] Unexpected error on idle client', err);
});

/**
 * Execute a SQL query
 * @param text SQL query string
 * @param params Query parameters (for parameterized queries)
 * @returns Query result
 */
export async function query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('[Database] Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('[Database] Query error', { text, params, error });
    throw error;
  }
}

/**
 * Get a client from the pool for transaction support
 * Remember to call client.release() when done!
 */
export async function getClient() {
  return await pool.connect();
}

/**
 * Close the database pool (for graceful shutdown)
 */
export async function closePool() {
  await pool.end();
  console.log('[Database] Connection pool closed');
}

// Type definitions

export interface Wishlist {
  id: number;
  slug: string;
  project_name: string;
  repository_url: string;
  project_description?: string;
  maintainer_username: string;
  maintainer_email?: string;
  maintainer_avatar_url?: string;
  issue_url?: string;
  issue_state: string;
  approved: boolean;
  wishes: string[];
  technologies: string[];
  resources: string[];
  urgency?: string;
  project_size?: string;
  additional_notes?: string;
  organization_type?: string;
  organization_name?: string;
  other_organization_type?: string;
  open_to_sponsorship: boolean;
  preferred_practitioner?: string;
  nominee_name?: string;
  nominee_email?: string;
  nominee_github?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Practitioner {
  id: number;
  slug: string;
  name: string;
  title: string;
  company?: string;
  bio: string;
  avatar_url?: string;
  location?: string;
  languages: string[];
  email?: string;
  website?: string;
  github?: string;
  github_sponsors?: string;
  mastodon?: string;
  linkedin?: string;
  services: string[];
  availability: 'available' | 'limited' | 'unavailable';
  accepts_pro_bono: boolean;
  pro_bono_criteria?: string;
  pro_bono_hours_per_month?: number;
  years_experience?: number;
  notable_experience?: string[];
  certifications?: string[];
  approved: boolean;
  verified: boolean;
  submitter_username: string;
  created_at: Date;
  updated_at: Date;
}

// Wishlist-specific query helpers

/**
 * Get wishlist by GitHub issue number
 */
export async function getWishlistById(id: number): Promise<Wishlist | null> {
  const result = await query<Wishlist>('SELECT * FROM wishlists WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Get wishlist by slug
 */
export async function getWishlistBySlug(slug: string): Promise<Wishlist | null> {
  const result = await query<Wishlist>('SELECT * FROM wishlists WHERE slug = $1', [slug]);
  return result.rows[0] || null;
}

/**
 * Get all approved wishlists
 */
export async function getApprovedWishlists(): Promise<Wishlist[]> {
  const result = await query<Wishlist>(
    'SELECT * FROM wishlists WHERE approved = TRUE ORDER BY created_at DESC'
  );
  return result.rows;
}

/**
 * Get all wishlists (for admin)
 */
export async function getAllWishlists(): Promise<Wishlist[]> {
  const result = await query<Wishlist>(
    'SELECT * FROM wishlists ORDER BY created_at DESC'
  );
  return result.rows;
}

/**
 * Get wishlists by maintainer
 */
export async function getWishlistsByMaintainer(username: string): Promise<Wishlist[]> {
  const result = await query<Wishlist>(
    'SELECT * FROM wishlists WHERE maintainer_username = $1 ORDER BY created_at DESC',
    [username]
  );
  return result.rows;
}

/**
 * Create a new wishlist
 */
export async function createWishlist(wishlist: Partial<Wishlist>): Promise<Wishlist> {
  const result = await query<Wishlist>(
    `INSERT INTO wishlists (
      id, slug, project_name, repository_url, project_description,
      maintainer_username, maintainer_email, maintainer_avatar_url,
      issue_url, issue_state, approved,
      wishes, technologies, resources,
      urgency, project_size, additional_notes,
      organization_type, organization_name, other_organization_type,
      open_to_sponsorship, preferred_practitioner,
      nominee_name, nominee_email, nominee_github
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
    ) RETURNING *`,
    [
      wishlist.id,
      wishlist.slug,
      wishlist.project_name,
      wishlist.repository_url,
      wishlist.project_description,
      wishlist.maintainer_username,
      wishlist.maintainer_email,
      wishlist.maintainer_avatar_url,
      wishlist.issue_url,
      wishlist.issue_state || 'open',
      wishlist.approved || false,
      wishlist.wishes || [],
      wishlist.technologies || [],
      wishlist.resources || [],
      wishlist.urgency,
      wishlist.project_size,
      wishlist.additional_notes,
      wishlist.organization_type,
      wishlist.organization_name,
      wishlist.other_organization_type,
      wishlist.open_to_sponsorship || false,
      wishlist.preferred_practitioner,
      wishlist.nominee_name,
      wishlist.nominee_email,
      wishlist.nominee_github,
    ]
  );
  return result.rows[0];
}

/**
 * Update an existing wishlist
 */
export async function updateWishlist(id: number, updates: Partial<Wishlist>): Promise<Wishlist | null> {
  const result = await query<Wishlist>(
    `UPDATE wishlists SET
      project_name = COALESCE($2, project_name),
      repository_url = COALESCE($3, repository_url),
      project_description = COALESCE($4, project_description),
      maintainer_username = COALESCE($5, maintainer_username),
      maintainer_email = COALESCE($6, maintainer_email),
      wishes = COALESCE($7, wishes),
      technologies = COALESCE($8, technologies),
      urgency = COALESCE($9, urgency),
      project_size = COALESCE($10, project_size),
      additional_notes = COALESCE($11, additional_notes),
      organization_type = COALESCE($12, organization_type),
      organization_name = COALESCE($13, organization_name),
      other_organization_type = COALESCE($14, other_organization_type),
      open_to_sponsorship = COALESCE($15, open_to_sponsorship),
      preferred_practitioner = COALESCE($16, preferred_practitioner),
      nominee_name = COALESCE($17, nominee_name),
      nominee_email = COALESCE($18, nominee_email),
      nominee_github = COALESCE($19, nominee_github),
      approved = COALESCE($20, approved),
      issue_state = COALESCE($21, issue_state)
    WHERE id = $1
    RETURNING *`,
    [
      id,
      updates.project_name,
      updates.repository_url,
      updates.project_description,
      updates.maintainer_username,
      updates.maintainer_email,
      updates.wishes,
      updates.technologies,
      updates.urgency,
      updates.project_size,
      updates.additional_notes,
      updates.organization_type,
      updates.organization_name,
      updates.other_organization_type,
      updates.open_to_sponsorship,
      updates.preferred_practitioner,
      updates.nominee_name,
      updates.nominee_email,
      updates.nominee_github,
      updates.approved,
      updates.issue_state,
    ]
  );
  return result.rows[0] || null;
}

/**
 * Delete a wishlist (hard delete)
 */
export async function deleteWishlist(id: number): Promise<boolean> {
  const result = await query('DELETE FROM wishlists WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

/**
 * Close a wishlist (mark as closed)
 * Note: We only use the approved boolean now
 */
export async function closeWishlist(id: number): Promise<Wishlist | null> {
  const result = await query<Wishlist>(
    `UPDATE wishlists SET issue_state = 'closed' WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Approve a wishlist
 */
export async function approveWishlist(id: number): Promise<Wishlist | null> {
  const result = await query<Wishlist>(
    `UPDATE wishlists SET approved = true WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Reject a wishlist
 */
export async function rejectWishlist(id: number): Promise<Wishlist | null> {
  const result = await query<Wishlist>(
    `UPDATE wishlists SET approved = false WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Move a wishlist back to pending
 */
export async function moveToPending(id: number): Promise<Wishlist | null> {
  const result = await query<Wishlist>(
    `UPDATE wishlists SET approved = false WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

// Practitioner-specific query helpers

/**
 * Get practitioner by ID
 */
export async function getPractitionerById(id: number): Promise<Practitioner | null> {
  const result = await query<Practitioner>('SELECT * FROM practitioners WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Get practitioner by slug
 */
export async function getPractitionerBySlug(slug: string): Promise<Practitioner | null> {
  const result = await query<Practitioner>('SELECT * FROM practitioners WHERE slug = $1', [slug]);
  return result.rows[0] || null;
}

/**
 * Get all approved practitioners
 */
export async function getApprovedPractitioners(): Promise<Practitioner[]> {
  const result = await query<Practitioner>(
    `SELECT * FROM practitioners WHERE approved = true ORDER BY created_at DESC`
  );
  return result.rows;
}

/**
 * Get all practitioners (for admin)
 */
export async function getAllPractitioners(): Promise<Practitioner[]> {
  const result = await query<Practitioner>(
    `SELECT * FROM practitioners ORDER BY created_at DESC`
  );
  return result.rows;
}

/**
 * Get practitioners by submitter username
 */
export async function getPractitionersBySubmitter(username: string): Promise<Practitioner[]> {
  const result = await query<Practitioner>(
    `SELECT * FROM practitioners WHERE submitter_username = $1 ORDER BY created_at DESC`,
    [username]
  );
  return result.rows;
}

/**
 * Create a new practitioner
 */
export async function createPractitioner(practitioner: Partial<Practitioner>): Promise<Practitioner> {
  const result = await query<Practitioner>(
    `INSERT INTO practitioners (
      slug, name, title, company, bio, avatar_url, location, languages,
      email, website, github, github_sponsors, mastodon, linkedin,
      services, availability, accepts_pro_bono, pro_bono_criteria, pro_bono_hours_per_month,
      years_experience, notable_experience, certifications,
      approved, verified, submitter_username
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
    RETURNING *`,
    [
      practitioner.slug,
      practitioner.name,
      practitioner.title,
      practitioner.company || null,
      practitioner.bio,
      practitioner.avatar_url || null,
      practitioner.location || null,
      practitioner.languages || [],
      practitioner.email || null,
      practitioner.website || null,
      practitioner.github || null,
      practitioner.github_sponsors || null,
      practitioner.mastodon || null,
      practitioner.linkedin || null,
      practitioner.services || [],
      practitioner.availability || 'available',
      practitioner.accepts_pro_bono || false,
      practitioner.pro_bono_criteria || null,
      practitioner.pro_bono_hours_per_month || null,
      practitioner.years_experience || null,
      practitioner.notable_experience || [],
      practitioner.certifications || [],
      practitioner.approved || false,
      practitioner.verified || false,
      practitioner.submitter_username
    ]
  );
  return result.rows[0];
}

/**
 * Update an existing practitioner
 */
export async function updatePractitioner(id: number, updates: Partial<Practitioner>): Promise<Practitioner | null> {
  const result = await query<Practitioner>(
    `UPDATE practitioners SET
      name = COALESCE($1, name),
      title = COALESCE($2, title),
      company = COALESCE($3, company),
      bio = COALESCE($4, bio),
      avatar_url = COALESCE($5, avatar_url),
      location = COALESCE($6, location),
      languages = COALESCE($7, languages),
      email = COALESCE($8, email),
      website = COALESCE($9, website),
      github = COALESCE($10, github),
      github_sponsors = COALESCE($11, github_sponsors),
      mastodon = COALESCE($12, mastodon),
      linkedin = COALESCE($13, linkedin),
      services = COALESCE($14, services),
      availability = COALESCE($15, availability),
      accepts_pro_bono = COALESCE($16, accepts_pro_bono),
      pro_bono_criteria = COALESCE($17, pro_bono_criteria),
      pro_bono_hours_per_month = COALESCE($18, pro_bono_hours_per_month),
      years_experience = COALESCE($19, years_experience),
      notable_experience = COALESCE($20, notable_experience),
      certifications = COALESCE($21, certifications),
      updated_at = NOW()
    WHERE id = $22
    RETURNING *`,
    [
      updates.name,
      updates.title,
      updates.company,
      updates.bio,
      updates.avatar_url,
      updates.location,
      updates.languages,
      updates.email,
      updates.website,
      updates.github,
      updates.github_sponsors,
      updates.mastodon,
      updates.linkedin,
      updates.services,
      updates.availability,
      updates.accepts_pro_bono,
      updates.pro_bono_criteria,
      updates.pro_bono_hours_per_month,
      updates.years_experience,
      updates.notable_experience,
      updates.certifications,
      id
    ]
  );
  return result.rows[0] || null;
}

/**
 * Delete a practitioner (hard delete)
 */
export async function deletePractitioner(id: number): Promise<boolean> {
  const result = await query('DELETE FROM practitioners WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Approve a practitioner
 */
export async function approvePractitioner(id: number): Promise<Practitioner | null> {
  const result = await query<Practitioner>(
    `UPDATE practitioners SET approved = true WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Reject a practitioner
 */
export async function rejectPractitioner(id: number): Promise<Practitioner | null> {
  const result = await query<Practitioner>(
    `UPDATE practitioners SET approved = false WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}
