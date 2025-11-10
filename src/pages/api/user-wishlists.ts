// API endpoint to fetch all wishlists (approved and pending) for a specific user
// This allows authenticated users to see both their approved and pending wishlists
//
import type { APIRoute } from 'astro';
import { GITHUB_CONFIG } from '../../config/github.js';
import { parseIssueForm } from '../../lib/issue-form-parser.js';

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  html_url: string;
  state: string;
  labels: Array<{
    name: string;
    color: string;
  }>;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
}

export const prerender = false;

const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;

async function fetchUserWishlists(username: string): Promise<any[]> {
  try {
    // Fetch ALL open issues (not filtered by approved-wishlist)
    const response = await fetch(
      `${GITHUB_CONFIG.API_ISSUES_URL}?state=open&per_page=100`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.status}`);
    }

    const issues: GitHubIssue[] = await response.json();

    // Parse each issue and add approval status
    const wishlists = await Promise.all(
      issues
        .filter((issue: GitHubIssue) => {
          // Only include issues with the 'wishlist' label
          return issue.labels.some(label => label.name === 'wishlist');
        })
        .map(async (issue: GitHubIssue) => {
          try {
            // Parse the original issue body
            const parsed = parseIssueForm(issue.body || '');
            
            // Fetch comments to check for latest update
            let updatedData = null;
            try {
              const commentsResp = await fetch(
                `${GITHUB_CONFIG.API_ISSUES_URL}/${issue.number}/comments`,
                {
                  headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                  },
                }
              );
              
              if (commentsResp.ok) {
                const comments = await commentsResp.json();
                // Find and parse the latest wishlist update comment
                const latestUpdateComment = Array.isArray(comments)
                  ? comments
                      .reverse()
                      .find((c: any) => c.body && c.body.includes('## Wishlist Updated'))
                  : null;
                
                if (latestUpdateComment) {
                  updatedData = parseIssueForm(latestUpdateComment.body);
                }
              }
            } catch {
              // If comment fetch fails, just use original data
            }

            const isApproved = issue.labels.some(label => label.name === 'approved-wishlist');
            
            // Merge data, preferring updated data if available
            return {
              project: updatedData?.project || parsed.project || issue.title || '',
              services: updatedData?.services || parsed.services || [],
              urgency: updatedData?.urgency || parsed.urgency || 'medium',
              projectSize: updatedData?.projectSize || parsed.projectSize || 'medium',
              timeline: updatedData?.timeline || parsed.timeline || '',
              organizationType: updatedData?.organizationType || parsed.organizationType || 'single-maintainer',
              organizationName: updatedData?.organizationName || parsed.organizationName || '',
              otherOrganizationType: updatedData?.otherOrganizationType || parsed.otherOrganizationType || '',
              additionalNotes: updatedData?.additionalNotes || parsed.additionalNotes || parsed.additionalContext || '',
              technologies: updatedData?.technologies || parsed.technologies || [],
              openToSponsorship: updatedData?.openToSponsorship || !!parsed.openToSponsorship,
              repository: updatedData?.repository || parsed.repository || '',
              maintainer: updatedData?.maintainer || parsed.maintainer || '',
              id: issue.number,
              approvalStatus: isApproved ? 'approved' : 'pending',
              issueUrl: issue.html_url,
              createdAt: issue.created_at,
              updatedAt: issue.updated_at,
            };
          } catch (e) {
            return null;
          }
        })
    );

    // Filter out nulls and filter by username
    const filtered = wishlists
      .filter((w): w is NonNullable<typeof w> => w !== null && w.maintainer === username);

    // Sort: approved first, then pending
    filtered.sort((a, b) => {
      if (a.approvalStatus === 'approved' && b.approvalStatus === 'pending') return -1;
      if (a.approvalStatus === 'pending' && b.approvalStatus === 'approved') return 1;
      return 0;
    });

    return filtered;
  } catch (error) {
    console.error('Error fetching user wishlists:', error);
    throw error;
  }
}

export const GET: APIRoute = async ({ url }) => {
  try {
    if (!GITHUB_TOKEN) {
      return new Response(JSON.stringify({ error: 'GitHub token not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const username = url.searchParams.get('username');
    if (!username) {
      return new Response(
        JSON.stringify({ error: 'Missing username parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const wishlists = await fetchUserWishlists(username);

    return new Response(JSON.stringify({ wishlists }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('User wishlists API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch user wishlists',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
