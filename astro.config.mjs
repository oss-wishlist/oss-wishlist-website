import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://oss-wish-list.github.io',
  base: process.env.PUBLIC_BASE_PATH || '/',
  // Wishlists were replaced by /fund and /check. These keep every previously
  // published link working rather than 404ing it.
  redirects: {
    '/wishlists': '/fund',
    '/wishlists/new': '/fund',
    '/wishlists/[...rest]': '/fund',
    '/wishlist/[...rest]': '/fund',
    '/browse-wishlists': '/fund',
    '/create-wishlist': '/fund',
    '/edit-wishlist': '/fund',
    '/wishlist-success': '/fund',
    '/fulfill': '/fund',
    '/fulfill-success': '/fund',
    // The old dependency page asked the same question /check now answers.
    '/dependency-action': '/check',
    // /fund/all was an exhaustive alphabetical list. The point of this site is
    // to show a few things and hand over, not to be a directory.
    '/fund/all': '/fund',
    // Pricing was removed with the rest of the cost content.
    '/pricing': '/catalog',
    // There is no separate community surface; the practitioners are the people.
    '/helpers': '/practitioners',
    '/faq': '/about-us',
    '/code-of-conduct': '/about-us',
    // Orphaned pages from the community framing.
    '/ai-alignment': '/about-us',
    '/ecosystem-guardians': '/catalog',
  },
  i18n: {
    locales: ['en', 'fr', 'es', 'de'],
    defaultLocale: 'en',
    // If a localized page does not exist yet, fall back to English content
    fallback: {
      fr: 'en',
      es: 'en',
      de: 'en',
    },
    // Prefix non-default locales in URLs, keep default without prefix
    routing: {
      prefixDefaultLocale: false,
      // Show the fallback content at the requested locale URL instead of redirecting
      fallbackType: 'rewrite'
    }
  },
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    // Digital Ocean uses PORT env variable, fallback to 4324 for local dev
    port: process.env.PORT ? parseInt(process.env.PORT) : 4324,
    // Use localhost in dev for security, 0.0.0.0 in production for Docker/cloud deployments
    host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'
  },
  vite: {
    server: {
      // Enforce using port 4324 in dev; fail if it's already in use
      port: process.env.PORT ? parseInt(process.env.PORT) : 4324,
      strictPort: true,
    },
    ssr: {
      noExternal: ['@astrojs/react']
    }
  },
  integrations: [
    tailwind(), 
    react(),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark'
    }
  }
});