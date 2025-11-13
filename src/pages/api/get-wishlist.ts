import type { APIRoute } from 'astro';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { GITHUB_CONFIG } from '../../config/github.js';
import { parseIssueForm } from '../../lib/issue-form-parser.js';

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

    // Helper to fetch full details from GitHub and parse the issue form
    const fetchFromGitHub = async (): Promise<any | null> => {
      try {
        const token = import.meta.env.GITHUB_TOKEN as string | undefined;
        const headers: Record<string, string> = {
          'Accept': 'application/vnd.github.v3+json',
        };
        if (token) headers['Authorization'] = `token ${token}`;

        // Fetch issue to get labels and metadata
        const issueResp = await fetch(`${GITHUB_CONFIG.API_ISSUES_URL}/${issueNumber}`, { headers });

        if (!issueResp.ok) {
          console.log(`[get-wishlist] GitHub issue fetch failed with status ${issueResp.status}`);
          return null;
        }

        const issue = await issueResp.json();
        
        console.log(`[get-wishlist] Issue #${issueNumber} fetched from GitHub`);
        
        // Extract labels from the issue
        const labels = Array.isArray(issue.labels) 
          ? issue.labels.map((l: any) => typeof l === 'string' ? l : l.name).filter(Boolean)
          : [];

        // Try to read from content collections first (source of truth)
        let wishlistData = null;
        try {
          const { getCollection } = await import('astro:content');
          const wishlists = await getCollection('wishlists');
          const wishlist = wishlists.find(w => w.data.id === parseInt(issueNumber, 10));
          
          if (wishlist) {
            console.log(`[get-wishlist] Found wishlist in content collections`);
            wishlistData = {
              id: wishlist.data.id,
              number: wishlist.data.id,
              projectTitle: wishlist.data.projectName,
              wishes: wishlist.data.wishes || [],
              urgency: wishlist.data.urgency || 'medium',
              projectSize: wishlist.data.projectSize || 'medium',
              additionalNotes: wishlist.data.additionalNotes || '',
              technologies: wishlist.data.technologies || [],
              repositoryUrl: wishlist.data.repositoryUrl,
              maintainer: wishlist.data.maintainerUsername,
              labels: labels,
              wantsFundingYml: labels.includes('funding-yml-requested'),
              fundingYmlProcessed: labels.includes('funding-yml-processed'),
              // Fields we don't have in markdown but need for form
              timeline: '',
              organizationType: 'single-maintainer',
              organizationName: '',
              otherOrganizationType: '',
              openToSponsorship: false,
              preferredPractitioner: '',
              nomineeName: '',
              nomineeEmail: '',
              nomineeGithub: '',
            };
          }
        } catch (err) {
          console.warn('[get-wishlist] Could not read from content collections:', err);
        }

        // If we have markdown data, use it
        if (wishlistData) {
          console.log(`[get-wishlist] Returning data from content collections - wishes: ${JSON.stringify(wishlistData.wishes)}`);
          return wishlistData;
        }

        // Fallback: parse issue body (for old format or if markdown doesn't exist)
        const parsed = parseIssueForm(issue.body || '');
        console.log(`[get-wishlist] Fallback: parsed body - project: "${parsed.project}", services: ${JSON.stringify(parsed.services)}`);

        const payload = {
          id: issue.number,
          number: issue.number,
          projectTitle: parsed.project || issue.title || '',
          wishes: parsed.services || [],
          urgency: parsed.urgency || 'medium',
          projectSize: parsed.projectSize || 'medium',
          timeline: parsed.timeline || '',
          organizationType: parsed.organizationType || 'single-maintainer',
          organizationName: parsed.organizationName || '',
          otherOrganizationType: parsed.otherOrganizationType || '',
          additionalNotes: parsed.additionalNotes || parsed.additionalContext || '',
          technologies: parsed.technologies || [],
          openToSponsorship: !!parsed.openToSponsorship,
          repositoryUrl: parsed.repository || '',
          maintainer: parsed.maintainer || (issue.user?.login ?? ''),
          preferredPractitioner: parsed.preferredPractitioner || '',
          nomineeName: parsed.nomineeName || '',
          nomineeEmail: parsed.nomineeEmail || '',
          nomineeGithub: parsed.nomineeGithub || '',
          labels: labels,
          wantsFundingYml: labels.includes('funding-yml-requested'),
          fundingYmlProcessed: labels.includes('funding-yml-processed')
        };
        
        console.log(`[get-wishlist] Final payload - wishes: ${JSON.stringify(payload.wishes)}`);

        return payload;
      } catch {
        return null;
      }
    };

    // Always fetch from GitHub for edit operations to ensure we have full data
    const githubData = await fetchFromGitHub();
    if (githubData) {
      console.log(`[get-wishlist] Returning GitHub data for issue #${issueNumber}`);
      return new Response(JSON.stringify(githubData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If GitHub fetch fails, try master cache as fallback
    console.log(`[get-wishlist] GitHub fetch failed, trying cache fallback for issue #${issueNumber}`);
    const wishlist = await loadFromMaster();
    if (!wishlist) {
      return new Response(JSON.stringify({ error: 'Wishlist not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure minimum required fields are present in cache data
    const payload = {
      id: wishlist.id || wishlist.number,
      number: wishlist.number || wishlist.id,
      projectTitle: wishlist.projectTitle || wishlist.project || wishlist.title || '',
      wishes: wishlist.wishes || [],
      technologies: wishlist.technologies || [],
      urgency: wishlist.urgency || 'medium',
      projectSize: wishlist.projectSize || 'medium',
      timeline: wishlist.timeline || '',
      organizationType: wishlist.organizationType || 'single-maintainer',
      organizationName: wishlist.organizationName || '',
      otherOrganizationType: wishlist.otherOrganizationType || '',
      additionalNotes: wishlist.additionalNotes || '',
      openToSponsorship: wishlist.openToSponsorship || false,
      repositoryUrl: wishlist.repositoryUrl || wishlist.repository || '',
      maintainer: wishlist.maintainer || '',
      labels: wishlist.labels || [],
      wantsFundingYml: wishlist.labels?.includes('funding-yml-requested') || false,
      fundingYmlProcessed: wishlist.labels?.includes('funding-yml-processed') || false
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

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
