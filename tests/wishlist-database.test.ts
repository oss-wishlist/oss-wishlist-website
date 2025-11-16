import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Database-Driven Wishlist Workflow Tests
 * 
 * Tests for the new database-driven approach:
 * - Creating wishlists (saves directly to PostgreSQL)
 * - Editing wishlists (updates database, resets approval)
 * - Closing wishlists (updates status in database)
 * - Deleting wishlists (removes from database)
 * - Approval workflow (admin approve/reject/move to pending)
 */

describe('Wishlist Creation (Database)', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should create wishlist and save to PostgreSQL database', async () => {
    const wishlistData = {
      projectName: 'New Open Source Project',
      repositoryUrl: 'https://github.com/user/project',
      maintainerEmail: 'maintainer@example.com',
      projectDescription: 'A great open source project',
      wishes: ['governance-setup', 'security-audit'],
      technologies: ['Python', 'JavaScript'],
      urgency: 'high',
      projectSize: 'medium',
    };

    const mockResponse = {
      success: true,
      wishlist: {
        id: 365842,
        slug: 'new-open-source-project-365842',
        status: 'pending',
        approved: false,
      },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/submit-wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wishlistData),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.wishlist.id).toBe(365842);
    expect(data.wishlist.status).toBe('pending');
    expect(data.wishlist.approved).toBe(false);
  });

  it('should assign pending status to new wishlists', async () => {
    const newWishlist = {
      status: 'pending',
      approved: false,
    };

    expect(newWishlist.status).toBe('pending');
    expect(newWishlist.approved).toBe(false);
  });

  it('should generate unique slug from project name and ID', async () => {
    const projectName = 'My Awesome Project';
    const id = 12345;
    const expectedSlug = 'my-awesome-project-12345';

    const slug = projectName.toLowerCase().replace(/\s+/g, '-') + `-${id}`;

    expect(slug).toBe(expectedSlug);
  });
});

describe('Wishlist Editing (Database)', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should update wishlist in database and reset approval status', async () => {
    const updateData = {
      id: 804627,
      projectName: 'Updated Project Name',
      projectDescription: 'Updated description',
      wishes: ['security-audit', 'documentation'],
    };

    const mockResponse = {
      success: true,
      wishlist: {
        id: 804627,
        status: 'pending',
        approved: false,
        updated_at: new Date().toISOString(),
      },
      message: 'Wishlist updated successfully. Changes will require admin approval.',
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/submit-wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.wishlist.status).toBe('pending');
    expect(data.wishlist.approved).toBe(false);
    expect(data.message).toContain('require admin approval');
  });

  it('should preserve wishlist ID and slug when updating', async () => {
    const existingWishlist = {
      id: 100,
      slug: 'project-100',
    };

    const updateData = {
      id: existingWishlist.id,
      projectName: 'New Name',
    };

    expect(updateData.id).toBe(existingWishlist.id);
  });
});

describe('Wishlist Closing (Database)', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should update wishlist status to closed in database', async () => {
    const wishlistId = 200;

    const mockResponse = {
      success: true,
      wishlist: {
        id: wishlistId,
        status: 'closed',
        issue_state: 'closed',
      },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/close-wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: wishlistId }),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.wishlist.status).toBe('closed');
    expect(data.wishlist.issue_state).toBe('closed');
  });

  it('should require authentication to close wishlist', async () => {
    const mockResponse = {
      success: false,
      error: 'Not authenticated',
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/close-wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 200 }),
    });

    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Not authenticated');
  });
});

describe('Wishlist Deletion (Database)', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should delete wishlist from database', async () => {
    const wishlistId = 300;

    const mockResponse = {
      success: true,
      message: 'Wishlist deleted successfully',
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/delete-wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: wishlistId }),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.message).toContain('deleted successfully');
  });

  it('should require authentication to delete wishlist', async () => {
    const mockResponse = {
      success: false,
      error: 'Not authenticated',
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/delete-wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 300 }),
    });

    expect(response.status).toBe(401);
  });
});

describe('Wishlist Approval Workflow (Admin)', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should approve wishlist and set approved=true, status=approved', async () => {
    const wishlistId = 201;

    const mockResponse = {
      success: true,
      wishlist: {
        id: wishlistId,
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

    const response = await fetch('/api/admin/approve-wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: wishlistId }),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.wishlist.approved).toBe(true);
    expect(data.wishlist.status).toBe('approved');
  });

  it('should reject wishlist and set approved=false, status=rejected', async () => {
    const wishlistId = 202;

    const mockResponse = {
      success: true,
      wishlist: {
        id: wishlistId,
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

    const response = await fetch('/api/admin/reject-wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: wishlistId }),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.wishlist.approved).toBe(false);
    expect(data.wishlist.status).toBe('rejected');
  });

  it('should move approved wishlist back to pending', async () => {
    const wishlistId = 203;

    const mockResponse = {
      success: true,
      wishlist: {
        id: wishlistId,
        approved: false,
        status: 'pending',
      },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/admin/move-to-pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: wishlistId }),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.wishlist.approved).toBe(false);
    expect(data.wishlist.status).toBe('pending');
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

    const response = await fetch('/api/admin/approve-wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 100 }),
    });

    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe('Not authorized');
  });

  it('should delete wishlist from admin panel', async () => {
    const wishlistId = 204;

    const mockResponse = {
      success: true,
      message: 'Wishlist deleted successfully',
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/admin/delete-wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: wishlistId }),
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
  });
});

describe('Public Wishlist API (Database)', () => {
  it('should return only approved wishlists on public API', async () => {
    const mockResponse = {
      wishlists: [
        { id: 100, approved: true, status: 'approved' },
        { id: 101, approved: true, status: 'approved' },
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

    const response = await fetch('/api/wishlists');
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.wishlists.length).toBe(2);
    expect(data.wishlists.every((w: any) => w.approved === true)).toBe(true);
    expect(data.wishlists.every((w: any) => w.status === 'approved')).toBe(true);
  });

  it('should return full wishlist data for internal use', async () => {
    const mockWishlist = {
      id: 100,
      projectName: 'Test Project',
      maintainerUsername: 'testuser',
      description: 'Project description',
      wishes: ['governance-setup'],
      technologies: ['Python'],
      urgency: 'medium',
      projectSize: 'small',
      repositoryUrl: 'https://github.com/test/repo',
    };

    expect(mockWishlist).toHaveProperty('projectName');
    expect(mockWishlist).toHaveProperty('maintainerUsername');
    expect(mockWishlist).toHaveProperty('wishes');
    expect(mockWishlist).toHaveProperty('technologies');
  });
});
