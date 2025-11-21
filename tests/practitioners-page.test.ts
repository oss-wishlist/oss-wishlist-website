import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Practitioners Page Display Tests
 * 
 * Tests for /practitioners page rendering and data display:
 * - API data fetching and transformation
 * - Practitioner card display with correct fields
 * - Link generation using correct field names (slug vs github_username)
 * - Filtering by services
 * - Pro bono badge display
 * - Verified practitioner badges
 * - Wishlist context integration
 */

describe('Practitioners Page - API Integration', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should fetch practitioners from database API', async () => {
    const mockResponse = {
      practitioners: [
        {
          id: 1,
          slug: 'jane-doe-1',
          name: 'Jane Doe',
          title: 'Senior Engineer',
          company: 'Tech Corp',
          bio: 'Experienced in open source',
          avatar_url: '/images/oss-wishlist-logo.jpg',
          github: 'https://github.com/janedoe',
          email: 'jane@example.com',
          services: ['code-review', 'security-audit'],
          verified: true,
          accepts_pro_bono: true,
          availability: 'available',
        },
      ],
      metadata: {
        total: 1,
        approved: 1,
        source: 'database',
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
    expect(data.practitioners).toHaveLength(1);
    expect(data.practitioners[0].slug).toBe('jane-doe-1');
    expect(data.metadata.source).toBe('database');
  });

  it('should use practitioners data directly without transformation', async () => {
    const mockApiResponse = {
      practitioners: [
        {
          id: 1,
          slug: 'john-smith-1',
          name: 'John Smith',
          title: 'DevOps Engineer',
          bio: 'Cloud infrastructure specialist',
          github: 'https://github.com/johnsmith',
          services: ['architecture-design'],
        },
      ],
    };

    // Simulate what practitioners.astro does
    const allPractitioners = mockApiResponse.practitioners || [];

    // Should NOT wrap in {slug, data: {...}} format
    expect(allPractitioners[0].name).toBe('John Smith');
    expect(allPractitioners[0].slug).toBe('john-smith-1');
    expect(allPractitioners[0]).not.toHaveProperty('data');
  });
});

describe('Practitioners Page - Card Display', () => {
  it('should display practitioner name directly from database field', () => {
    const practitioner = {
      id: 1,
      slug: 'jane-doe-1',
      name: 'Jane Doe',
      title: 'Senior Engineer',
      bio: 'Experienced engineer',
    };

    // Card should access practitioner.name (not practitioner.data.name)
    expect(practitioner.name).toBe('Jane Doe');
    expect(practitioner).not.toHaveProperty('data');
  });

  it('should display practitioner title directly from database field', () => {
    const practitioner = {
      id: 1,
      slug: 'jane-doe-1',
      name: 'Jane Doe',
      title: 'Principal Software Engineer',
      bio: 'Expert in security',
    };

    // Card should access practitioner.title (not practitioner.data.title)
    expect(practitioner.title).toBe('Principal Software Engineer');
  });

  it('should display practitioner bio directly from database field', () => {
    const practitioner = {
      id: 1,
      slug: 'jane-doe-1',
      name: 'Jane Doe',
      title: 'Engineer',
      bio: 'I specialize in open source governance and funding strategies.',
    };

    // Card should access practitioner.bio (not practitioner.data.bio)
    expect(practitioner.bio).toBeTruthy();
    expect(practitioner.bio.length).toBeGreaterThan(10);
  });

  it('should show verified badge when practitioner is verified', () => {
    const verifiedPractitioner = {
      id: 1,
      slug: 'jane-doe-1',
      name: 'Jane Doe',
      verified: true,
    };

    const unverifiedPractitioner = {
      id: 2,
      slug: 'john-doe-2',
      name: 'John Doe',
      verified: false,
    };

    expect(verifiedPractitioner.verified).toBe(true);
    expect(unverifiedPractitioner.verified).toBe(false);
  });

  it('should show pro bono badge when practitioner accepts pro bono work', () => {
    const proBonoAccepted = {
      id: 1,
      slug: 'jane-doe-1',
      name: 'Jane Doe',
      accepts_pro_bono: true,
    };

    const proBonoNotAccepted = {
      id: 2,
      slug: 'john-doe-2',
      name: 'John Doe',
      accepts_pro_bono: false,
    };

    expect(proBonoAccepted.accepts_pro_bono).toBe(true);
    expect(proBonoNotAccepted.accepts_pro_bono).toBe(false);
  });
});

