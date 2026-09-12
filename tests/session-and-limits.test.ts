// @vitest-environment node
// createSession and verifySession refuse to run where `window` exists, which is
// the default test environment here. They are server-only by design.
/**
 * Two findings from the security review: sessions that never expired, and
 * rate limits keyed on a header the caller controls.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSession, verifySession, SESSION_TTL_SECONDS } from '../src/lib/github-oauth';
import { getClientIdentifier, getRateLimitKey } from '../src/lib/rate-limit';

const SECRET = 'test-secret-not-used-anywhere';
const user = { user: { login: 'someone', id: 1 }, authenticated: true, accessToken: 'gho_x' };

afterEach(() => vi.useRealTimers());

describe('session expiry', () => {
  it('round-trips a fresh session', () => {
    const token = createSession(user as never, SECRET);
    expect(verifySession(token, SECRET)?.user.login).toBe('someone');
  });

  it('stamps the token with its own lifetime', () => {
    const decoded = verifySession(createSession(user as never, SECRET), SECRET)!;
    expect(decoded.exp - decoded.iat).toBe(SESSION_TTL_SECONDS);
  });

  // The finding: the cookie's maxAge was a browser hint, so a copied token
  // stayed valid forever and signing out did not invalidate it.
  it('refuses a token once its lifetime has passed', () => {
    const token = createSession(user as never, SECRET);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + (SESSION_TTL_SECONDS + 60) * 1000);
    expect(verifySession(token, SECRET)).toBeNull();
  });

  it('still accepts it just before that', () => {
    const token = createSession(user as never, SECRET);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + (SESSION_TTL_SECONDS - 60) * 1000);
    expect(verifySession(token, SECRET)).not.toBeNull();
  });

  it('refuses a session issued before expiry existed', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const legacy = Buffer.from(
      `${JSON.stringify(user)}::${require('node:crypto')
        .createHmac('sha256', SECRET)
        .update(JSON.stringify(user))
        .digest('hex')}`
    ).toString('base64');
    expect(verifySession(legacy, SECRET)).toBeNull();
  });

  it('still refuses a token signed with another secret', () => {
    expect(verifySession(createSession(user as never, SECRET), 'other-secret')).toBeNull();
  });

  it('refuses a tampered expiry, because it is inside the signature', () => {
    const token = createSession(user as never, SECRET);
    const [payload, signature] = Buffer.from(token, 'base64').toString('utf8').split('::');
    const forged = JSON.parse(payload);
    forged.exp = forged.exp + 60 * 60 * 24 * 365;
    const tampered = Buffer.from(`${JSON.stringify(forged)}::${signature}`).toString('base64');

    expect(verifySession(tampered, SECRET)).toBeNull();
  });
});

describe('rate limit identity', () => {
  const req = (headers: Record<string, string>) => new Request('https://example.com', { headers });

  // The finding: the leftmost X-Forwarded-For entry is whatever the caller
  // sent, so a new value per request meant a new bucket per request.
  it('ignores a client-supplied X-Forwarded-For when a trusted header exists', () => {
    const request = req({
      'x-forwarded-for': '1.2.3.4, 203.0.113.9',
      'cf-connecting-ip': '198.51.100.7',
    });
    expect(getClientIdentifier(request)).toBe('198.51.100.7');
  });

  it('takes the rightmost hop when only X-Forwarded-For is present', () => {
    expect(getClientIdentifier(req({ 'x-forwarded-for': 'spoofed, 203.0.113.9' }))).toBe('203.0.113.9');
  });

  it('prefers Cloudflare, then the platform proxy, then the last hop', () => {
    expect(getClientIdentifier(req({ 'cf-connecting-ip': 'a', 'x-real-ip': 'b', 'x-forwarded-for': 'c' }))).toBe('a');
    expect(getClientIdentifier(req({ 'x-real-ip': 'b', 'x-forwarded-for': 'c' }))).toBe('b');
    expect(getClientIdentifier(req({ 'x-forwarded-for': 'c' }))).toBe('c');
  });

  it('puts requests with no identifiable source in one bucket, not a new one each', () => {
    expect(getClientIdentifier(req({}))).toBe('unknown');
    expect(getClientIdentifier(req({}))).toBe('unknown');
  });

  it('counts a signed-in caller against their account', () => {
    const key = getRateLimitKey(req({ 'cf-connecting-ip': '198.51.100.7' }), {
      provider: 'github',
      user: { login: 'Someone' },
    });
    expect(key).toBe('user:github:someone');
  });

  it('separates the same name on different providers', () => {
    const a = getRateLimitKey(req({}), { provider: 'github', user: { login: 'x' } });
    const b = getRateLimitKey(req({}), { provider: 'gitlab', user: { username: 'x' } });
    expect(a).not.toBe(b);
  });

  it('falls back to the address when there is no session', () => {
    expect(getRateLimitKey(req({ 'cf-connecting-ip': '198.51.100.7' }), null)).toBe('ip:198.51.100.7');
  });

  it('cannot be made to collide with an account key from the address alone', () => {
    const spoof = getRateLimitKey(req({ 'cf-connecting-ip': 'user:github:someone' }), null);
    expect(spoof).toBe('ip:user:github:someone');
    expect(spoof).not.toBe('user:github:someone');
  });
});
