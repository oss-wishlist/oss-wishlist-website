import { describe, it, expect } from 'vitest';
import {
  wishlistFormDataSchema,
  wishlistSubmissionSchema,
  formatZodError,
  type WishlistFormData,
  type WishlistSubmission,
} from '../src/lib/validation';
import { z } from 'zod';

describe('Validation Schemas', () => {
  describe('wishlistFormDataSchema', () => {
    it('accepts valid wishlist form data', () => {
      const validData: WishlistFormData = {
        projectTitle: 'My Awesome Project',
        projectUrl: 'https://github.com/user/project',
        maintainer: 'john_doe',
        services: ['service-1', 'service-2'],
        projectSize: 'medium',
        urgency: 'high',
        description: 'A great project that needs help',
        additionalNotes: 'Please help us',
        timeline: 'ASAP',
        technologies: ['JavaScript', 'Python'],
        preferredPractitioner: 'practitioner-1',
        nomineeName: 'Jane Smith',
        nomineeEmail: 'jane@example.com',
        nomineeGithub: 'https://github.com/janesmith',
        repositories: [
          {
            name: 'my-repo',
            url: 'https://github.com/user/my-repo',
            username: 'user',
            description: 'My repository',
          },
        ],
        createFundingPR: true,
        openToSponsorship: true,
        organizationType: 'community-team',
        organizationName: 'My Team',
        otherOrganizationType: undefined,
      };

      const result = wishlistFormDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects empty project title', () => {
      const invalidData = {
        projectTitle: '',
        projectUrl: 'https://github.com/user/project',
        maintainer: 'john_doe',
        services: ['service-1'],
        projectSize: 'medium',
        urgency: 'high',
      };

      const result = wishlistFormDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('projectTitle'))).toBe(true);
      }
    });

    it('rejects project title shorter than 3 characters', () => {
      const invalidData = {
        projectTitle: 'AB',
        projectUrl: 'https://github.com/user/project',
        maintainer: 'john_doe',
        services: ['service-1'],
        projectSize: 'medium',
        urgency: 'high',
      };

      const result = wishlistFormDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('projectTitle'))).toBe(true);
      }
    });

    it('rejects project title longer than 100 characters', () => {
      const invalidData = {
        projectTitle: 'A'.repeat(101),
        projectUrl: 'https://github.com/user/project',
        maintainer: 'john_doe',
        services: ['service-1'],
        projectSize: 'medium',
        urgency: 'high',
      };

      const result = wishlistFormDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('projectTitle'))).toBe(true);
      }
    });

    it('rejects invalid project URL', () => {
      const invalidData = {
        projectTitle: 'Valid Title',
        projectUrl: 'not-a-url',
        maintainer: 'john_doe',
        services: ['service-1'],
        projectSize: 'medium',
        urgency: 'high',
      };

      const result = wishlistFormDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('projectUrl'))).toBe(true);
      }
    });

    it('rejects empty services array', () => {
      const invalidData = {
        projectTitle: 'Valid Title',
        projectUrl: 'https://github.com/user/project',
        maintainer: 'john_doe',
        services: [],
        projectSize: 'medium',
        urgency: 'high',
      };

      const result = wishlistFormDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('services'))).toBe(true);
      }
    });

    it('rejects more than 3 services', () => {
      const invalidData = {
        projectTitle: 'Valid Title',
        projectUrl: 'https://github.com/user/project',
        maintainer: 'john_doe',
        services: ['s1', 's2', 's3', 's4'],
        projectSize: 'medium',
        urgency: 'high',
      };

      const result = wishlistFormDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('services'))).toBe(true);
      }
    });

    it('rejects invalid project size', () => {
      const invalidData = {
        projectTitle: 'Valid Title',
        projectUrl: 'https://github.com/user/project',
        maintainer: 'john_doe',
        services: ['service-1'],
        projectSize: 'extra-large',
        urgency: 'high',
      };

      const result = wishlistFormDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('projectSize'))).toBe(true);
      }
    });

    it('rejects invalid urgency', () => {
      const invalidData = {
        projectTitle: 'Valid Title',
        projectUrl: 'https://github.com/user/project',
        maintainer: 'john_doe',
        services: ['service-1'],
        projectSize: 'medium',
        urgency: 'critical',
      };

      const result = wishlistFormDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('urgency'))).toBe(true);
      }
    });

    it('rejects invalid email in nomineeEmail', () => {
      const invalidData = {
        projectTitle: 'Valid Title',
        projectUrl: 'https://github.com/user/project',
        maintainer: 'john_doe',
        services: ['service-1'],
        projectSize: 'medium',
        urgency: 'high',
        nomineeName: 'Jane Smith',
        nomineeEmail: 'not-an-email',
      };

      const result = wishlistFormDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('nomineeEmail'))).toBe(true);
      }
    });

    it('rejects invalid GitHub URL in nomineeGithub', () => {
      const invalidData = {
        projectTitle: 'Valid Title',
        projectUrl: 'https://github.com/user/project',
        maintainer: 'john_doe',
        services: ['service-1'],
        projectSize: 'medium',
        urgency: 'high',
        nomineeName: 'Jane Smith',
        nomineeGithub: 'https://gitlab.com/janesmith',
      };

      const result = wishlistFormDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('nomineeGithub'))).toBe(true);
      }
    });

    it('accepts valid GitHub URL in nomineeGithub', () => {
      const validData: WishlistFormData = {
        projectTitle: 'Valid Title',
        projectUrl: 'https://github.com/user/project',
        maintainer: 'john_doe',
        services: ['service-1'],
        projectSize: 'medium',
        urgency: 'high',
        nomineeName: 'Jane Smith',
        nomineeGithub: 'https://github.com/janesmith',
      };

      const result = wishlistFormDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('allows empty nomineeGithub', () => {
      const validData: WishlistFormData = {
        projectTitle: 'Valid Title',
        projectUrl: 'https://github.com/user/project',
        maintainer: 'john_doe',
        services: ['service-1'],
        projectSize: 'medium',
        urgency: 'high',
        nomineeName: 'Jane Smith',
        nomineeGithub: '',
      };

      const result = wishlistFormDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('wishlistSubmissionSchema', () => {
    const validFormData: WishlistFormData = {
      projectTitle: 'Valid Title',
      projectUrl: 'https://github.com/user/project',
      maintainer: 'john_doe',
      services: ['service-1'],
      projectSize: 'medium',
      urgency: 'high',
    };

    it('accepts valid wishlist submission', () => {
      const validSubmission: WishlistSubmission = {
        formData: validFormData,
      };

      const result = wishlistSubmissionSchema.safeParse(validSubmission);
      expect(result.success).toBe(true);
    });

    it('requires issueNumber when isUpdate is true', () => {
      const invalidSubmission = {
        formData: validFormData,
        isUpdate: true,
        // issueNumber is missing
      };

      const result = wishlistSubmissionSchema.safeParse(invalidSubmission);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.message.includes('Issue number is required'))).toBe(true);
      }
    });

    it('allows isUpdate without issueNumber when isUpdate is false', () => {
      const validSubmission: WishlistSubmission = {
        formData: validFormData,
        isUpdate: false,
      };

      const result = wishlistSubmissionSchema.safeParse(validSubmission);
      expect(result.success).toBe(true);
    });

    it('accepts valid update with issueNumber', () => {
      const validSubmission: WishlistSubmission = {
        formData: validFormData,
        isUpdate: true,
        issueNumber: 123,
      };

      const result = wishlistSubmissionSchema.safeParse(validSubmission);
      expect(result.success).toBe(true);
    });

    it('rejects negative issueNumber', () => {
      const invalidSubmission = {
        formData: validFormData,
        isUpdate: true,
        issueNumber: -1,
      };

      const result = wishlistSubmissionSchema.safeParse(invalidSubmission);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('issueNumber'))).toBe(true);
      }
    });

    it('rejects non-integer issueNumber', () => {
      const invalidSubmission = {
        formData: validFormData,
        isUpdate: true,
        issueNumber: 123.45,
      };

      const result = wishlistSubmissionSchema.safeParse(invalidSubmission);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(e => e.path.includes('issueNumber'))).toBe(true);
      }
    });
  });

  describe('formatZodError', () => {
    it('formats validation error correctly', () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const result = schema.safeParse({ email: 'not-an-email' });
      expect(result.success).toBe(false);

      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted).toHaveProperty('error');
        expect(formatted).toHaveProperty('details');
        expect(formatted).toHaveProperty('field');
        expect(formatted).toHaveProperty('allErrors');
        expect(formatted.field).toBe('email');
        expect(Array.isArray(formatted.allErrors)).toBe(true);
      }
    });

    it('includes all error details in allErrors', () => {
      const schema = z.object({
        email: z.string().email(),
        name: z.string().min(1),
      });

      const result = schema.safeParse({ email: 'not-an-email', name: '' });
      expect(result.success).toBe(false);

      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted.allErrors.length).toBeGreaterThan(1);
        expect(formatted.allErrors.some(e => e.field === 'email')).toBe(true);
        expect(formatted.allErrors.some(e => e.field === 'name')).toBe(true);
      }
    });
  });
});
