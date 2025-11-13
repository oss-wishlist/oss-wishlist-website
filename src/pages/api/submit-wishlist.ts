// API endpoint to create GitHub issues for wishlists
// 
// Repository configuration is in /src/config/github.ts
//
import type { APIRoute } from 'astro';
import { GITHUB_CONFIG } from '../../config/github.js';
import { wishlistSubmissionSchema, formatZodError } from '../../lib/validation.js';
import { jsonSuccess, jsonError, ApiErrors } from '../../lib/api-response.js';
import { formatIssueFormBody } from '../../lib/issue-form-parser.js';
import { withBaseUrl } from '../../lib/paths.js';
import { writeWishlistMarkdown } from '../../lib/wishlist-markdown.js';
import { generateWishlistSlug } from '../../lib/slugify.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return ApiErrors.invalidJson();
    }
    
    // Validate request body with Zod schema (includes content moderation)
    const validationResult = wishlistSubmissionSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.warn('Validation failed:', validationResult.error);
      const errorDetails = formatZodError(validationResult.error);
      return ApiErrors.validationFailed(
        errorDetails.details, 
        errorDetails.field, 
        errorDetails.allErrors
      );
    }
    
  const { title, body: issueBody, labels, formData, isUpdate, issueNumber } = validationResult.data;

    // Get origin and basePath for URLs
    const origin = new URL(request.url).origin;
    const basePath = import.meta.env.BASE_URL || '';

    // Add 'funding-yml-requested' label if user wants FUNDING.yml PR
    let finalLabels = labels || ['wishlist'];
    if (formData?.createFundingPR === true) {
      finalLabels.push('funding-yml-requested');
    }
    // Include size label if provided
    if (formData?.projectSize) {
      finalLabels.push(`size:${formData.projectSize}`);
    }

    // Get GitHub token from environment
    const githubToken = import.meta.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.error('GitHub token not found in environment variables');
      return ApiErrors.serverError('Server configuration error');
    }

    // Create MINIMAL issue body - the markdown file is the source of truth
    // GitHub issue is just a pointer for triage/approval workflow
    let finalIssueBody = issueBody;
    if (formData) {
      const slug = generateWishlistSlug(formData.projectUrl, issueNumber || 0);
      const wishlistUrl = `${origin}${basePath}/wishlists/${slug}`;
      
      finalIssueBody = `### Project Name
${formData.projectTitle}

### Repository
${formData.projectUrl}

### Wishlist Details
View complete wishlist: ${isUpdate && issueNumber ? wishlistUrl.replace('/0', `/${issueNumber}`) : '(will be available after approval)'}

---
**Note**: This issue is a pointer for triage/approval only. The complete wishlist data is stored in the website's content collections.

<!-- Metadata for JSON ingestors -->
\`\`\`json
{
  "project_name_id": "${slug}",
  "issue_number": ${issueNumber || 'TBD'},
  "created_at": "${new Date().toISOString()}"
}
\`\`\``;
    }

    // If this is an update, add a minimal comment
    // The markdown file is the source of truth, not the issue comments
    if (isUpdate && issueNumber) {
      const slug = generateWishlistSlug(formData.projectUrl, issueNumber);
      const wishlistUrl = `${origin}${basePath}/wishlists/${slug}`;
      
      const updateComment = `## Wishlist Updated

**Updated:** ${new Date().toISOString()}

View complete updated wishlist: ${wishlistUrl}`;

      const commentResponse = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.ORG}/${GITHUB_CONFIG.REPO}/issues/${issueNumber}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'OSS-Wishlist-Bot'
        },
        body: JSON.stringify({
          body: updateComment
        })
      });

      if (!commentResponse.ok) {
        const errorData = await commentResponse.text();
        console.error('GitHub API error:', commentResponse.status, errorData);
        return jsonError(
          'Failed to update wishlist',
          commentResponse.status === 401 ? 'Authentication failed' : 'GitHub API error',
          commentResponse.status
        );
      }

      // Fetch the issue to get full details
      const issueResponse = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.ORG}/${GITHUB_CONFIG.REPO}/issues/${issueNumber}`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'OSS-Wishlist-Bot'
        }
      });

      const issue = await issueResponse.json();
      
      // For edits, we need to preserve the original maintainer username and approved status
      // Don't use formData.maintainer as it might be wrong - read from existing markdown
      // CRITICAL: Don't overwrite 'approved' - it's manually set via PR, not via website
      let maintainerUsername = formData.maintainer;
      let approvedStatus = false; // Default for new wishlists
      try {
        const { getCollection } = await import('astro:content');
        const wishlists = await getCollection('wishlists');
        const existing = wishlists.find(w => w.data.id === issueNumber);
        if (existing) {
          maintainerUsername = existing.data.maintainerUsername;
          approvedStatus = existing.data.approved; // Preserve existing approved status
          console.log('[submit-wishlist] Preserving original maintainer:', maintainerUsername);
          console.log('[submit-wishlist] Preserving approved status:', approvedStatus);
        }
      } catch (err) {
        console.warn('[submit-wishlist] Could not read existing wishlist, using formData maintainer');
      }
      
      // Update markdown file for edited wishlist with complete data
      try {
        await writeWishlistMarkdown({
          slug,
          id: issueNumber,
          projectName: formData.projectTitle,
          repositoryUrl: formData.projectUrl,
          maintainerUsername, // Use preserved maintainer
          maintainerAvatarUrl: undefined, // Will be populated by GitHub Action if needed
          issueUrl: issue.html_url,
          approved: approvedStatus, // Use preserved approved status, NOT from issue labels
          wishes: formData.services,
          technologies: formData.technologies || [],
          resources: [],
          urgency: formData.urgency,
          projectSize: formData.projectSize,
          additionalNotes: formData.additionalNotes,
          createdAt: issue.created_at,
          updatedAt: new Date().toISOString(),
        });
        console.log('[submit-wishlist] ✓ Updated markdown file for wishlist #' + issueNumber + ' (slug: ' + slug + ')');
      } catch (mdError) {
        console.error('[submit-wishlist] ✗ Failed to update markdown file:', mdError);
        // Don't fail the request if markdown update fails
      }
      
      // Invalidate in-memory cache (legacy endpoints still use this)
      try {
        await fetch(`${origin}${basePath}/api/cache-invalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cacheKey: 'wishlists_full_cache' })
        });
        await fetch(`${origin}${basePath}/api/cache-invalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cacheKey: 'user_wishlists_full_cache' })
        });
        console.log('[submit-wishlist] In-memory cache invalidated for update');
      } catch (err) {
        console.warn('[submit-wishlist] Failed to invalidate cache:', err);
      }
      
      return jsonSuccess({
        updated: true, // Flag to indicate this was an update
        wishlist: {
          id: issueNumber,
          projectName: formData.projectTitle,
          slug,
          issueUrl: issue.html_url,
        },
        issue: {
          number: issue.number,
          url: issue.html_url,
          title: issue.title
        }
      });
    }

    // Create new GitHub issue via API
    // First, get the latest issue number to predict the next one
    let nextIssueNumber: number | null = null;
    try {
      const latestIssueResponse = await fetch(`${GITHUB_CONFIG.API_ISSUES_URL}?per_page=1&state=all&sort=created&direction=desc`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'OSS-Wishlist-Bot'
        }
      });
      
      if (latestIssueResponse.ok) {
        const latestIssues = await latestIssueResponse.json();
        if (latestIssues.length > 0) {
          nextIssueNumber = latestIssues[0].number + 1;
        }
      }
    } catch (error) {
      console.warn('Could not fetch latest issue number:', error);
    }
    
    // Add fulfillment link to the issue body if we have a predicted issue number
    if (nextIssueNumber) {
      const fulfillUrl = withBaseUrl(`fulfill?issue=${nextIssueNumber}`, origin);
      finalIssueBody += `\n\n---\n\nFulfill this wishlist: ${fulfillUrl}`;
    }
    
    const response = await fetch(GITHUB_CONFIG.API_ISSUES_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'OSS-Wishlist-Bot'
      },
      body: JSON.stringify({
        title,
        body: finalIssueBody,
        labels: finalLabels
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('GitHub API error:', response.status, errorData);
      return jsonError(
        'Failed to create GitHub issue',
        response.status === 401 ? 'Authentication failed' : 'GitHub API error',
        response.status
      );
    }

    const issue = await response.json();
    
    // Generate slug for markdown filename (based on immutable repo URL, not editable title)
    const slug = generateWishlistSlug(formData.projectUrl, issue.number);
    
    // Write markdown file for new wishlist with complete data
    try {
      await writeWishlistMarkdown({
        slug,
        id: issue.number,
        projectName: formData.projectTitle,
        repositoryUrl: formData.projectUrl,
        maintainerUsername: formData.maintainer,
        maintainerAvatarUrl: undefined, // Will be populated by GitHub Action if needed
        issueUrl: issue.html_url,
        approved: false, // New wishlists start as unapproved
        wishes: formData.services, // Array of service slugs
        technologies: formData.technologies || [],
        resources: [], // Not collected in form currently
        urgency: formData.urgency,
        projectSize: formData.projectSize,
        additionalNotes: formData.additionalNotes,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
      });
      console.log('[submit-wishlist] ✓ Created markdown file for wishlist #' + issue.number + ' (slug: ' + slug + ')');
    } catch (mdError) {
      console.error('[submit-wishlist] ✗ Failed to create markdown file:', mdError);
      // Don't fail the request if markdown creation fails
    }
    
    // Invalidate in-memory cache (legacy endpoints still use this)
    try {
      await fetch(`${origin}${basePath}/api/cache-invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheKey: 'wishlists_full_cache' })
      });
      await fetch(`${origin}${basePath}/api/cache-invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheKey: 'user_wishlists_full_cache' })
      });
      console.log('[submit-wishlist] In-memory cache invalidated for new wishlist creation');
    } catch (err) {
      console.warn('[submit-wishlist] Failed to invalidate cache after creation:', err);
    }

    return jsonSuccess({
      wishlist: {
        id: issue.number,
        projectName: formData.projectTitle,
        slug,
        issueUrl: issue.html_url,
      },
      issue: {
        number: issue.number,
        url: issue.html_url,
        title: issue.title
      }
    });

  } catch (error) {
    console.error('Error creating wishlist issue:', error);
    return ApiErrors.serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
};