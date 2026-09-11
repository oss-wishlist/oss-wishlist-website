/**
 * TLS for the managed Postgres connection.
 *
 * The previous arrangement did two things, and the second one was the problem:
 *
 *     process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
 *     ssl: { rejectUnauthorized: false }
 *
 * The first is process-wide. It disables certificate verification for every
 * outbound TLS connection the server makes for the life of the process, not
 * just the database one: the OAuth code-for-token exchange with GitHub and
 * GitLab, the profile fetch that carries the access token, the requests to
 * ecosyste.ms, mail. Anyone positioned to intercept that traffic could present
 * any certificate they liked.
 *
 * It was set for an understandable reason. DigitalOcean's managed databases are
 * issued certificates by DigitalOcean's own CA, which is not in Node's trust
 * store, so a verified connection fails with "self signed certificate in
 * certificate chain" and turning verification off makes it work. The actual fix
 * is to give Node that CA.
 *
 * The CA certificate is not a secret. It is published in the DigitalOcean
 * control panel for anyone with the cluster, and it certifies the server to the
 * client rather than authenticating the client. So it can be committed, put in
 * an environment variable, or mounted as a file, whichever is least trouble.
 *
 * Resolution order:
 *   1. DATABASE_CA_CERT        - the PEM itself, or base64 of it
 *   2. DATABASE_CA_CERT_PATH   - a path to a .crt file
 *   3. certs/do-postgres-ca.crt - committed in the repo, if present
 *   4. nothing                 - connect unverified, and say so loudly
 *
 * Step 4 exists so that a missing certificate degrades to what happens today
 * rather than taking the site down. It is not the destination.
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
