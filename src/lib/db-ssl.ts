/**
 * TLS for the managed Postgres connection.
 *
 * DigitalOcean's managed databases use DigitalOcean's own CA, which Node does
 * not trust, so a verified connection fails with "self signed certificate in
 * certificate chain". This module supplies that CA.
 *
 * The certificate is public. It certifies the server to us, so committing it is
 * fine, as is an environment variable or a mounted file.
 *
 * Resolution order:
 *   1. DATABASE_CA_CERT          PEM, or base64 of it
 *   2. DATABASE_CA_CERT_PATH     path to a .crt
 *   3. certs/do-postgres-ca.crt  committed in the repo
 *   4. none                      connect unverified, and warn at every start
 *
 * Step 4 keeps a missing certificate from taking the site down. Either way the
 * scope stays on this connection. The code here before set
 * NODE_TLS_REJECT_UNAUTHORIZED=0, which reached every outbound TLS connection
 * the process made, including the OAuth token exchange.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/** Where a committed certificate is looked for, relative to the project root. */
const REPO_CERT_PATH = path.join('certs', 'do-postgres-ca.crt');

const PEM_HEADER = '-----BEGIN CERTIFICATE-----';

function readEnv(name: string): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  const fromImport =
    typeof import.meta !== 'undefined' ? (import.meta as any).env?.[name] : undefined;
  const value = fromProcess || fromImport;
  return value ? String(value).trim() : undefined;
}

/**
 * Accept the certificate however it survived the journey through a hosting
 * panel: as PEM, or base64-encoded to get around multi-line values.
 */
export function decodeCert(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  if (value.includes(PEM_HEADER)) {
    // Some panels turn real newlines into the two characters \ and n.
    return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value;
  }

  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    return decoded.includes(PEM_HEADER) ? decoded : null;
  } catch {
    return null;
  }
}

function readCertFile(file: string): string | null {
  try {
    if (!fs.existsSync(file)) return null;
    const contents = fs.readFileSync(file, 'utf8');
    return contents.includes(PEM_HEADER) ? contents : null;
  } catch {
    return null;
  }
}

/** The CA certificate, from whichever source supplied one. */
export function resolveCaCert(cwd: string = process.cwd()): {
  cert: string | null;
  source: string;
} {
  const inline = decodeCert(readEnv('DATABASE_CA_CERT'));
  if (inline) return { cert: inline, source: 'DATABASE_CA_CERT' };

  const fromPath = readEnv('DATABASE_CA_CERT_PATH');
  if (fromPath) {
    const cert = readCertFile(fromPath);
    if (cert) return { cert, source: `DATABASE_CA_CERT_PATH (${fromPath})` };
    console.warn(`[Database] DATABASE_CA_CERT_PATH is set to ${fromPath}, but no certificate was readable there.`);
  }

  const repoCert = readCertFile(path.join(cwd, REPO_CERT_PATH));
  if (repoCert) return { cert: repoCert, source: REPO_CERT_PATH };

  return { cert: null, source: 'none' };
}

export type SslConfig = false | { ca: string; rejectUnauthorized: true } | { rejectUnauthorized: false };

/**
 * What to hand `pg` as its `ssl` option.
 *
 * Verification is on whenever a certificate is available. When one is not, this
 * returns the unverified config and warns, scoped to this connection only —
 * which is the part that matters, because the old approach reached every other
 * TLS connection in the process.
 */
export function sslConfigFor(connectionString: string | undefined, cwd?: string): SslConfig {
  const wantsSsl =
    Boolean(connectionString?.includes('sslmode=require')) ||
    Boolean(connectionString?.includes('sslmode=verify-full')) ||
    Boolean(connectionString?.includes('ssl=true')) ||
    readEnv('PGSSLMODE') === 'require' ||
    readEnv('PGSSLMODE') === 'verify-full';

  if (!wantsSsl) return false;

  const { cert, source } = resolveCaCert(cwd);
  if (cert) {
    console.log(`[Database] TLS with certificate verification, CA from ${source}.`);
    return { ca: cert, rejectUnauthorized: true };
  }

  console.warn(
    '[Database] Connecting WITHOUT certificate verification: no CA certificate found. ' +
      'The connection is encrypted but the server is not authenticated. ' +
      'Download the CA certificate from the database cluster and set DATABASE_CA_CERT, ' +
      'or commit it to certs/do-postgres-ca.crt.'
  );
  return { rejectUnauthorized: false };
}
