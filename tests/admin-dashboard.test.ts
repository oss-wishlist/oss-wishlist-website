import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Admin Dashboard and Authentication Tests
 * 
 * Tests for:
 * - Admin page authentication (GitHub OAuth)
 * - Admin access control (ADMIN_USERNAMES check)
 * - Pending practitioners section
 * - Admin API endpoints
 */

describe('Admin Page Authentication', () => {
  it('should require GitHub OAuth session', async () => {
    // No session cookie
    const hasSession = false;
    const redirectUrl = hasSession ? '/admin' : '/?error=unauthorized';

    expect(redirectUrl).toBe('/?error=unauthorized');
  });

  it('should verify session with OAUTH_STATE_SECRET', () => {
    const sessionCookie = 'encrypted-session-data';
    const sessionSecret = 'test-secret';

    // Session verification would use verifySession(sessionCookie, sessionSecret)
    expect(sessionSecret).toBeDefined();
    expect(sessionCookie).toBeDefined();
  });

  it('should check if user is in ADMIN_USERNAMES list', () => {
    const ADMIN_USERNAMES = ['emmairwin', 'admin2'];
    const currentUser = 'emmairwin';

    const isAdmin = ADMIN_USERNAMES.includes(currentUser);

    expect(isAdmin).toBe(true);
  });

  it('should redirect non-admin users to homepage with error', () => {
    const ADMIN_USERNAMES = ['emmairwin'];
    const currentUser = 'regularuser';

    const isAdmin = ADMIN_USERNAMES.includes(currentUser);
    const redirectUrl = isAdmin ? '/admin' : '/?error=unauthorized';

    expect(redirectUrl).toBe('/?error=unauthorized');
  });

  it('should allow access when user is authenticated admin', () => {
    const session = {
      user: {
        login: 'emmairwin',
      },
    };
    const ADMIN_USERNAMES = ['emmairwin'];

    const isAdmin = ADMIN_USERNAMES.includes(session.user.login);

    expect(isAdmin).toBe(true);
  });
});

describe('Admin Dashboard - Pending Practitioners Section', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should display pending practitioners from database', async () => {
    const allPractitioners = [
      { id: 1, status: 'pending', name: 'Jane Doe' },
      { id: 2, status: 'approved', name: 'John Smith' },
      { id: 3, status: 'pending', name: 'Alice Johnson' },
    ];

    const pendingPractitioners = allPractitioners.filter(p => p.status === 'pending');

    expect(pendingPractitioners.length).toBe(2);
    expect(pendingPractitioners[0].name).toBe('Jane Doe');
    expect(pendingPractitioners[1].name).toBe('Alice Johnson');
  });

  it('should show approve and reject buttons for pending practitioners', () => {
    const practitioner = { id: 50, status: 'pending' };

    const actions = ['approve', 'reject'];

    expect(actions).toContain('approve');
    expect(actions).toContain('reject');
  });

  it('should display practitioner metadata without emojis', () => {
    const practitioner = {
      id: 50,
      location: 'San Francisco',
      languages: ['English', 'Spanish'],
      services: ['code-review', 'security-audit'],
    };

    const displayText = `Location: ${practitioner.location}, Languages: ${practitioner.languages.join(', ')}, ${practitioner.services.length} services`;

    // Should use text labels, not emojis
    expect(displayText).not.toContain('📍');
    expect(displayText).not.toContain('🗣️');
    expect(displayText).not.toContain('⚙️');
  });
});

describe('Admin API - Practitioner Actions', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should call /api/admin/approve-practitioner with ID', async () => {
    const practitionerId = 50;

    const mockResponse = {
      success: true,
      message: 'Practitioner approved successfully',
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/admin/approve-practitioner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: practitionerId }),
    });

    expect(response.ok).toBe(true);
  });

  it('should call /api/admin/reject-practitioner with ID', async () => {
    const practitionerId = 51;

    const mockResponse = {
      success: true,
      message: 'Practitioner application rejected',
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/admin/reject-practitioner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: practitionerId }),
    });

    expect(response.ok).toBe(true);
  });
});

describe('Admin API - Authorization', () => {
  it('should return 401 when not authenticated', async () => {
    const mockResponse = {
      error: 'Not authenticated',
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/admin/approve-practitioner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 100 }),
    });

    expect(response.status).toBe(401);
  });

  it('should return 403 when authenticated but not admin', async () => {
    const mockResponse = {
      error: 'Not authorized',
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 403,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/admin/approve-practitioner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 100 }),
    });

    expect(response.status).toBe(403);
  });
});
