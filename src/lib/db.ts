/**
 * PostgreSQL database connection utility
 * Handles connection pooling and query execution
 */

import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { sslConfigFor } from './db-ssl';

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

const PGSSLMODE = process.env.PGSSLMODE || import.meta.env?.PGSSLMODE;

/**
 * The pool is created on first use, not at import.
 *
 * This module is imported transitively by Header.astro, so throwing at module
 * scope when DATABASE_URL is absent took down every page on the site —
 * including the ones that never touch the database. Now a missing or broken
 * database only fails the queries that actually need it, and callers that can
 * degrade (see practitioner-availability.ts) render without it.
 */
let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (pool) return pool;

  if (!DATABASE_URL) {
    throw new Error(
      '[Database] DATABASE_URL not found in environment or .env file. Database connection required.'
    );
  }

  /*
    TLS for this connection only. The line that used to be here set
    NODE_TLS_REJECT_UNAUTHORIZED = '0', which is process-wide: it disabled
    certificate verification for the OAuth token exchange, the profile fetch
    carrying the access token, ecosyste.ms and mail, not just Postgres.
    See src/lib/db-ssl.ts for how the CA certificate is found.
  */
  const ssl = sslConfigFor(DATABASE_URL);

  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl,
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection not available
  });

  pool.on('error', (err) => {
    console.error('[Database] Unexpected error on idle client', err);
  });

  return pool;
}

/** True when a connection string is configured. Lets callers skip the attempt. */
export function isDatabaseConfigured(): boolean {
  return Boolean(DATABASE_URL);
}

/**
 * Execute a SQL query
 * @param text SQL query string
 * @param params Query parameters (for parameterized queries)
 * @returns Query result
 */
export async function query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await getPool().query<T>(text, params);
    const duration = Date.now() - start;
    // Query logging disabled - uncomment if needed for debugging
    // console.log('[Database] Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
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
  return await getPool().connect();
}

/**
 * Close the database pool (for graceful shutdown)
 */
export async function closePool() {
  if (!pool) return;
  await pool.end();
  pool = null;
  console.log('[Database] Connection pool closed');
}

// Type definitions

export interface Service {
  id: number;
  slug: string;
  title: string;
  description?: string;
  type: 'service' | 'resource';
  service_type?: 'one-time' | 'ongoing' | 'workshop' | 'consulting' | 'audit' | 'training' | 'support' | 'credit' | 'budget' | 'hosting' | 'tool';
  target_audience?: 'maintainer' | 'company' | 'both';
  available: boolean;
  unavailable_reason?: string;
  impact?: string;
  playbook?: string;
  pricing_small?: number;
  pricing_medium?: number;
  pricing_large?: number;
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
  gitlab?: string;
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
 * Get practitioner by GitHub/GitLab username (optimized for auth check)
 */
export async function getPractitionerByUsername(username: string): Promise<Practitioner | null> {
  const result = await query<Practitioner>(
    `SELECT id, slug, name, github, gitlab 
     FROM practitioners 
     WHERE (LOWER(github) = LOWER($1) OR LOWER(gitlab) = LOWER($1)) 
     AND approved = true 
     LIMIT 1`,
    [username]
  );
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
      email, website, github, gitlab, github_sponsors, mastodon, linkedin,
      services, availability, accepts_pro_bono, pro_bono_criteria, pro_bono_hours_per_month,
      years_experience, notable_experience, certifications,
      approved, verified, submitter_username
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
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
      practitioner.gitlab || null,
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
 * Note: This does NOT update the 'approved' field - approved status is preserved
 * when practitioners edit their profile. Only admin actions can change approval status.
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
      gitlab = COALESCE($11, gitlab),
      github_sponsors = COALESCE($12, github_sponsors),
      mastodon = COALESCE($13, mastodon),
      linkedin = COALESCE($14, linkedin),
      services = COALESCE($15, services),
      availability = COALESCE($16, availability),
      accepts_pro_bono = COALESCE($17, accepts_pro_bono),
      pro_bono_criteria = COALESCE($18, pro_bono_criteria),
      pro_bono_hours_per_month = COALESCE($19, pro_bono_hours_per_month),
      years_experience = COALESCE($20, years_experience),
      notable_experience = COALESCE($21, notable_experience),
      certifications = COALESCE($22, certifications),
      updated_at = NOW()
    WHERE id = $23
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
      updates.gitlab,
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

// Service-specific query helpers

/**
 * Get all services
 */
export async function getAllServices(): Promise<Service[]> {
  const result = await query<Service>('SELECT * FROM services ORDER BY title ASC');
  return result.rows;
}

/**
 * Get service by slug
 */
export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const result = await query<Service>('SELECT * FROM services WHERE slug = $1', [slug]);
  return result.rows[0] || null;
}

/**
 * Get available services only
 */
export async function getAvailableServices(): Promise<Service[]> {
  const result = await query<Service>(
    'SELECT * FROM services WHERE available = TRUE ORDER BY title ASC'
  );
  return result.rows;
}

/**
 * Create a new service
 */
export async function createService(service: Partial<Service>): Promise<Service> {
  const result = await query<Service>(
    `INSERT INTO services (
      slug, title, description, type, service_type, target_audience,
      available, unavailable_reason, impact, playbook,
      pricing_small, pricing_medium, pricing_large
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      service.slug,
      service.title,
      service.description,
      service.type || 'service',
      service.service_type,
      service.target_audience,
      service.available ?? true,
      service.unavailable_reason,
      service.impact,
      service.playbook,
      service.pricing_small,
      service.pricing_medium,
      service.pricing_large
    ]
  );
  return result.rows[0];
}

/**
 * Update a service
 */
export async function updateService(id: number, updates: Partial<Service>): Promise<Service | null> {
  const result = await query<Service>(
    `UPDATE services SET
      title = COALESCE($2, title),
      description = COALESCE($3, description),
      type = COALESCE($4, type),
      service_type = COALESCE($5, service_type),
      target_audience = COALESCE($6, target_audience),
      available = COALESCE($7, available),
      unavailable_reason = COALESCE($8, unavailable_reason),
      impact = COALESCE($9, impact),
      playbook = COALESCE($10, playbook),
      pricing_small = COALESCE($11, pricing_small),
      pricing_medium = COALESCE($12, pricing_medium),
      pricing_large = COALESCE($13, pricing_large),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *`,
    [
      id,
      updates.title,
      updates.description,
      updates.type,
      updates.service_type,
      updates.target_audience,
      updates.available,
      updates.unavailable_reason,
      updates.impact,
      updates.playbook,
      updates.pricing_small,
      updates.pricing_medium,
      updates.pricing_large
    ]
  );
  return result.rows[0] || null;
}

/**
 * Delete a service
 */
export async function deleteService(id: number): Promise<boolean> {
  const result = await query('DELETE FROM services WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
