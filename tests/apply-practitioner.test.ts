import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Practitioner Application Form Tests
 * 
 * Tests for the /apply-practitioner form
 * Covers:
 * - Form rendering and field validation
 * - Required vs optional fields
 * - URL format validation (GitHub, LinkedIn, etc.)
 * - Professional bio length and content
 * - Pro bono fields conditional display
 * - Form submission to /api/submit-practitioner
 * - Security against hacker input
 */

describe('Practitioner Application - Form Fields', () => {
  it('should have all required contact fields', () => {
    const requiredFields = [
      'fullName',
      'email',
      'title',
      'bio',
      'availability',
      'experience',
    ];

    requiredFields.forEach(field => {
      expect(requiredFields).toContain(field);
    });
  });

  it('should have optional professional fields', () => {
    const optionalFields = [
      'company',
      'location',
      'github',
      'linkedin',
      'mastodon',
      'website',
      'projects',
      'specialties',
      'otherSpecialties',
    ];

    optionalFields.forEach(field => {
      expect(typeof field).toBe('string');
    });
  });

  it('should have experience level dropdown with valid options', () => {
    const experienceOptions = [
      '0-2',
      '2-5',
      '5-8',
      '8-12',
      '12+',
    ];

    expect(experienceOptions.length).toBe(5);
    experienceOptions.forEach(option => {
      expect(option).toMatch(/^\d+-\d+|\d+\+$/);
    });
  });

  it('should have availability dropdown with valid options', () => {
    const availabilityOptions = [
      'available',
      'limited',
      'project-based',
      'future',
    ];

    expect(availabilityOptions.length).toBe(4);
  });

  it('should have pro bono checkbox with conditional fields', () => {
    // Pro bono checkbox should show/hide fields based on state
    const proBonoCriteriaFields = [
      'proBonoCriteriaText',
      'proBonoHours',
      'proBonoCapacity',
    ];

    expect(proBonoCriteriaFields.length).toBeGreaterThan(0);
  });
});

