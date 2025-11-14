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

// Connection pool configuration
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes('sslmode=require') || PGSSLMODE === 'require' 
    ? { rejectUnauthorized: false } 
    : false,
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

// Wishlist-specific query helpers

export interface Wishlist {
  id: number;
  slug: string;
  project_name: string;
  repository_url: string;
  project_description?: string;
  maintainer_username: string;
  maintainer_email?: string;
  maintainer_avatar_url?: string;
  issue_url: string;
  issue_state: string;
  approved: boolean;
  status: string;
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
    'SELECT * FROM wishlists WHERE approved = TRUE AND issue_state = $1 ORDER BY created_at DESC',
    ['open']
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
      issue_url, issue_state, approved, status,
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
      wishlist.status || 'pending',
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
      status = COALESCE($21, status),
      issue_state = COALESCE($22, issue_state)
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
      updates.status,
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
 * Close a wishlist (soft delete - mark as closed)
 */
export async function closeWishlist(id: number): Promise<Wishlist | null> {
  const result = await query<Wishlist>(
    `UPDATE wishlists SET issue_state = 'closed', status = 'closed' WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}
