/**
 * The cases behind the security fixes: an attacker-supplied redirect target,
 * and who counts as an administrator.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { normalizeReturnPath, isSafeReturnPath } from '../src/lib/return-path';
import { isAdminSession, adminIdentities } from '../src/lib/admin';

const BS = String.fromCharCode(92);
const TAB = String.fromCharCode(9);

describe('normalizeReturnPath', () => {
  it('keeps an ordinary path', () => {
    expect(normalizeReturnPath('/practitioners')).toBe('/practitioners');
    expect(normalizeReturnPath('/invest?pe=npm&pn=lodash')).toBe('/invest?pe=npm&pn=lodash');
  });

  // Each of these was verified to produce an off-site Location before the fix.
  it.each([
    ['//evil.example.com'],
    ['///evil.example.com'],
    ['/' + BS + 'evil.example.com'],
    [BS + BS + 'evil.example.com'],
    ['/' + BS + '/evil.example.com'],
  ])('refuses %s', (payload) => {
    expect(normalizeReturnPath(payload)).toBe('/');
  });

  it('reduces an absolute URL to its path', () => {
    expect(normalizeReturnPath('https://evil.example.com/steal')).toBe('/steal');
  });

  it('refuses a non-http scheme', () => {
    expect(normalizeReturnPath('javascript:alert(1)')).toBe('/');
    expect(normalizeReturnPath('data:text/html,<script>alert(1)</script>')).toBe('/');
  });

  it('refuses control characters that a parser might strip', () => {
    expect(normalizeReturnPath('/' + TAB + '/evil.example.com')).toBe('/');
  });

  it('sends an empty or missing value home', () => {
    expect(normalizeReturnPath('')).toBe('/');
    expect(normalizeReturnPath('   ')).toBe('/');
  });

  it('does not bounce someone back to the login page', () => {
    expect(normalizeReturnPath('/login')).toBe('/');
  });

  it('strips a duplicated base path', () => {
    expect(normalizeReturnPath('/site/practitioners', '/site/')).toBe('/practitioners');
  });

  it('isSafeReturnPath agrees on the boundary cases', () => {
    expect(isSafeReturnPath('/ok')).toBe(true);
    expect(isSafeReturnPath('//evil')).toBe(false);
    expect(isSafeReturnPath('/' + BS + 'evil')).toBe(false);
    expect(isSafeReturnPath('no-slash')).toBe(false);
  });
});

describe('isAdminSession', () => {
  const original = process.env.ADMIN_USERNAMES;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_USERNAMES;
    else process.env.ADMIN_USERNAMES = original;
    vi.restoreAllMocks();
  });

  it('grants nobody when the variable is unset', () => {
    delete process.env.ADMIN_USERNAMES;
    expect(isAdminSession({ provider: 'github', user: { login: 'emmairwin' } })).toBe(false);
    expect(isAdminSession({ provider: 'github', user: { login: 'anyone' } })).toBe(false);
  });

  it('grants nobody when the variable is empty', () => {
    process.env.ADMIN_USERNAMES = '   ';
    expect(isAdminSession({ provider: 'github', user: { login: 'emmairwin' } })).toBe(false);
  });

  it('treats a bare name as GitHub, so an existing setting keeps working', () => {
    process.env.ADMIN_USERNAMES = 'emmairwin';
    expect(isAdminSession({ provider: 'github', user: { login: 'emmairwin' } })).toBe(true);
  });

  // The finding: a GitLab account with the same name used to be admin.
  it('does not grant the same name on another provider', () => {
    process.env.ADMIN_USERNAMES = 'emmairwin';
    expect(isAdminSession({ provider: 'gitlab', user: { username: 'emmairwin' } })).toBe(false);
  });

  it('grants a provider that is named explicitly', () => {
    process.env.ADMIN_USERNAMES = 'gitlab:someone';
    expect(isAdminSession({ provider: 'gitlab', user: { username: 'someone' } })).toBe(true);
    expect(isAdminSession({ provider: 'github', user: { login: 'someone' } })).toBe(false);
  });

  it('reads a list, and ignores spacing and case', () => {
    process.env.ADMIN_USERNAMES = ' github:One , gitlab:Two ';
    expect(adminIdentities()).toEqual(new Set(['github:one', 'gitlab:two']));
    expect(isAdminSession({ provider: 'github', user: { login: 'ONE' } })).toBe(true);
  });

  it('treats a session with no provider as GitHub, for sessions issued earlier', () => {
    process.env.ADMIN_USERNAMES = 'github:emmairwin';
    expect(isAdminSession({ user: { login: 'emmairwin' } })).toBe(true);
  });

  it('refuses an unknown provider, a missing name and a missing session', () => {
    process.env.ADMIN_USERNAMES = 'github:emmairwin';
    expect(isAdminSession({ provider: 'evil', user: { username: 'emmairwin' } })).toBe(false);
    expect(isAdminSession({ provider: 'github', user: {} })).toBe(false);
    expect(isAdminSession(null)).toBe(false);
    expect(isAdminSession(undefined)).toBe(false);
  });
});
