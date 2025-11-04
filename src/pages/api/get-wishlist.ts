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

        const resp = await fetch(`${GITHUB_CONFIG.API_ISSUES_URL}/${issueNumber}`, { headers });
        if (!resp.ok) {
          return null;
        }
        const issue = await resp.json();
        const parsed = parseIssueForm(issue.body || '');

        // Map to the structure expected by WishlistForms.loadExistingWishlistData
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
          nomineeGithub: parsed.nomineeGithub || ''
        };

        return payload;
      } catch {
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

    // If cache exists but doesn't contain detailed fields, fetch from GitHub
    // Detailed fields include 'wishes' (services), 'projectTitle', etc.
    let detailed: any | null = null;
    if (!wishlist || !Array.isArray(wishlist.wishes)) {
      detailed = await fetchFromGitHub();
    }

    if (detailed) {
      return new Response(JSON.stringify(detailed), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
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
