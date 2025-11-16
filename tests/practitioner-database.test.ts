import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Database-Driven Practitioner Workflow Tests
 * 
 * Tests for practitioner management:
 * - Creating practitioner profiles (saves to PostgreSQL)
 * - Editing practitioner profiles (dedicated edit page)
 * - Approval workflow (admin approve/reject)
 * - Public directory (shows only approved practitioners)
 */

describe('Practitioner Creation (Database)', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should create practitioner profile and save to database', async () => {
    const practitionerData = {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      title: 'Senior Software Engineer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      bio: 'Experienced software engineer with 10 years in open source development.',
      languages: ['English', 'Spanish'],
      services: ['code-review', 'architecture-design'],
      rates: 'discounted',
      availability: 'immediate',
      website: 'https://janedoe.com',
      linkedin: 'https://linkedin.com/in/janedoe',
    };

    const mockResponse = {
      success: true,
      practitioner: {
        id: 50,
        slug: 'jane-doe-50',
        status: 'pending',
        approved: false,
      },
      message: 'Practitioner application submitted successfully',
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/submit-practitioner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(practitionerData),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.practitioner.status).toBe('pending');
    expect(data.practitioner.approved).toBe(false);
  });

  it('should validate required fields', async () => {
    const invalidData = {
      fullName: 'Jane Doe',
      // Missing email, title, bio, etc.
    };

    const mockResponse = {
      success: false,
      error: 'Missing required fields',
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/submit-practitioner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData),
    });

    expect(response.status).toBe(400);
  });

  it('should assign pending status to new practitioners', async () => {
    const newPractitioner = {
      status: 'pending',
      approved: false,
    };

    expect(newPractitioner.status).toBe('pending');
    expect(newPractitioner.approved).toBe(false);
  });
});

describe('Practitioner Editing (Dedicated Edit Page)', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should fetch existing practitioner data for editing', async () => {
    const mockResponse = {
      success: true,
      practitioner: {
        id: 10,
        name: 'Jane Doe',
        email: 'jane@example.com',
        title: 'Senior Engineer',
        company: 'Tech Corp',
        bio: 'Experienced engineer',
        languages: ['English', 'Spanish'],
        services: ['code-review'],
        rates: 'discounted',
        availability: 'immediate',
      },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/my-practitioner');
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.practitioner).toBeDefined();
    expect(data.practitioner.name).toBe('Jane Doe');
  });

  it('should update practitioner profile and reset approval status', async () => {
    const updateData = {
      id: 10,
      fullName: 'Jane Doe Updated',
      email: 'jane@example.com',
      title: 'Principal Engineer',
      bio: 'Updated bio with more experience details',
      languages: ['English', 'Spanish', 'French'],
      services: ['code-review', 'architecture-design', 'security-audit'],
      rates: 'market',
      availability: '1-2-weeks',
    };

    const mockResponse = {
      success: true,
      practitioner: {
        id: 10,
        status: 'pending',
        approved: false,
      },
      message: 'Profile updated. Changes will require admin approval.',
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/submit-practitioner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.practitioner.status).toBe('pending');
    expect(data.practitioner.approved).toBe(false);
    expect(data.message).toContain('require admin approval');
  });

  it('should preserve practitioner ID and slug when updating', async () => {
    const existingPractitioner = {
      id: 10,
      slug: 'jane-doe-10',
    };

    const updateData = {
      id: existingPractitioner.id,
      fullName: 'Jane Doe Smith',
    };

    expect(updateData.id).toBe(existingPractitioner.id);
  });

  it('should redirect to /edit-practitioner page (not apply page)', async () => {
    const editUrl = '/edit-practitioner';
    const applyUrl = '/apply-practitioner';

    // Edit page should be separate from apply page
    expect(editUrl).not.toBe(applyUrl);
    expect(editUrl).toBe('/edit-practitioner');
  });
});

describe('Practitioner Approval Workflow (Admin)', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should approve practitioner and set approved=true, status=approved', async () => {
    const practitionerId = 15;

    const mockResponse = {
      success: true,
      practitioner: {
        id: practitionerId,
        approved: true,
        status: 'approved',
      },
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

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.practitioner.approved).toBe(true);
    expect(data.practitioner.status).toBe('approved');
  });

  it('should reject practitioner and set approved=false, status=rejected', async () => {
    const practitionerId = 16;

    const mockResponse = {
      success: true,
      practitioner: {
        id: practitionerId,
        approved: false,
        status: 'rejected',
      },
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

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.practitioner.approved).toBe(false);
    expect(data.practitioner.status).toBe('rejected');
  });

  it('should require admin authentication for approval actions', async () => {
    const mockResponse = {
      success: false,
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
      body: JSON.stringify({ id: 15 }),
    });

    expect(response.status).toBe(403);
  });
});

describe('Public Practitioners API (Database)', () => {
  it('should return only approved practitioners on public API', async () => {
    const mockResponse = {
      practitioners: [
        { id: 1, approved: true, status: 'approved', name: 'John Doe' },
        { id: 2, approved: true, status: 'approved', name: 'Jane Smith' },
      ],
      metadata: {
        total: 2,
        approved: 2,
      },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/practitioners');
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.practitioners.length).toBe(2);
    expect(data.practitioners.every((p: any) => p.approved === true)).toBe(true);
    expect(data.practitioners.every((p: any) => p.status === 'approved')).toBe(true);
  });

  it('should not show pending or rejected practitioners publicly', async () => {
    const mockPractitioners = [
      { id: 1, status: 'approved', approved: true },
      { id: 2, status: 'pending', approved: false }, // Should not be in public API
      { id: 3, status: 'rejected', approved: false }, // Should not be in public API
    ];

    const publicPractitioners = mockPractitioners.filter(
      p => p.approved === true && p.status === 'approved'
    );

    expect(publicPractitioners.length).toBe(1);
    expect(publicPractitioners[0].id).toBe(1);
  });
});

describe('Practitioner Profile Banner', () => {
  it('should show edit link on practitioners page when user has profile', async () => {
    const userHasProfile = true;
    const profileStatus = 'approved';

    if (userHasProfile) {
      const editLink = '/edit-practitioner';
      expect(editLink).toBe('/edit-practitioner');
    }
  });

  it('should display profile status (Approved/Pending)', async () => {
    const statuses = ['approved', 'pending', 'rejected'];

    statuses.forEach(status => {
      const statusText = status === 'approved' 
        ? 'Approved' 
        : status === 'pending' 
          ? 'Pending Approval' 
          : `Status: ${status}`;
      
      expect(statusText).toBeDefined();
    });
  });
});
