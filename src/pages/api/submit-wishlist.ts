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
import { sendAdminEmail, sendEmail } from '../../lib/mail.js';

export const prerender = false;

/**
 * Format wishlist data for admin email notification
 */
function formatWishlistEmail(formData: any, issueNumber: number, issueUrl: string, isUpdate: boolean): { subject: string; text: string; html: string } {
  const action = isUpdate ? 'Updated' : 'New';
  const subject = `${action} Wishlist: ${formData.projectTitle} (#${issueNumber})`;
  
  const organizationTypeLabels: Record<string, string> = {
    'single-maintainer': 'Single Maintainer',
    'maintainer-team': 'Maintainer Team',
    'foundation-team': 'Foundation/Fiscal Host Team',
    'company-team': 'Company-Backed Team',
    'other': 'Other'
  };
  
  const urgencyLabels: Record<string, string> = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High'
  };
  
  const projectSizeLabels: Record<string, string> = {
    'small': 'Small',
    'medium': 'Medium',
    'large': 'Large'
  };
  
  // Build text version
  const textParts = [
    `${action} Wishlist Submission`,
    '',
    `Wishlist #${issueNumber}`,
    '',
    '=== PROJECT INFORMATION ===',
    `Wishlist URL: ${issueUrl.replace('/issues/', '/wishlists/').replace(/\/\d+$/, '')}`,
    '',
    `Project Name: ${formData.projectTitle}`,
    `Repository: ${formData.projectUrl}`,
    `Maintainer: @${formData.maintainer}`,
    `Project Size: ${projectSizeLabels[formData.projectSize] || formData.projectSize || 'Not specified'}`,
    `Urgency: ${urgencyLabels[formData.urgency] || formData.urgency || 'Not specified'}`,
  ];
  
  if (formData.additionalNotes) {
    textParts.push(`Description: ${formData.additionalNotes}`);
  }
  
  textParts.push('');
  textParts.push('=== MAINTAINER INFORMATION ===');
  textParts.push(`Organization Type: ${organizationTypeLabels[formData.organizationType] || formData.organizationType || 'Not specified'}`);
  
  if (formData.organizationName) {
    textParts.push(`Organization Name: ${formData.organizationName}`);
  }
  if (formData.otherOrganizationType) {
    textParts.push(`Other Organization Type: ${formData.otherOrganizationType}`);
  }
  if (formData.maintainerEmail) {
    textParts.push(`Maintainer Email: ${formData.maintainerEmail}`);
  }
  textParts.push(`Open to Honorarium: ${formData.openToSponsorship ? 'Yes' : 'No'}`);
  
  textParts.push('');
  textParts.push('=== SERVICES REQUESTED ===');
  if (formData.services && formData.services.length > 0) {
    formData.services.forEach((service: string) => {
      textParts.push(`- ${service}`);
    });
  } else {
    textParts.push('None specified');
  }
  
  if (formData.technologies && formData.technologies.length > 0) {
    textParts.push('');
    textParts.push('=== TECHNOLOGIES ===');
    formData.technologies.forEach((tech: string) => {
      textParts.push(`- ${tech}`);
    });
  }
  
  textParts.push('');
  textParts.push('=== HELPER PREFERENCES ===');
  if (formData.preferredPractitioner) {
    textParts.push(`Preferred Helper: ${formData.preferredPractitioner}`);
  } else {
    textParts.push('No preferred helper specified');
  }
  
  if (formData.nomineeName || formData.nomineeEmail || formData.nomineeGithub) {
    textParts.push('');
    textParts.push('NOMINATED COMMUNITY MEMBER:');
    if (formData.nomineeName) {
      textParts.push(`  Name: ${formData.nomineeName}`);
    }
    if (formData.nomineeEmail) {
      textParts.push(`  Email: ${formData.nomineeEmail}`);
    }
    if (formData.nomineeGithub) {
      textParts.push(`  GitHub: @${formData.nomineeGithub}`);
    }
  }
  
  if (formData.additionalNotes) {
    textParts.push('');
    textParts.push('=== ADDITIONAL NOTES ===');
    textParts.push(formData.additionalNotes);
  }
  
  if (formData.createFundingPR) {
    textParts.push('');
    textParts.push('=== FUNDING.yml ===');
    textParts.push('✓ Maintainer requested FUNDING.yml PR');
  }
  
  const text = textParts.join('\n');
  
  // Build HTML version
  const htmlParts = [
    `<h2>${action} Wishlist Submission</h2>`,
    `<p><strong>Wishlist #${issueNumber}</strong></p>`,
    '<h3>Project Information</h3>',
    '<ul>',
    `<li><strong>Project Name:</strong> ${formData.projectTitle}</li>`,
    `<li><strong>Repository:</strong> <a href="${formData.projectUrl}">${formData.projectUrl}</a></li>`,
    `<li><strong>Maintainer:</strong> <a href="https://github.com/${formData.maintainer}">@${formData.maintainer}</a></li>`,
    `<li><strong>Project Size:</strong> ${projectSizeLabels[formData.projectSize] || formData.projectSize || 'Not specified'}</li>`,
    `<li><strong>Urgency:</strong> ${urgencyLabels[formData.urgency] || formData.urgency || 'Not specified'}</li>`,
  ];
  
  if (formData.additionalNotes) {
    htmlParts.push(`<li><strong>Description:</strong> ${formData.additionalNotes.replace(/\n/g, '<br>')}</li>`);
  }
  
  htmlParts.push('</ul>');
  htmlParts.push('<h3>Maintainer Information</h3>');
  htmlParts.push('<ul>');
  htmlParts.push(`<li><strong>Organization Type:</strong> ${organizationTypeLabels[formData.organizationType] || formData.organizationType || 'Not specified'}</li>`);
  
  if (formData.organizationName) {
    htmlParts.push(`<li><strong>Organization Name:</strong> ${formData.organizationName}</li>`);
  }
  if (formData.otherOrganizationType) {
    htmlParts.push(`<li><strong>Other Organization Type:</strong> ${formData.otherOrganizationType}</li>`);
  }
  if (formData.maintainerEmail) {
    htmlParts.push(`<li><strong>Maintainer Email:</strong> <a href="mailto:${formData.maintainerEmail}">${formData.maintainerEmail}</a></li>`);
  }
  htmlParts.push(`<li><strong>Open to Honorarium:</strong> ${formData.openToSponsorship ? 'Yes ✓' : 'No'}</li>`);
  htmlParts.push('</ul>');
  
  htmlParts.push('<h3>Services Requested</h3>');
  if (formData.services && formData.services.length > 0) {
    htmlParts.push('<ul>');
    formData.services.forEach((service: string) => {
      htmlParts.push(`<li>${service}</li>`);
    });
    htmlParts.push('</ul>');
  } else {
    htmlParts.push('<p>None specified</p>');
  }
  
  if (formData.technologies && formData.technologies.length > 0) {
    htmlParts.push('<h3>Technologies</h3>');
    htmlParts.push('<ul>');
    formData.technologies.forEach((tech: string) => {
      htmlParts.push(`<li>${tech}</li>`);
    });
    htmlParts.push('</ul>');
  }
  
  htmlParts.push('<h3>Helper Preferences</h3>');
  if (formData.preferredPractitioner) {
    htmlParts.push(`<p><strong>Preferred Helper:</strong> ${formData.preferredPractitioner}</p>`);
  } else {
    htmlParts.push('<p>No preferred helper specified</p>');
  }
  
  if (formData.nomineeName || formData.nomineeEmail || formData.nomineeGithub) {
    htmlParts.push('<p><strong>Nominated Community Member:</strong></p>');
    htmlParts.push('<ul>');
    if (formData.nomineeName) {
      htmlParts.push(`<li><strong>Name:</strong> ${formData.nomineeName}</li>`);
    }
    if (formData.nomineeEmail) {
      htmlParts.push(`<li><strong>Email:</strong> <a href="mailto:${formData.nomineeEmail}">${formData.nomineeEmail}</a></li>`);
    }
    if (formData.nomineeGithub) {
      htmlParts.push(`<li><strong>GitHub:</strong> <a href="https://github.com/${formData.nomineeGithub}">@${formData.nomineeGithub}</a></li>`);
    }
    htmlParts.push('</ul>');
  }
  
  if (formData.additionalNotes) {
    htmlParts.push('<h3>Additional Notes</h3>');
    htmlParts.push(`<p>${formData.additionalNotes.replace(/\n/g, '<br>')}</p>`);
  }
  
  if (formData.createFundingPR) {
    htmlParts.push('<h3>FUNDING.yml</h3>');
    htmlParts.push('<p>✓ Maintainer requested FUNDING.yml PR</p>');
  }
  
  const html = htmlParts.join('\n');
  
  return { subject, text, html };
}