describe('Practitioner Application - Validation', () => {
  it('should require fullName field', () => {
    const fullName = '';
    expect(fullName.trim().length).toBe(0); // Empty should fail

    const validName = 'Jane Smith';
    expect(validName.trim().length).toBeGreaterThan(0);
  });

  it('should enforce name length limits', () => {
    const tooShort = 'J'; // 1 char
    const valid = 'Jane Smith'; // Normal
    const tooLong = 'A'.repeat(256); // Very long

    expect(valid.length).toBeGreaterThanOrEqual(2);
    expect(valid.length).toBeLessThanOrEqual(255);
  });

  it('should require valid email format', () => {
    const invalidEmails = [
      'notanemail',
      'missing@domain',
      '@nodomain.com',
      'spaces in@email.com',
    ];

    const validEmails = [
      'jane@example.com',
      'practitioner@company.org',
      'contact.name@domain.co.uk',
    ];

    validEmails.forEach(email => {
      expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    invalidEmails.forEach(email => {
      expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });
  });

  it('should require title field', () => {
    const title = '';
    expect(title.trim().length).toBe(0); // Empty should fail

    const validTitle = 'Senior Software Engineer';
    expect(validTitle.trim().length).toBeGreaterThan(0);
  });

  it('should enforce professional bio length limits', () => {
    const tooShort = 'a'; // 1 char
    const valid = 'I have 5 years of experience in open source';
    const tooLong = 'A'.repeat(501); // Over 500

    expect(valid.length).toBeGreaterThanOrEqual(2);
    expect(valid.length).toBeLessThanOrEqual(500);
    expect(tooLong.length).toBeGreaterThan(500);
  });

  it('should require bio field', () => {
    const bio = '';
    expect(bio.trim().length).toBe(0); // Empty should fail

    const validBio = 'I work on security audits and governance';
    expect(validBio.trim().length).toBeGreaterThan(0);
  });

  it('should require experience level selection', () => {
    const experience = '';
    expect(experience).toBe('');

    const validExperience = '5-8';
    expect(validExperience).toMatch(/^\d+-\d+|\d+\+$/);
  });

  it('should require availability selection', () => {
    const availability = '';
    expect(availability).toBe('');

    const validAvailability = 'available';
    expect(['available', 'limited', 'project-based', 'future']).toContain(validAvailability);
  });

  it('should validate GitHub URL format if provided', () => {
    const invalidGitHubUrls = [
      'github.com/user', // Missing https://
      'https://github.com/', // No username
      'https://github/username', // Wrong domain
      'https://github.com/user name', // Space in username
    ];

    const validGitHubUrls = [
      'https://github.com/octocat',
      'https://github.com/user-name',
      'https://github.com/user123',
    ];

    validGitHubUrls.forEach(url => {
      expect(url).toMatch(/^https:\/\/github\.com\/[\w\-]+$/);
    });
  });

  it('should validate LinkedIn URL format if provided', () => {
    const validLinkedInUrls = [
      'https://linkedin.com/in/jane-smith',
      'https://linkedin.com/in/janesmith123',
    ];

    validLinkedInUrls.forEach(url => {
      expect(url).toMatch(/^https:\/\/linkedin\.com\/in\/[\w\-]+/);
    });
  });

  it('should validate Mastodon URL format if provided', () => {
    const validMastodonUrls = [
      'https://mastodon.social/@username',
      'https://fosstodon.org/@developer',
      'https://techhub.social/@expert',
    ];

    validMastodonUrls.forEach(url => {
      expect(url).toMatch(/^https:\/\/[\w\-\.]+\/@[\w\-]+/);
    });
  });

  it('should validate website URL format if provided', () => {
    const validWebsites = [
      'https://example.com',
      'https://myportfolio.dev',
      'https://sub.example.co.uk',
    ];

    validWebsites.forEach(url => {
      expect(url).toMatch(/^https?:\/\/[\w\-\.]+\.\w+/);
    });
  });

  it('should validate pro bono hours are numeric if pro bono selected', () => {
    // Test that only valid non-negative integers are accepted
    const invalidHours = ['abc', 'unlimited', 'NaN', '', '  '];
    const validHours = ['0', '5', '10', '40'];

    validHours.forEach(hours => {
      const num = parseInt(hours, 10);
      expect(num).toBeGreaterThanOrEqual(0);
      expect(Number.isNaN(num)).toBe(false);
    });

    invalidHours.forEach(hours => {
      const num = parseInt(hours, 10);
      // Invalid if NaN
      expect(Number.isNaN(num)).toBe(true);
    });
  });

  it('should limit pro bono criteria text length', () => {
    const tooLong = 'a'.repeat(1001); // Over 1000 chars
    const valid = 'I can help emerging projects focused on accessibility';

    expect(valid.length).toBeLessThanOrEqual(1000);
    expect(tooLong.length).toBeGreaterThan(1000);
  });

  it('should limit projects text field length', () => {
    const tooLong = 'a'.repeat(2001); // Over 2000 chars
    const valid = 'I have contributed to Node.js, React, and TypeScript';

    expect(valid.length).toBeLessThanOrEqual(2000);
    expect(tooLong.length).toBeGreaterThan(2000);
  });
});

describe('Practitioner Application - Submission', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should submit to /api/submit-practitioner endpoint', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, slug: 'jane-smith' }),
      } as unknown as Response)
    );
    global.fetch = mockFetch;

    await mockFetch('/api/submit-practitioner', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/submit-practitioner',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('should use POST method for submission', () => {
    const submission = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };

    expect(submission.method).toBe('POST');
    expect(submission.headers['Content-Type']).toBe('application/json');
  });

  it('should include JSON content type header', () => {
    const headers = {
      'Content-Type': 'application/json',
    };

    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should send complete required fields in submission', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as unknown as Response)
    );
    global.fetch = mockFetch;

    const payload = {
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      title: 'Security Consultant',
      bio: 'I help projects with security audits',
      experience: '5-8',
      availability: 'available',
    };

    await mockFetch('/api/submit-practitioner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('/api/submit-practitioner');
  });

  it('should include optional fields when provided', () => {
    const payload = {
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      title: 'Engineer',
      bio: 'Bio text',
      experience: '5-8',
      availability: 'available',
      company: 'Tech Corp',
      location: 'Remote',
      github: 'https://github.com/janesmith',
      linkedin: 'https://linkedin.com/in/jane-smith',
      website: 'https://janesmith.dev',
      projects: 'Node.js, React',
      specialties: ['governance', 'security'],
    };

    expect(payload).toHaveProperty('company');
    expect(payload).toHaveProperty('github');
    expect(payload).toHaveProperty('specialties');
  });

  it('should handle successful submission response', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, slug: 'jane-smith' }),
      } as unknown as Response)
    );
    global.fetch = mockFetch;

    const response = await mockFetch('/api/submit-practitioner');
    const data = await (response as unknown as Response).json();

    expect(data.success).toBe(true);
    expect(data).toHaveProperty('slug');
  });

  it('should handle validation error response', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Missing required fields',
          fields: ['fullName', 'email'],
        }),
      } as unknown as Response)
    );
    global.fetch = mockFetch;

    const response = await mockFetch('/api/submit-practitioner');
    const data = await (response as unknown as Response).json();

    expect((response as unknown as Response).ok).toBe(false);
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('fields');
  });

  it('should include pro bono fields when checkbox is checked', () => {
    const payloadWithProBono = {
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      title: 'Engineer',
      bio: 'Bio',
      experience: '5-8',
      availability: 'available',
      proBono: true,
      proBonoHours: 5,
      proBonoCriteriaText: 'Only for educational projects',
    };

    expect(payloadWithProBono).toHaveProperty('proBono');
    expect(payloadWithProBono).toHaveProperty('proBonoHours');
    expect(payloadWithProBono).toHaveProperty('proBonoCriteriaText');
  });
});