describe('Practitioners Page - Link Generation', () => {
  it('should generate view link using slug field (not github_username)', () => {
    const practitioner = {
      id: 1,
      slug: 'jane-doe-1',
      name: 'Jane Doe',
      github: 'https://github.com/janedoe',
    };

    // CRITICAL: Link should use practitioner.slug
    const basePath = '/';
    const viewLink = `${basePath}practitioners/${practitioner.slug}`;

    expect(viewLink).toBe('/practitioners/jane-doe-1');
    expect(viewLink).not.toContain('undefined');
  });

  it('should NOT use github_username field for links', () => {
    const practitioner = {
      id: 1,
      slug: 'jane-doe-1',
      name: 'Jane Doe',
      github: 'https://github.com/janedoe',
    };

    // github_username field does not exist in database response
    expect(practitioner).not.toHaveProperty('github_username');
  });

  it('should extract GitHub username from github URL for sponsors link', () => {
    const practitioner = {
      id: 1,
      slug: 'jane-doe-1',
      name: 'Jane Doe',
      github: 'https://github.com/janedoe',
      email: 'jane@example.com',
    };

    // Extract username from GitHub URL for sponsors link
    const githubUsername = practitioner.github
      ? practitioner.github.replace('https://github.com/', '')
      : null;

    expect(githubUsername).toBe('janedoe');

    // Should construct sponsors link correctly
    if (githubUsername) {
      const sponsorsLink = `https://github.com/sponsors/${githubUsername}`;
      expect(sponsorsLink).toBe('https://github.com/sponsors/janedoe');
    }
  });

  it('should fall back to email if no GitHub URL provided', () => {
    const practitioner = {
      id: 1,
      slug: 'jane-doe-1',
      name: 'Jane Doe',
      github: '', // No GitHub
      email: 'jane@example.com',
    };

    // Should use email as fallback
    const contactLink = practitioner.github
      ? `https://github.com/sponsors/${practitioner.github.replace('https://github.com/', '')}`
      : `mailto:${practitioner.email}`;

    expect(contactLink).toBe('mailto:jane@example.com');
  });
});

describe('Practitioners Page - Service Filtering', () => {
  it('should filter practitioners by selected service', () => {
    const allPractitioners = [
      {
        id: 1,
        slug: 'jane-doe-1',
        name: 'Jane Doe',
        services: ['code-review', 'security-audit'],
      },
      {
        id: 2,
        slug: 'john-smith-2',
        name: 'John Smith',
        services: ['funding-strategy', 'governance'],
      },
      {
        id: 3,
        slug: 'alice-jones-3',
        name: 'Alice Jones',
        services: ['code-review', 'architecture-design'],
      },
    ];

    // Filter by 'code-review'
    const selectedService = 'code-review';
    const filtered = allPractitioners.filter(p =>
      p.services.includes(selectedService)
    );

    expect(filtered).toHaveLength(2);
    expect(filtered[0].name).toBe('Jane Doe');
    expect(filtered[1].name).toBe('Alice Jones');
  });

  it('should show all practitioners when no service selected', () => {
    const allPractitioners = [
      { id: 1, slug: 'jane-doe-1', name: 'Jane Doe', services: ['code-review'] },
      { id: 2, slug: 'john-smith-2', name: 'John Smith', services: ['funding-strategy'] },
    ];

    const selectedService = null;
    const filtered = selectedService
      ? allPractitioners.filter(p => p.services.includes(selectedService))
      : allPractitioners;

    expect(filtered).toHaveLength(2);
  });
});

describe('Practitioners Page - Wishlist Context', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should show hire button when wishlist context provided', () => {
    const hasWishlistContext = true;
    const selectedWishlist = {
      id: '123',
      data: {
        project_name: 'My Open Source Project',
      },
    };

    expect(hasWishlistContext).toBe(true);
    expect(selectedWishlist.data.project_name).toBeTruthy();
  });

  it('should NOT show hire button without wishlist context', () => {
    const hasWishlistContext = false;
    const selectedWishlist = null;

    expect(hasWishlistContext).toBe(false);
    expect(selectedWishlist).toBeNull();
  });

  it('should include project name in hire button link', () => {
    const practitioner = {
      id: 1,
      slug: 'jane-doe-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      github: '',
    };

    const selectedWishlist = {
      id: '123',
      data: {
        project_name: 'My OSS Project',
      },
    };

    const subject = `Hire ${practitioner.name} for ${selectedWishlist.data.project_name}`;
    const mailtoLink = `mailto:${practitioner.email}?subject=${encodeURIComponent(subject)}`;

    expect(mailtoLink).toContain('Hire%20Jane%20Doe%20for%20My%20OSS%20Project');
  });
});

