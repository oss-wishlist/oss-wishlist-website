import type { APIRoute } from 'astro';
import { getWishlistById } from '../../lib/db.js';
import { GITHUB_CONFIG } from '../../config/github.js';

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
      console.log(`[get-wishlist] Wishlist #${issueNumber} not found in database`);
      return new Response(JSON.stringify({ error: 'Wishlist not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[get-wishlist] Wishlist #${issueNumber} fetched from database`);

    // Fetch GitHub issue for labels (funding-yml status)
    let labels: string[] = [];
    try {
      const token = import.meta.env.GITHUB_TOKEN as string | undefined;
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
      };
      if (token) headers['Authorization'] = `token ${token}`;

      const issueResp = await fetch(`${GITHUB_CONFIG.API_ISSUES_URL}/${issueNumber}`, { headers });
      if (issueResp.ok) {
        const issue = await issueResp.json();
        labels = Array.isArray(issue.labels) 
          ? issue.labels.map((l: any) => typeof l === 'string' ? l : l.name).filter(Boolean)
          : [];
      }
    } catch (err) {
      console.warn(`[get-wishlist] Could not fetch GitHub labels:`, err);
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
      maintainerEmail: wishlist.maintainer_email || '', // Include for edit form
      preferredPractitioner: wishlist.preferred_practitioner || '',
      nomineeName: wishlist.nominee_name || '',
      nomineeEmail: wishlist.nominee_email || '',
      nomineeGithub: wishlist.nominee_github || '',
      labels: labels,
      wantsFundingYml: labels.includes('funding-yml-requested'),
      fundingYmlProcessed: labels.includes('funding-yml-processed'),
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
