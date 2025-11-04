// API endpoint to fetch wishlists from GitHub issues
// 
// Repository configuration is in /src/config/github.ts
//
import type { APIRoute } from 'astro';
import { GITHUB_CONFIG } from '../../config/github.js';
import { parseIssueForm } from '../../lib/issue-form-parser.js';
import { getBasePath } from '../../lib/paths.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const prerender = false;

const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;
const CACHE_FILE = join(process.cwd(), 'public', 'wishlist-cache', 'all-wishlists.json');

// Cache configuration - for in-memory cache as fallback
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
let cachedWishlists: any = null;
let cacheTimestamp = 0;

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

interface ProjectItem {
  id: string;
  content: {
    number: number;
  };
  fieldValues: {
    nodes: Array<{
      field: {
        name: string;
      };
      name?: string;
      text?: string;
    }>;
  };
}

async function fetchGitHubIssues(): Promise<GitHubIssue[]> {
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
    const errorBody = await response.text();
    console.error(`GitHub API error response:`, errorBody);
    throw new Error(`GitHub API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  
  // Filter to only approved wishlists
  const approvedWishlists = data.filter((issue: GitHubIssue) => 
    issue.labels.some(label => label.name === 'approved-wishlist')
  );
  
  return approvedWishlists;
}

export const GET: APIRoute = async ({ url }) => {
  try {
    if (!GITHUB_TOKEN) {
      console.error('ERROR: GitHub token not configured');
      return new Response(JSON.stringify({ error: 'GitHub token not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check for refresh parameter to bypass cache
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // Try to load from file cache first (instant!) unless forcing refresh
    if (!forceRefresh) {
      try {
        const cacheData = await readFile(CACHE_FILE, 'utf-8');
        const cached = JSON.parse(cacheData);
        const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
        
        // Use file cache if less than 10 minutes old
        if (cacheAge < CACHE_DURATION) {
          return new Response(JSON.stringify(cached.wishlists), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              'X-Cache': 'FILE-HIT',
              'X-Cache-Age': Math.round(cacheAge / 1000).toString(),
              'Cache-Control': 'public, max-age=600'
            },
          });
        }
      } catch (error) {
        // No file cache available, will fetch from GitHub
      }
    }

    // Check if we have valid in-memory cached data (unless forcing refresh)
    const now = Date.now();
    if (!forceRefresh && cachedWishlists && (now - cacheTimestamp) < CACHE_DURATION) {
      return new Response(JSON.stringify(cachedWishlists), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'X-Cache': 'MEMORY-HIT',
          'Cache-Control': 'public, max-age=600'
        },
      });
    }

    // Fetch issues with timeout (5 seconds)
    const issuesPromise = Promise.race([
      fetchGitHubIssues(),
      new Promise<GitHubIssue[]>((_, reject) => {
        setTimeout(() => reject(new Error('GitHub Issues API timeout after 5s')), 5000);
      })
    ]);
    
    const issues = await issuesPromise;

    const wishlists = issues.map(issue => {
      // Use the new issue form parser
      const parsed = parseIssueForm(issue.body);
      const status = 'Open'; // Default status since we're not reading from project board
      
      // Get base path for constructing wishlist URLs
      const basePath = getBasePath();
      const wishlistUrl = `${basePath}wishlist/${issue.number}`;
      
      // Use the maintainer from the parsed form (authenticated user who created the wishlist)
      // not issue.user which is the bot account
      const maintainerUsername = parsed.maintainer || issue.user.login;
      const maintainerAvatarUrl = `https://github.com/${maintainerUsername}.png`;
      
      // Debug: Log when we're falling back to bot user
      if (!parsed.maintainer) {
        console.log(`Issue #${issue.number}: No maintainer in parsed form, falling back to ${issue.user.login}`);
      }
      
      // Return minimal public data only
      return {
        id: issue.number,
        projectName: parsed.project || issue.title,
        repositoryUrl: parsed.repository,
        wishlistUrl: wishlistUrl,
        maintainerUsername: maintainerUsername,
        maintainerAvatarUrl: maintainerAvatarUrl,
        status,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      };
    });

    // Update in-memory cache
    cachedWishlists = wishlists;
    cacheTimestamp = now;

    // Update file cache in background (don't wait for it)
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4324';
    const basePath = import.meta.env.PUBLIC_BASE_PATH || '/oss-wishlist-website';
    fetch(`${siteUrl}${basePath}/api/cache-wishlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wishlists }),
    }).catch(() => {});

    return new Response(JSON.stringify(wishlists), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=600'
      },
    });
  } catch (error) {
    console.error('Error fetching wishlists:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch wishlists',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};