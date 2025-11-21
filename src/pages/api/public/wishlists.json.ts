// Public API endpoint for external data consumption (e.g., ecosystem.ms)
// Simple JSON endpoint that serves the cached wishlist data with CORS headers

import type { APIRoute } from 'astro';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const prerender = false;

const CACHE_FILE = join(process.cwd(), 'public', 'wishlist-cache', 'all-wishlists.json');

export const GET: APIRoute = async ({ request }) => {
  try {
    const cacheData = await readFile(CACHE_FILE, 'utf-8');
    const data = JSON.parse(cacheData);
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600', // 10 minutes
      },
    });
  } catch (error) {
    console.error('Error reading wishlist cache:', error);
    
    // If cache doesn't exist, try to populate it by calling the main API
    try {
      const origin = new URL(request.url).origin;
      const basePath = import.meta.env.PUBLIC_BASE_PATH || '/oss-wishlist-website';
      
  // Populate cache from API if local cache missing
      const apiResponse = await fetch(`${origin}${basePath}/api/wishlists?refresh=true`, {
        headers: {
          'User-Agent': 'OSS-Wishlist-Cache-Generator'
        }
      });
      
      if (apiResponse.ok) {
        const wishlists = await apiResponse.json();
        return new Response(JSON.stringify({
          schema_version: '1.0.0',
          generated_by: 'OSS Wishlist Platform',
          data_source: 'GitHub Issues (oss-wishlist/wishlists)',
          wishlists,
          lastUpdated: new Date().toISOString(),
          count: wishlists.length
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=600',
          },
        });
      }
    } catch (fallbackError) {
      console.error('Failed to populate cache:', fallbackError);
    }
    
    return new Response(JSON.stringify({
      error: 'Failed to load wishlist data'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
