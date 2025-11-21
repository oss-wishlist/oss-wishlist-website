import type { APIRoute } from 'astro';
import { GITHUB_CONFIG } from '../../config/github.js';

export const prerender = false;

const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  html_url: string;
  labels: Array<{
    name: string;
  }>;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { repositoryUrls } = await request.json();
    
    if (!Array.isArray(repositoryUrls) || repositoryUrls.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid repository URLs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch all open wishlist issues
    const response = await fetch(
      `${GITHUB_CONFIG.API_ISSUES_URL}?state=open&labels=wishlist&per_page=100`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const issues: GitHubIssue[] = await response.json();
    
    // Create a map of repository URLs to issue URLs
    const existingWishlists: Record<string, { issueUrl: string; issueNumber: number; isApproved: boolean; projectTitle: string }> = {};
    
    for (const issue of issues) {
      // Parse the issue body to extract repository URLs
      const body = issue.body || '';
      
      // Check if issue is approved
      const isApproved = issue.labels.some(label => label.name === 'approved-wishlist');
      
      // Look for repository URLs in multiple formats:
      // 1. Markdown links: [text](url)
      const markdownMatches = body.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g);
      for (const match of markdownMatches) {
        const repoUrl = match[2];
        const normalizedUrl = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
        existingWishlists[normalizedUrl] = {
          issueUrl: issue.html_url,
          issueNumber: issue.number,
          isApproved: isApproved,
          projectTitle: issue.title,
        };
      }
      
      // 2. Plain URLs (like in "### Project Repository URL" section)
      const urlMatches = body.matchAll(/https?:\/\/[^\s\)]+/g);
      for (const match of urlMatches) {
        const repoUrl = match[0];
        // Only process URLs with allowed hosts (GitHub, GitLab, Bitbucket)
        try {
          const parsedUrl = new URL(repoUrl);
          const allowedHosts = ['github.com', 'gitlab.com', 'bitbucket.org'];
          if (allowedHosts.includes(parsedUrl.hostname)) {
            const normalizedUrl = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
            existingWishlists[normalizedUrl] = {
              issueUrl: issue.html_url,
              issueNumber: issue.number,
              isApproved: isApproved,
              projectTitle: issue.title,
            };
          }
        } catch (e) {
          // Ignore invalid URLs
        }
      }
    }
    
    // Check which of the requested repositories have existing wishlists
    const results: Record<string, { exists: boolean; issueUrl?: string; issueNumber?: number; isApproved?: boolean; projectTitle?: string }> = {};
    
    for (const url of repositoryUrls) {
      const normalizedUrl = url.replace(/\.git$/, '').replace(/\/$/, '');
      
      if (existingWishlists[normalizedUrl]) {
        results[url] = {
          exists: true,
          issueUrl: existingWishlists[normalizedUrl].issueUrl,
          issueNumber: existingWishlists[normalizedUrl].issueNumber,
          isApproved: existingWishlists[normalizedUrl].isApproved,
          projectTitle: existingWishlists[normalizedUrl].projectTitle,
        };
      } else {
        results[url] = { exists: false };
      }
    }
    
    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error checking existing wishlists:', error);
    return new Response(JSON.stringify({ error: 'Failed to check existing wishlists' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
