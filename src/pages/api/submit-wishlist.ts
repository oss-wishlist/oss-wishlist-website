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

    // If we have form data, create issue body using the structured issue form format
    let finalIssueBody = issueBody;
    if (formData) {
      // Separate services and resources
      const services: string[] = [];
      const resources: string[] = [];
      
      for (const item of formData.services) {
        // Check if it's a resource (hosting, infrastructure, etc.)
        if (item.toLowerCase().includes('hosting') || 
            item.toLowerCase().includes('infrastructure') ||
            item.toLowerCase().includes('github copilot')) {
          resources.push(item);
        } else {
          services.push(item);
        }
      }
      
      // Format using issue form structure
      finalIssueBody = formatIssueFormBody({
        project: formData.projectTitle,
        maintainer: formData.maintainer,
        repository: formData.projectUrl,
        urgency: formData.urgency.toLowerCase(),
        projectSize: formData.projectSize,
        services: services,
        resources: resources,
        additionalContext: formData.description + 
          (formData.additionalNotes ? '\n\n' + formData.additionalNotes : ''),
        wantsFundingYml: formData.createFundingPR === true,
        timeline: formData.timeline,
        organizationType: formData.organizationType,
        organizationName: formData.organizationName,
        additionalNotes: formData.additionalNotes,
        technologies: formData.technologies
      });
    }

    // If this is an update, update the issue body AND add a comment
    if (isUpdate && issueNumber) {
      const updateTimestamp = new Date().toISOString();
      
      // First, update the issue body itself
      const updateIssueResponse = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.ORG}/${GITHUB_CONFIG.REPO}/issues/${issueNumber}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'OSS-Wishlist-Bot'
        },
        body: JSON.stringify({
          body: finalIssueBody
        })
      });

      if (!updateIssueResponse.ok) {
        const errorData = await updateIssueResponse.text();
        console.error('GitHub API error updating issue:', updateIssueResponse.status, errorData);
        return jsonError(
          'Failed to update wishlist',
          updateIssueResponse.status === 401 ? 'Authentication failed' : 'GitHub API error',
          updateIssueResponse.status
        );
      }
      
      // Then, add a comment to notify about the update
  const commentBody = `## Wishlist Updated

This wishlist has been updated.

Last Updated: ${updateTimestamp}

Updated via [OSS Wishlist Platform](${import.meta.env.PUBLIC_SITE_URL || 'https://oss-wishlist.com'})`;

      const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.ORG}/${GITHUB_CONFIG.REPO}/issues/${issueNumber}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'OSS-Wishlist-Bot'
        },
        body: JSON.stringify({
          body: commentBody
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('GitHub API error:', response.status, errorData);
        return jsonError(
          'Failed to update wishlist',
          response.status === 401 ? 'Authentication failed' : 'GitHub API error',
          response.status
        );
      }

      const comment = await response.json();
      
      // Fetch the original issue to return its details
      const issueResponse = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.ORG}/${GITHUB_CONFIG.REPO}/issues/${issueNumber}`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'OSS-Wishlist-Bot'
        }
      });

      const issue = await issueResponse.json();
      
      // Cache the updated wishlist and refresh the main cache
      // Cache this specific wishlist
      fetch(`${origin}${basePath}/api/cache-wishlist?issueNumber=${issueNumber}`).catch(() => {});
      
      // Refresh the main cache
      fetch(`${origin}${basePath}/api/wishlists?refresh=true`).catch(() => {});
      
      return jsonSuccess({
        updated: true,
        issue: {
          number: issue.number,
          url: issue.html_url,
          title: issue.title
        },
        comment: {
          id: comment.id,
          url: comment.html_url
        }
      });
    }

    // Create GitHub issue via API
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
    
    // Cache the individual wishlist and refresh the all-wishlists cache
    // Cache this specific wishlist
    fetch(`${origin}${basePath}/api/cache-wishlist?issueNumber=${issue.number}`).catch(() => {});
    
    // Invalidate and refresh the main cache
    fetch(`${origin}${basePath}/api/wishlists?refresh=true`).catch(() => {});
    
    return jsonSuccess({
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