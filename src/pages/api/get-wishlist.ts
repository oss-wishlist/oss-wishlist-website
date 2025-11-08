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

        // Fetch issue and its comments
        const [issueResp, commentsResp] = await Promise.all([
          fetch(`${GITHUB_CONFIG.API_ISSUES_URL}/${issueNumber}`, { headers }),
          fetch(`${GITHUB_CONFIG.API_ISSUES_URL}/${issueNumber}/comments`, { headers })
        ]);

        if (!issueResp.ok) {
          return null;
        }

        const issue = await issueResp.json();
        const comments = commentsResp.ok ? await commentsResp.json() : [];
        // Parse issue body
        const parsed = parseIssueForm(issue.body || '');
        console.log('Parsed from issue body:', { technologies: parsed.technologies });
        
        // Find and parse the latest wishlist update comment
        const latestUpdateComment = Array.isArray(comments) 
          ? comments
              .reverse()
              .find(c => c.body && c.body.includes('## Wishlist Updated'))
          : null;
              
        // If we have an update comment, parse it and merge with initial data
        const updatedData = latestUpdateComment 
          ? parseIssueForm(latestUpdateComment.body)
          : null;
        
        console.log('Parsed from update comment:', { 
          hasUpdate: !!latestUpdateComment,
          technologies: updatedData?.technologies 
        });

        // Extract labels from the issue
        const labels = Array.isArray(issue.labels) 
          ? issue.labels.map((l: any) => typeof l === 'string' ? l : l.name).filter(Boolean)
          : [];

        // Map to the structure expected by WishlistForms.loadExistingWishlistData
        // Merge the data, preferring the update comment data if available
        const payload = {
          id: issue.number,
          number: issue.number,
          projectTitle: updatedData?.project || parsed.project || issue.title || '',
          wishes: updatedData?.services || parsed.services || [],
          urgency: updatedData?.urgency || parsed.urgency || 'medium',
          projectSize: updatedData?.projectSize || parsed.projectSize || 'medium',
          timeline: updatedData?.timeline || parsed.timeline || '',
          organizationType: updatedData?.organizationType || parsed.organizationType || 'single-maintainer',
          organizationName: updatedData?.organizationName || parsed.organizationName || '',
          otherOrganizationType: updatedData?.otherOrganizationType || parsed.otherOrganizationType || '',
          additionalNotes: updatedData?.additionalNotes || parsed.additionalNotes || parsed.additionalContext || '',
          technologies: updatedData?.technologies || parsed.technologies || [],
          openToSponsorship: updatedData?.openToSponsorship || !!parsed.openToSponsorship,
          repositoryUrl: updatedData?.repository || parsed.repository || '',
          maintainer: updatedData?.maintainer || parsed.maintainer || (issue.user?.login ?? ''),
          preferredPractitioner: updatedData?.preferredPractitioner || parsed.preferredPractitioner || '',
          nomineeName: updatedData?.nomineeName || parsed.nomineeName || '',
          nomineeEmail: updatedData?.nomineeEmail || parsed.nomineeEmail || '',
          nomineeGithub: updatedData?.nomineeGithub || parsed.nomineeGithub || '',
          labels: labels, // Include labels for checking funding-yml status
          wantsFundingYml: labels.includes('funding-yml-requested'),
          fundingYmlProcessed: labels.includes('funding-yml-processed')
        };

        return payload;
      } catch {
        return null;
      }
    };

    // Always fetch from GitHub for edit operations to ensure we have full data
    const githubData = await fetchFromGitHub();
    if (githubData) {
      return new Response(JSON.stringify(githubData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If GitHub fetch fails, try master cache as fallback
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

    // Log the final data being sent
    console.log('API sending wishlist data:', {
      id: wishlist.id,
      number: wishlist.number,
      projectTitle: wishlist.projectTitle,
      title: wishlist.title,
      project: wishlist.project
    });

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