/**
 * Format maintainer confirmation email
 */
function formatMaintainerConfirmationEmail(formData: any, issueNumber: number, issueUrl: string, wishlistUrl: string, isUpdate: boolean): { subject: string; text: string; html: string } {
  const action = isUpdate ? 'updated' : 'created';
  const subject = `Your wishlist has been ${action}: ${formData.projectTitle}`;
  
  const text = `Hello,

Your wishlist for "${formData.projectTitle}" has been ${action} successfully!

Project: ${formData.projectUrl}
View your wishlist: ${wishlistUrl}

What happens next?
${isUpdate ? '- Your updated wishlist is now live' : '- Your wishlist will be reviewed by our team'}
${isUpdate ? '' : '- Once approved, it will be visible to helpers in our community'}
- Helpers can discover your project and offer assistance
- You'll be notified when someone expresses interest in fulfilling your wish

Thank you for being part of the OSS Wishlist community!`;

  const html = `
    <h2>Hello,</h2>
    <p>Your wishlist for <strong>"${formData.projectTitle}"</strong> has been ${action} successfully!</p>
    
    <p><strong>Project:</strong> <a href="${formData.projectUrl}">${formData.projectUrl}</a><br>
    <strong>View your wishlist:</strong> <a href="${wishlistUrl}">${wishlistUrl}</a></p>
    
    <h3>What happens next?</h3>
    <ul>
      ${isUpdate ? '<li>Your updated wishlist is now live</li>' : '<li>Your wishlist will be reviewed by our team</li>'}
      ${isUpdate ? '' : '<li>Once approved, it will be visible to helpers in our community</li>'}
      <li>Helpers can discover your project and offer assistance</li>
      <li>You'll be notified when someone expresses interest in fulfilling your wish</li>
    </ul>
    
    <p>Thank you for being part of the OSS Wishlist community!</p>
  `;
  
  return { subject, text, html };
}

