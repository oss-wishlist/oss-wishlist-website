import type { APIRoute } from 'astro';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const prerender = false;

export const GET: APIRoute = async ({ url, request }) => {
  try {
    const issueNumber = url.searchParams.get('issueNumber');
    
    if (!issueNumber) {
      return new Response(JSON.stringify({ error: 'Issue number is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Helper to load from master cache and find wishlist by id
    const loadFromMaster = async (): Promise<any | null> => {
      const masterPath = join(process.cwd(), 'public', 'wishlist-cache', 'all-wishlists.json');
      try {
        const fileContent = await readFile(masterPath, 'utf-8');
        const master = JSON.parse(fileContent);
        const list = Array.isArray(master?.wishlists) ? master.wishlists : master; // support raw array fallback
        const id = parseInt(issueNumber, 10);
        const found = Array.isArray(list) ? list.find((w: any) => w.id === id || w.number === id) : null;
        return found || null;
      } catch (e) {
        return null;
      }
    };

    // Try to read from master cache first
    let wishlist = await loadFromMaster();
    if (!wishlist) {
      // Force-refresh the cache via main API, then retry
      try {
        const origin = new URL(request.url).origin;
        const basePath = import.meta.env.PUBLIC_BASE_PATH || '/oss-wishlist-website';
        await fetch(`${origin}${basePath}/api/wishlists?refresh=true`).catch(() => {});
        wishlist = await loadFromMaster();
      } catch {}
    }

    if (!wishlist) {
      return new Response(JSON.stringify({ error: 'Wishlist not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(wishlist), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error in get-wishlist API:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