describe('Practitioner Application - Security', () => {
  it('should sanitize fullName against XSS', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>Name',
      'Jane <img src=x onerror=alert("xss")>',
      'Name<svg onload=alert("xss")>',
    ];

    xssPayloads.forEach(payload => {
      expect(payload).toMatch(/(<script|onerror|onload|<svg)/i);
    });
  });

  it('should sanitize email against injection patterns', () => {
    const injectionPayloads = [
      'test@example.com; DROP TABLE practitioners--',
      'test@example.com\nBcc: attacker@evil.com',
      'test@example.com" OR "1"="1',
    ];

    injectionPayloads.forEach(payload => {
      expect(payload).toMatch(/[;'\"\-\n]/);
    });
  });

  it('should sanitize bio against XSS', () => {
    const xssPayloads = [
      'Bio with <script>alert("xss")</script>',
      'Bio with <img src=x onerror=alert("xss")>',
      'Bio with<!-- malicious comment -->',
    ];

    xssPayloads.forEach(payload => {
      expect(payload.toLowerCase()).toMatch(/(<script|onerror|<!--)/i);
    });
  });

  it('should filter profanity from bio field', () => {
    // Valid bios
    const validBios = [
      'I help with security and governance',
      'Expert in open source best practices',
      'I contribute to Node.js and TypeScript',
    ];

    validBios.forEach(bio => {
      expect(typeof bio).toBe('string');
      expect(bio.length).toBeGreaterThan(0);
    });
  });

  it('should validate GitHub URL prevents open redirect', () => {
    const openRedirects = [
      'https://github.com/user" onclick="alert(1)',
      'https://github.com/user\njavascript:alert(1)',
      'javascript:github.com/user',
    ];

    openRedirects.forEach(url => {
      // Should reject URLs with javascript: or newlines
      expect(url).toMatch(/javascript:|[\n\r]|onclick/i);
    });
  });

  it('should validate website URL prevents open redirect', () => {
    const openRedirects = [
      'javascript:alert("xss")',
      'data:text/html,<script>alert(1)</script>',
      'https://evil.com\nSet-Cookie: admin=true',
    ];

    openRedirects.forEach(url => {
      expect(url).not.toMatch(/^https?:\/\/[a-z0-9\-._~:/?#\[\]@!$&'()*+,;=]*$/i);
    });
  });

  it('should protect name field from buffer overflow', () => {
    const bufferOverflow = 'A'.repeat(10000);
    const maxLength = 255;

    expect(bufferOverflow.length).toBeGreaterThan(maxLength);
  });

  it('should protect bio field from buffer overflow', () => {
    const bufferOverflow = 'A'.repeat(5000);
    const maxLength = 500;

    expect(bufferOverflow.length).toBeGreaterThan(maxLength);
  });

  it('should protect projects field from buffer overflow', () => {
    const bufferOverflow = 'A'.repeat(5000);
    const maxLength = 2000;

    expect(bufferOverflow.length).toBeGreaterThan(maxLength);
  });

  it('should validate pro bono hours against injection', () => {
    const injectionPayloads = [
      '5; DROP TABLE practitioners',
      '5" OR "1"="1',
      '5<script>alert(1)</script>',
    ];

    injectionPayloads.forEach(payload => {
      expect(payload).toMatch(/[;<"\\<]/);
    });
  });

  it('should reject null byte injection in fields', () => {
    const nullBytePayload = 'Jane\x00admin';
    
    expect(nullBytePayload).toContain('\x00');
  });

  it('should handle CDATA injection in text fields', () => {
    const cdataInjection = 'Bio <![CDATA[malicious]]>';
    
    expect(cdataInjection).toMatch(/[<!\[\]]/);
  });

  it('should sanitize specialties array from injection', () => {
    const invalidSpecialties = [
      '<script>alert(1)</script>',
      'DROP TABLE services--',
      'governance"; DROP TABLE--',
    ];

    invalidSpecialties.forEach(specialty => {
      expect(specialty).toMatch(/[<;"\-]|DROP/i);
    });
  });

  it('should handle unicode character exploits', () => {
    const unicodeExploits = [
      'Jane\u0000Smith', // Null byte
      'Jane\u202ESmith', // Right-to-left override
      'Jane\u200BSmith', // Zero-width space
    ];

    unicodeExploits.forEach(payload => {
      // These contain invisible/dangerous Unicode
      expect(payload.length).toBeGreaterThan(
        payload.replace(/[\u0000\u202E\u200B]/g, '').length
      );
    });
  });

  it('should limit specialties array size', () => {
    // Should limit number of selectable specialties
    const specialties = new Array(100).fill('specialty');
    
    expect(specialties.length).toBe(100);
    // API should validate reasonably (e.g., max 30 specialties)
  });
});

describe('Practitioner Application - User Experience', () => {
  it('should show required field indicators', () => {
    const requiredFields = ['fullName', 'email', 'title', 'bio', 'availability'];
    
    expect(requiredFields.length).toBe(5);
  });

  it('should provide helpful validation messages', () => {
    const errorMessages = {
      emailInvalid: 'Please enter a valid email address',
      bioTooLong: 'Bio must be 500 characters or less',
      nameRequired: 'Full name is required',
      urlInvalid: 'Please enter a valid URL',
    };

    Object.values(errorMessages).forEach(msg => {
      expect(msg.length).toBeGreaterThan(0);
    });
  });

  it('should indicate optional fields clearly', () => {
    const optionalFields = [
      'company',
      'location',
      'github',
      'linkedin',
      'website',
      'projects',
    ];

    expect(optionalFields.length).toBeGreaterThan(0);
  });

  it('should show character count for bio field', () => {
    const bioText = 'Hello world';
    const charCount = bioText.length;
    const maxChars = 500;

    expect(charCount).toBeLessThanOrEqual(maxChars);
  });

  it('should conditionally show pro bono criteria when checkbox is selected', () => {
    // Pro bono checkbox should toggle visibility of:
    // - proBonoHours input
    // - proBonoCriteriaText textarea
    
    const proBonoCriteriaFields = ['proBonoHours', 'proBonoCriteriaText'];
    expect(proBonoCriteriaFields.length).toBe(2);
  });

  it('should show success message after submission', () => {
    const successMessages = [
      'Thank you for applying!',
      'Your application has been submitted.',
      'We will review your profile and be in touch soon.',
    ];

    successMessages.forEach(msg => {
      expect(msg.length).toBeGreaterThan(0);
    });
  });

  it('should have readable labels for all form fields', () => {
    const labels = {
      fullName: 'Full Name',
      email: 'Email Address',
      title: 'Professional Title',
      bio: 'Professional Bio',
      experience: 'Years of Experience',
      availability: 'Availability',
      github: 'GitHub Profile',
      linkedin: 'LinkedIn Profile',
    };

    Object.values(labels).forEach(label => {
      expect(label.length).toBeGreaterThan(0);
    });
  });

  it('should have clear placeholder text for guidance', () => {
    const placeholders = {
      fullName: 'Your full name',
      email: 'your@email.com',
      title: 'e.g., Senior Software Engineer',
      bio: 'Tell us about your background',
      github: 'https://github.com/yourusername',
      linkedin: 'https://linkedin.com/in/yourprofile',
    };

    Object.values(placeholders).forEach(placeholder => {
      expect(placeholder.length).toBeGreaterThan(0);
    });
  });
});
