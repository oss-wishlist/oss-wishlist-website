/**
 * Alias endpoint for get-wishlist.ts
 * Provides /api/wishlist?id={id} as alternative to /api/get-wishlist?issueNumber={id}
 */

import type { APIRoute } from 'astro';
import { getWishlistById } from '../../lib/db.js';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    // Accept both 'id' and 'issueNumber' parameters
    const id = url.searchParams.get('id') || url.searchParams.get('issueNumber');
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Wishlist ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const wishlistId = parseInt(id, 10);
    
    if (isNaN(wishlistId)) {
      return new Response(JSON.stringify({ error: 'Invalid wishlist ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch wishlist from database
    const wishlist = await getWishlistById(wishlistId);
    
    if (!wishlist) {
      console.log(`[wishlist] Wishlist #${id} not found in database`);
      return new Response(JSON.stringify({ error: 'Wishlist not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[wishlist] Wishlist #${id} fetched from database`);

    // Return in format expected by fulfill page
    const response = {
      wishlist: {
        id: wishlist.id,
        projectName: wishlist.project_name,
        projectTitle: wishlist.project_name,
        repositoryUrl: wishlist.repository_url,
        maintainer: wishlist.maintainer_username,
        maintainerUsername: wishlist.maintainer_username,
        // Use local logo to avoid cross-site cookie errors with GitHub images
        maintainerAvatarUrl: '/images/oss-wishlist-logo.jpg',
        wishes: wishlist.wishes || [],
        urgency: wishlist.urgency || 'medium',
        projectSize: wishlist.project_size || 'medium',
        technologies: wishlist.technologies || [],
        additionalNotes: wishlist.additional_notes || '',
        openToSponsorship: wishlist.open_to_sponsorship || false,
        preferredPractitioner: wishlist.preferred_practitioner || null,
        nomineeName: wishlist.nominee_name || null,
        nomineeEmail: wishlist.nominee_email || null,
        nomineeGithub: wishlist.nominee_github || null,
        wishlistUrl: wishlist.issue_url,
        approved: wishlist.approved
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
    });
  } catch (err) {
    console.error('[wishlist] Error:', err);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: err instanceof Error ? err.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