export const POST: APIRoute = async ({ request }) => {
  console.log('[submit-wishlist] ========== API ENDPOINT CALLED ==========');
  console.log('[submit-wishlist] Request URL:', request.url);
  console.log('[submit-wishlist] Request method:', request.method);
  
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('[submit-wishlist] Request body parsed successfully');
      console.log('[submit-wishlist] Body keys:', Object.keys(body));
    } catch (parseError) {
      console.error('[submit-wishlist] JSON parse error:', parseError);
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

    // For updates, we'll add a comment with just the update timestamp
    // For new issues, we'll use the full markdown body from the form

    // If this is an update, add a comment with the required fields for the FUNDING.yml action
    // The markdown file is the source of truth, not the issue comments
    if (isUpdate && issueNumber) {
      const slug = generateWishlistSlug(formData.projectUrl, issueNumber);
      const wishlistUrl = `${origin}${basePath}/wishlists/${slug}`;
      
      const updateComment = `## Wishlist Updated

**Updated:** ${new Date().toISOString()}

View complete updated wishlist: ${wishlistUrl}

---

### Project Name
${formData.projectTitle}

### Maintainer GitHub Username
${formData.maintainer}

### Project Repository
${formData.projectUrl}

### FUNDING.yml Setup

- [${formData.createFundingPR ? 'x' : ' '}] Yes, create a FUNDING.yml PR for my repository
`;

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
          organizationType: formData.organizationType,
          organizationName: formData.organizationName,
          otherOrganizationType: formData.otherOrganizationType,
          openToSponsorship: formData.openToSponsorship,
          preferredPractitioner: formData.preferredPractitioner,
          nomineeName: formData.nomineeName,
          nomineeEmail: formData.nomineeEmail,
          nomineeGithub: formData.nomineeGithub,
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
      
      // Send admin notification email for update
      try {
        const emailContent = formatWishlistEmail(formData, issueNumber, issue.html_url, true);
        const emailResult = await sendAdminEmail(emailContent.subject, emailContent.text, emailContent.html);
        if (emailResult.success) {
          console.log('[submit-wishlist] ✓ Admin notification email sent for wishlist update #' + issueNumber);
        } else {
          console.warn('[submit-wishlist] ✗ Failed to send admin notification email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('[submit-wishlist] ✗ Error sending admin notification email:', emailError);
        // Don't fail the request if email fails
      }
      
      // Send confirmation email to maintainer
      if (formData.maintainerEmail) {
        try {
          const wishlistUrl = `${origin}${basePath}wishlists/${slug}`;
          const confirmationContent = formatMaintainerConfirmationEmail(formData, issueNumber, issue.html_url, wishlistUrl, true);
          const confirmResult = await sendEmail({
            to: formData.maintainerEmail,
            subject: confirmationContent.subject,
            text: confirmationContent.text,
            html: confirmationContent.html
          });
          if (confirmResult.success) {
            console.log('[submit-wishlist] ✓ Confirmation email sent to maintainer for update #' + issueNumber);
          } else {
            console.warn('[submit-wishlist] ✗ Failed to send confirmation email to maintainer:', confirmResult.error);
          }
        } catch (emailError) {
          console.error('[submit-wishlist] ✗ Error sending confirmation email to maintainer:', emailError);
        }
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
    
    // Build the final issue body with fulfillment link
    let finalIssueBody = issueBody; // Use the full markdown from the form
    if (nextIssueNumber) {
      const fulfillUrl = withBaseUrl(`fulfill?issue=${nextIssueNumber}`, origin);
      finalIssueBody += `\n\nFulfill this wishlist: ${fulfillUrl}`;
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
        organizationType: formData.organizationType,
        organizationName: formData.organizationName,
        otherOrganizationType: formData.otherOrganizationType,
        openToSponsorship: formData.openToSponsorship,
        preferredPractitioner: formData.preferredPractitioner,
        nomineeName: formData.nomineeName,
        nomineeEmail: formData.nomineeEmail,
        nomineeGithub: formData.nomineeGithub,
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

    // Send admin notification email for new wishlist
    try {
      const emailContent = formatWishlistEmail(formData, issue.number, issue.html_url, false);
      const emailResult = await sendAdminEmail(emailContent.subject, emailContent.text, emailContent.html);
      if (emailResult.success) {
        console.log('[submit-wishlist] ✓ Admin notification email sent for new wishlist #' + issue.number);
      } else {
        console.warn('[submit-wishlist] ✗ Failed to send admin notification email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('[submit-wishlist] ✗ Error sending admin notification email:', emailError);
      // Don't fail the request if email fails
    }

    // Send confirmation email to maintainer
    if (formData.maintainerEmail) {
      try {
        const slug = generateWishlistSlug(formData.projectUrl, issue.number);
        const wishlistUrl = `${origin}${basePath}wishlists/${slug}`;
        const confirmationContent = formatMaintainerConfirmationEmail(formData, issue.number, issue.html_url, wishlistUrl, false);
        const confirmResult = await sendEmail({
          to: formData.maintainerEmail,
          subject: confirmationContent.subject,
          text: confirmationContent.text,
          html: confirmationContent.html
        });
        if (confirmResult.success) {
          console.log('[submit-wishlist] ✓ Confirmation email sent to maintainer for new wishlist #' + issue.number);
        } else {
          console.warn('[submit-wishlist] ✗ Failed to send confirmation email to maintainer:', confirmResult.error);
        }
      } catch (emailError) {
        console.error('[submit-wishlist] ✗ Error sending confirmation email to maintainer:', emailError);
      }
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
    console.error('[submit-wishlist] ========== ERROR CAUGHT ==========');
    console.error('[submit-wishlist] Error creating wishlist issue:', error);
    console.error('[submit-wishlist] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return ApiErrors.serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
};