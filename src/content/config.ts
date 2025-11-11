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

const practitioners = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    title: z.string(),
    company: z.string().optional(),
    bio: z.string(),
    avatar_url: z.string().url().optional(),
    location: z.string().optional(),
  languages: z.array(z.string()).min(1, { message: 'Please specify at least one language spoken.' }),
    
    // Contact & Social
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    github: z.string().optional(),
    github_sponsors: z.string().optional(), // GitHub Sponsors username
    mastodon: z.string().optional(),
    linkedin: z.string().optional(),
    

  // Services offered (must match service slugs)
  services: z.array(z.string()),

  // Availability & Pricing
  availability: z.enum(['available', 'limited', 'unavailable']).default('available'),
  accepts_pro_bono: z.boolean().default(false),
  pro_bono_criteria: z.string().optional(),
  // Pro bono hours available per month (replaces previous contract count)
  pro_bono_hours_per_month: z.number().optional(),
  // Deprecated: kept for backward compatibility with older profiles
  pro_bono_capacity_per_month: z.number().optional(),
    
    // Experience & Credentials
    years_experience: z.number().optional(),
    notable_experience: z.array(z.string()).optional(),
    certifications: z.array(z.string()).optional(),
    
    // Metadata
    verified: z.boolean().default(false),
  }),
});

const guardians = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    type: z.enum(['individual', 'organization', 'foundation', 'company']),
    description: z.string(),
    logo_url: z.string().url().optional(),
    website: z.string().url().optional(),
    location: z.string().optional(),
    
    // Contact Information
    contact_email: z.string().email().optional(),
    github_org: z.string().optional(),
    social_media: z.object({
      twitter: z.string().optional(),
      linkedin: z.string().optional(),
      mastodon: z.string().optional(),
    }).optional(),
    
    // Guardian Focus
    focus_areas: z.array(z.enum([
      'Security Audits',
      'Dependency Management', 
      'Community Health',
      'Project Governance',
      'Sustainability',
      'Ecosystem Support',
      'Critical Infrastructure',
      'Open Source Funding'
    ])),
    supported_ecosystems: z.array(z.string()).optional(), // e.g., ['JavaScript', 'Python', 'Rust']
    
    // Programs & Services
    programs: z.array(z.string()).optional(),
    funding_available: z.boolean().default(false),
    provides_mentorship: z.boolean().default(false),
    provides_infrastructure: z.boolean().default(false),
    
    // Capacity & Scale
    size: z.enum(['individual', 'small-team', 'organization', 'enterprise']).optional(),
    projects_supported: z.number().optional(),
    annual_budget: z.enum(['under-10k', '10k-100k', '100k-1m', '1m-plus', 'undisclosed']).optional(),
    
    // Metadata
    established_date: z.date().optional(),
    featured: z.boolean().default(false),
    verified: z.boolean().default(false),
    tags: z.array(z.string()).optional(),
  }),
});

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

const wishlists = defineCollection({
  type: 'content',
  schema: z.object({
    // Note: 'slug' is auto-generated by Astro from filename, don't include in schema
    id: z.number(), // GitHub issue number
    projectName: z.string(),
    repositoryUrl: z.string().url(),
    maintainerUsername: z.string(),
    maintainerAvatarUrl: z.string().url().optional(),
    issueUrl: z.string().url(),
    approved: z.boolean().default(false),
    wishes: z.array(z.string()).default([]),
    technologies: z.array(z.string()).default([]),
    resources: z.array(z.string()).default([]),
    urgency: z.string().optional(),
    projectSize: z.string().optional(),
    additionalNotes: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

export const collections = {
  services,
  practitioners,
  guardians,
  faq,
  pages,
  campaigns,
  wishlists,
  'playbooks-external': playbooksExternal,
};