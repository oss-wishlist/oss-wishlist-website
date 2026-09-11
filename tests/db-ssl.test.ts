/**
 * The database connection used to turn off certificate verification for the
 * whole process. These cover the replacement: verify when a CA is available,
 * and degrade visibly rather than silently when it is not.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodeCert, resolveCaCert, sslConfigFor } from '../src/lib/db-ssl';

const PEM = ['-----BEGIN CERTIFICATE-----', 'MIIBfakecertificatecontent', '-----END CERTIFICATE-----'].join('\n');

const ENV_KEYS = ['DATABASE_CA_CERT', 'DATABASE_CA_CERT_PATH', 'PGSSLMODE'];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key]!;
  }
  vi.restoreAllMocks();
});

describe('decodeCert', () => {
  it('takes a PEM as it is', () => {
    expect(decodeCert(PEM)).toBe(PEM);
  });

  it('takes base64, which is how a certificate survives a hosting panel', () => {
    expect(decodeCert(Buffer.from(PEM).toString('base64'))).toBe(PEM);
  });

  it('repairs newlines a panel turned into backslash-n', () => {
    const mangled = PEM.replace(/\n/g, '\\n');
    expect(decodeCert(mangled)).toBe(PEM);
  });

  it('refuses anything that is not a certificate', () => {
    expect(decodeCert('not a cert')).toBeNull();
    expect(decodeCert(Buffer.from('not a cert').toString('base64'))).toBeNull();
    expect(decodeCert('')).toBeNull();
    expect(decodeCert(undefined)).toBeNull();
  });
});

describe('resolveCaCert', () => {
  it('prefers the environment variable', () => {
    process.env.DATABASE_CA_CERT = PEM;
    expect(resolveCaCert()).toEqual({ cert: PEM, source: 'DATABASE_CA_CERT' });
  });

  it('reads a path when one is given', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ca-'));
    const file = join(dir, 'ca.crt');
    writeFileSync(file, PEM);
    process.env.DATABASE_CA_CERT_PATH = file;

    const { cert, source } = resolveCaCert();
    expect(cert).toBe(PEM);
    expect(source).toContain('DATABASE_CA_CERT_PATH');
  });

  it('falls back to a certificate committed in the repo', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'proj-'));
    mkdirSync(join(cwd, 'certs'));
    writeFileSync(join(cwd, 'certs', 'do-postgres-ca.crt'), PEM);

    expect(resolveCaCert(cwd).cert).toBe(PEM);
  });

  it('reports none rather than throwing when there is no certificate', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'empty-'));
    expect(resolveCaCert(cwd)).toEqual({ cert: null, source: 'none' });
  });
});

describe('sslConfigFor', () => {
  const noCerts = () => mkdtempSync(join(tmpdir(), 'nocert-'));

  it('does not use TLS when the connection does not ask for it', () => {
    expect(sslConfigFor('postgres://localhost/db', noCerts())).toBe(false);
  });

  it.each(['sslmode=require', 'sslmode=verify-full', 'ssl=true'])(
    'uses TLS for %s',
    (flag) => {
      process.env.DATABASE_CA_CERT = PEM;
      expect(sslConfigFor(`postgres://host/db?${flag}`)).toEqual({
        ca: PEM,
        rejectUnauthorized: true,
      });
    }
  );

  it('honours PGSSLMODE as well as the connection string', () => {
    process.env.PGSSLMODE = 'require';
    process.env.DATABASE_CA_CERT = PEM;
    expect(sslConfigFor('postgres://host/db')).toEqual({ ca: PEM, rejectUnauthorized: true });
  });

  // The point of the change: verification is on whenever a CA is available.
  it('verifies the certificate when a CA is available', () => {
    process.env.DATABASE_CA_CERT = PEM;
    const config = sslConfigFor('postgres://host/db?sslmode=require');
    expect(config).toHaveProperty('rejectUnauthorized', true);
  });

  it('warns loudly when it has to connect unverified', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const config = sslConfigFor('postgres://host/db?sslmode=require', noCerts());

    expect(config).toEqual({ rejectUnauthorized: false });
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toContain('WITHOUT certificate verification');
  });

  it('never returns a config that would disable TLS process-wide', () => {
    process.env.DATABASE_CA_CERT = PEM;
    sslConfigFor('postgres://host/db?sslmode=require');
    expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBeUndefined();
  });
});
