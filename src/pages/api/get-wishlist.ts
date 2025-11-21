import type { APIRoute } from 'astro';
import { getWishlistById } from '../../lib/db.js';

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

    const id = parseInt(issueNumber, 10);
    
    // Fetch wishlist from database
    const wishlist = await getWishlistById(id);
    
    if (!wishlist) {
      return new Response(JSON.stringify({ error: 'Wishlist not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Transform database record to form-compatible format
    const response = {
      id: wishlist.id,
      number: wishlist.id,
      projectTitle: wishlist.project_name,
      description: wishlist.project_description || '',
      wishes: wishlist.wishes || [],
      urgency: wishlist.urgency || 'medium',
      projectSize: wishlist.project_size || 'medium',
      timeline: '', // Legacy field, not stored
      organizationType: wishlist.organization_type || 'single-maintainer',
      organizationName: wishlist.organization_name || '',
      otherOrganizationType: wishlist.other_organization_type || '',
      additionalNotes: wishlist.additional_notes || '',
      technologies: wishlist.technologies || [],
      openToSponsorship: wishlist.open_to_sponsorship || false,
      repositoryUrl: wishlist.repository_url,
      maintainer: wishlist.maintainer_username,
      maintainerEmail: wishlist.maintainer_email || '',
      preferredPractitioner: wishlist.preferred_practitioner || '',
      nomineeName: wishlist.nominee_name || '',
      nomineeEmail: wishlist.nominee_email || '',
      nomineeGithub: wishlist.nominee_github || '',
      labels: [], // Legacy field, all data now in database fields
      wantsFundingYml: wishlist.funding_yml,
      fundingYmlProcessed: wishlist.funding_yml_processed,
    };

    console.log(`[get-wishlist] Returning wishlist data - wishes: ${JSON.stringify(response.wishes)}`);

    return new Response(JSON.stringify(response), {
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