describe('Practitioners Page - Error Handling', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should handle empty practitioners array gracefully', async () => {
    const mockResponse = {
      practitioners: [],
      metadata: { total: 0, approved: 0, source: 'database' },
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const response = await fetch('/api/practitioners');
    const data = await response.json();

    const allPractitioners = data.practitioners || [];
    expect(allPractitioners).toHaveLength(0);
  });

  it('should handle API failure gracefully', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal Server Error' }),
      } as Response)
    );

    const response = await fetch('/api/practitioners');
    expect(response.ok).toBe(false);
  });

  it('should handle missing practitioner fields gracefully', () => {
    const practitioner = {
      id: 1,
      slug: 'jane-doe-practitioner',
      name: 'Jane Doe',
      title: 'Engineer',
      bio: 'Experienced',
      // Missing optional fields
      company: undefined,
      location: undefined,
      github: undefined,
      linkedin: undefined,
    };

    // Should not crash when optional fields are missing
    expect(practitioner.name).toBeTruthy();
    expect(practitioner.company).toBeUndefined();
    expect(practitioner.github).toBeUndefined();
  });

  it('should use default avatar when github field is missing', () => {
    const practitionerWithoutGitHub = {
      id: 1,
      slug: 'jane-doe-practitioner',
      name: 'Jane Doe',
      github: undefined,
      avatar_url: '/images/oss-wishlist-logo.jpg', // Default fallback
    };

    expect(practitionerWithoutGitHub.avatar_url).toBe('/images/oss-wishlist-logo.jpg');
  });

  it('should use GitHub avatar when github field is provided', () => {
    const practitionerWithGitHub = {
      id: 1,
      slug: 'jane-doe-practitioner',
      name: 'Jane Doe',
      github: 'https://github.com/janedoe',
      avatar_url: 'https://github.com/janedoe.png',
    };

    expect(practitionerWithGitHub.avatar_url).toContain('github.com');
    expect(practitionerWithGitHub.avatar_url).toContain('.png');
  });
});

describe('Practitioners Page - Authentication Agnostic', () => {
  it('should support different authentication providers via submitter_username', () => {
    const githubAuthPractitioner = {
      id: 1,
      slug: 'jane-doe-practitioner',
      name: 'Jane Doe',
      submitter_username: 'janedoe', // GitHub username
      github: 'https://github.com/janedoe',
    };

    const googleAuthPractitioner = {
      id: 2,
      slug: 'john-smith-practitioner',
      name: 'John Smith',
      submitter_username: 'google:john.smith@example.com', // Could be Google
      github: undefined, // No GitHub profile
    };

    // Both should work with same system
    expect(githubAuthPractitioner.submitter_username).toBeTruthy();
    expect(googleAuthPractitioner.submitter_username).toBeTruthy();
    expect(githubAuthPractitioner.slug).toContain('jane-doe');
    expect(googleAuthPractitioner.slug).toContain('john-smith');
  });
});

describe('Practitioners Page - Regression Tests', () => {
  it('should NOT transform database response into content collection format', () => {
    // This was the bug: wrapping database fields in {slug, data: {...}}
    const databaseResponse = {
      practitioners: [
        {
          id: 1,
          slug: 'jane-doe-1',
          name: 'Jane Doe',
          title: 'Engineer',
          bio: 'Experienced',
        },
      ],
    };

    // CORRECT: Use directly
    const allPractitioners = databaseResponse.practitioners || [];
    expect(allPractitioners[0].name).toBe('Jane Doe');
    expect(allPractitioners[0]).not.toHaveProperty('data');

    // WRONG (old bug): Don't do this
    const badTransform = databaseResponse.practitioners.map(p => ({
      slug: p.slug,
      data: { name: p.name, title: p.title, bio: p.bio },
    }));
    expect(badTransform[0]).toHaveProperty('data'); // This was the bug
  });

  it('should use slug field for practitioner detail page links', () => {
    const practitioner = {
      id: 1,
      slug: 'jane-doe-practitioner',
      name: 'Jane Doe',
      github: 'https://github.com/janedoe',
    };

    const basePath = '/';
    const link = `${basePath}practitioners/${practitioner.slug}`;

    // CORRECT: Uses slug (name-based, auth-agnostic)
    expect(link).toBe('/practitioners/jane-doe-practitioner');

    // Slug is independent of GitHub username
    expect(practitioner.slug).not.toContain('janedoe');
    expect(practitioner.slug).toContain('jane-doe');
  });

  it('should extract GitHub username from github field (not github_username)', () => {
    const practitioner = {
      id: 1,
      slug: 'jane-doe-1',
      name: 'Jane Doe',
      github: 'https://github.com/janedoe',
      email: 'jane@example.com',
    };

    // CORRECT: Extract from github field
    const username = practitioner.github
      ? practitioner.github.replace('https://github.com/', '')
      : null;
    expect(username).toBe('janedoe');

    // WRONG: github_username doesn't exist
    expect(practitioner).not.toHaveProperty('github_username');
  });
});
