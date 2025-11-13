import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://oss-wish-list.github.io',
  base: process.env.PUBLIC_BASE_PATH || '/',
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
  integrations: [tailwind(), react()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark'
    }
  }
});