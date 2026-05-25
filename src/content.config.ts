import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
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
    impact: z.string().optional(),
    playbook: z.string().optional(),
    playbooks: z.array(z.string()).optional(),
    pricing: z.object({
      small: z.number().nullable().optional(),
      medium: z.number().nullable().optional(),
      large: z.number().nullable().optional(),
    }).optional(),
  }),
});

const faq = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/faq' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    order: z.number().optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.date().optional(),
  }),
});

const playbooksExternal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/playbooks-external' }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    service: z.string().optional(),
    github_folder: z.string().optional(),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    url: z.string().url(),
    featured: z.boolean().default(true),
    thumbnail: z.string().default('/images/wish.jpg'),
    buttonText: z.string().default('Register for Event'),
  }),
});

export const collections = {
  services,
  faq,
  pages,
  events,
  'playbooks-external': playbooksExternal,
};
