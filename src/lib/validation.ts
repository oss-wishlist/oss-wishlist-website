// Form validation schemas using Zod (Astro recommended approach)
import { z } from 'zod';
import { moderateContent } from './content-moderation.js';

// Custom Zod refinement for content moderation
const createModeratedString = (minLength?: number, maxLength?: number) =>
  z.string()
    .refine(
      (val) => !minLength || val.length >= minLength,
      { message: `Must be at least ${minLength} characters` }
    )
    .refine(
      (val) => !maxLength || val.length <= maxLength,
      { message: `Must not exceed ${maxLength} characters` }
    )
    .refine(
      (val) => moderateContent(val).isClean,
      (val) => ({ message: moderateContent(val).reason || 'Contains inappropriate content' })
    );

const createOptionalModeratedString = () =>
  z.string().optional().refine(
    (val) => !val || val.trim() === '' || moderateContent(val).isClean,
    (val) => ({ message: val ? (moderateContent(val).reason || 'Contains inappropriate content') : 'Invalid content' })
  );

// Wishlist form data schema
export const wishlistFormDataSchema = z.object({
  projectTitle: createModeratedString(3, 100),
  
  projectUrl: z.string().url('Invalid project URL'),
  
  maintainer: z.string().min(1, 'Maintainer is required'),
  
  services: z
    .array(z.string())
    .min(1, 'At least one service must be selected')
    .max(3, 'You can select up to 3 services'),

  // New: Project size selection for pricing context
  projectSize: z.enum(['small', 'medium', 'large'], {
    errorMap: () => ({ message: 'Project size must be small, medium, or large' })
  }),
  
  urgency: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Urgency must be low, medium, or high' })
  }),
  
  description: createOptionalModeratedString(),
  
  additionalNotes: createOptionalModeratedString(),
  
  timeline: createOptionalModeratedString(),
  
  technologies: z.array(z.string()).optional(),
  
  // Preferred practitioner (single selection, optional)
  preferredPractitioner: z.string().optional(),

  // Nominee details (optional). Maintainer can nominate a practitioner from their community.
  nomineeName: createOptionalModeratedString(),
  nomineeEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  nomineeGithub: z.string()
    .regex(/^https:\/\/github\.com\/[a-zA-Z0-9-]+$/, 'Must be a valid GitHub profile URL (e.g., https://github.com/username)')
    .optional()
    .or(z.literal('')),
  
  repositories: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    username: z.string(),
    description: z.string()
  })).optional(),
  
  // Flag to indicate if a FUNDING.yml PR should be created by GitHub Action
  createFundingPR: z.boolean().optional(),

  // Honorarium/sponsorship opt-in
  openToSponsorship: z.boolean().optional(),
  
  // Project ownership structure
  organizationType: z.enum(['single-maintainer', 'community-team', 'company-team', 'foundation-team', 'other']).optional(),
  organizationName: createOptionalModeratedString(),
  otherOrganizationType: createOptionalModeratedString(),
  
  // Maintainer email (for internal coordination, not saved to public markdown/GitHub)
  maintainerEmail: z.string().email('Invalid email address').optional().or(z.literal(''))
});

// Wishlist submission schema (database-driven, no GitHub Issues)
export const wishlistSubmissionSchema = z.object({
  // Actual form data
  formData: wishlistFormDataSchema,
  
  isUpdate: z.boolean().optional(),
  issueNumber: z.number().int().positive().optional()
}).superRefine((data, ctx) => {
  // If isUpdate is true, issueNumber must be provided
  if (data.isUpdate && !data.issueNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Issue number is required for updates',
      path: ['issueNumber']
    });
  }
});

// Type exports for TypeScript
export type WishlistFormData = z.infer<typeof wishlistFormDataSchema>;
export type WishlistSubmission = z.infer<typeof wishlistSubmissionSchema>;

// Helper function to format Zod errors for API responses
export function formatZodError(error: z.ZodError) {
  const firstError = error.errors[0];
  return {
    error: 'Validation failed',
    details: firstError.message,
    field: firstError.path.join('.'),
    allErrors: error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))
  };
}
