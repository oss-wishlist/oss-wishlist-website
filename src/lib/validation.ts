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
  
  organizationType: z.enum(['individual', 'company', 'nonprofit', 'foundation']).optional(),
  
  organizationName: createOptionalModeratedString(),
  
  timeline: createOptionalModeratedString(),
  
  technologies: z.array(z.string()).optional(),
  
  repositories: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    username: z.string(),
    description: z.string()
  })).optional(),
  
  // Flag to indicate if a FUNDING.yml PR should be created by GitHub Action
  createFundingPR: z.boolean().optional()
});

// Wishlist submission schema
export const wishlistSubmissionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  
  body: z.string().min(1, 'Body is required'),
  
  labels: z.array(z.string()).optional(),
  
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
