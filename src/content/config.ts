import { defineCollection, z } from 'astro:content';

const services = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    type: z.enum(['service', 'resource']).default('service'),
    target_audience: z.enum(['maintainer', 'company', 'both']).optional(),
    service_type: z.enum([
      'one-time',
      'ongoing', 
      'workshop',
      'consulting',
      'audit',
      'training',
      'support',
      'credit',
      'budget',
      'hosting',
      'tool'
    ]),
    available: z.boolean().default(true),
    unavailable_reason: z.string().optional(),
  // Impact statement for sponsors – short, concrete motivation
  impact: z.string().optional(),
    // Link to playbook folder(s) in the playbooks-external collection
    // Example: playbook: 'funding-strategy' maps to 'playbooks-external/funding-strategy/playbook.md'
    playbook: z.string().optional(),
    playbooks: z.array(z.string()).optional(),
    // Pricing by project size
    pricing: z.object({
      small: z.number().nullable().optional(),
      medium: z.number().nullable().optional(),
      large: z.number().nullable().optional(),
    }).optional(),
  }),
});

// NOTE: practitioners, guardians, and wishlists collections removed
// They are now database-backed (see src/lib/db.ts)

const faq = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    order: z.number().optional(),
  }),
});

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.date().optional(),
  }),
});

const playbooksExternal = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
});

// Ecosystem Guardians (sponsors/organizations supporting OSS sustainability)
const guardians = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    description: z.string(),
    website: z.string().url().optional(),
    logo_url: z.string().url().optional(),
    contact_email: z.string().email().optional(),
    sponsorship_level: z.enum(['platinum', 'gold', 'silver', 'bronze']).optional(),
    active: z.boolean().default(true),
  }),
});

// Community Campaigns (e.g., ecosystem-wide initiatives like "Python Foundation")
const campaigns = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    organization: z.string().optional(),
    website: z.string().url().optional(),
    contact_email: z.string().email().optional(),
    goals: z.array(z.string()).optional(),
    status: z.enum(['active', 'paused', 'completed', 'archived']).default('active'),
    start_date: z.date().optional(),
    end_date: z.date().optional(),
    banner_image_url: z.string().url().optional(),
    tags: z.array(z.string()).optional(),
    featured: z.boolean().default(false),
  }),
});

export const collections = {
  services,
  faq,
  pages,
  campaigns,
  guardians,
  'playbooks-external': playbooksExternal,
};