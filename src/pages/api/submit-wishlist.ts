// API endpoint to submit wishlists (create or update)
// Stores directly to PostgreSQL database, no GitHub issues
//
import type { APIRoute } from 'astro';
import { wishlistFormDataSchema, formatZodError } from '../../lib/validation.js';
import { jsonSuccess, jsonError, ApiErrors } from '../../lib/api-response.js';
import { createWishlist, updateWishlist, getWishlistById } from '../../lib/db.js';
import { generateWishlistSlug } from '../../lib/slugify.js';
import { sendAdminEmail, sendEmail } from '../../lib/mail.js';

export const prerender = false;

/**
 * Format wishlist data for admin email notification
 */
function formatWishlistEmail(formData: any, wishlistId: number, wishlistUrl: string, isUpdate: boolean): { subject: string; text: string; html: string } {
  const action = isUpdate ? 'Updated' : 'New';
  const subject = `${action} Wishlist: ${formData.projectTitle} (#${wishlistId})`;
  
  const textParts = [
    `${action} Wishlist Submission`,
    '',
    `Wishlist #${wishlistId}`,
    `Wishlist URL: ${wishlistUrl}`,
    '',
    `Project Name: ${formData.projectTitle}`,
    `Repository: ${formData.projectUrl}`,
    `Maintainer: @${formData.maintainer}`,
    `Maintainer Email: ${formData.maintainerEmail || 'Not provided'}`,
    '',
    `Services Requested: ${formData.services?.join(', ') || 'None'}`,
    `Urgency: ${formData.urgency}`,
    `Project Size: ${formData.projectSize}`,
    '',
    `This wishlist is pending approval.`,
  ];
  
  const htmlParts = [
    `<h2>${action} Wishlist Submission</h2>`,
    `<p><strong>Wishlist #${wishlistId}</strong></p>`,
    `<p><a href="${wishlistUrl}">View Wishlist</a></p>`,
    `<h3>Project Information</h3>`,
    `<ul>`,
    `<li><strong>Project:</strong> ${formData.projectTitle}</li>`,
    `<li><strong>Repository:</strong> <a href="${formData.projectUrl}">${formData.projectUrl}</a></li>`,
    `<li><strong>Maintainer:</strong> @${formData.maintainer}</li>`,
    `<li><strong>Email:</strong> ${formData.maintainerEmail || 'Not provided'}</li>`,
    `</ul>`,
    `<h3>Request Details</h3>`,
    `<ul>`,
    `<li><strong>Services:</strong> ${formData.services?.join(', ') || 'None'}</li>`,
    `<li><strong>Urgency:</strong> ${formData.urgency}</li>`,
    `<li><strong>Project Size:</strong> ${formData.projectSize}</li>`,
    `</ul>`,
    `<p><em>This wishlist is pending approval.</em></p>`,
  ];
  
  return {
    subject,
    text: textParts.join('\n'),
    html: htmlParts.join('\n')
  };
}

/**
 * Format confirmation email for maintainer
 */
function formatMaintainerConfirmationEmail(formData: any, wishlistId: number, wishlistUrl: string, isUpdate: boolean): { subject: string; text: string; html: string } {
  const action = isUpdate ? 'updated' : 'submitted';
  const subject = `Wishlist ${action}: ${formData.projectTitle}`;
  
  const textParts = [
    `Hi @${formData.maintainer},`,
    '',
    `Thank you for ${action === 'submitted' ? 'submitting' : 'updating'} your wishlist for ${formData.projectTitle}!`,
    '',
    `Your wishlist (#${wishlistId}) is now pending review. You'll be notified once it's approved.`,
    '',
    `View your wishlist: ${wishlistUrl}`,
    '',
    'Best regards,',
    'OSS Wishlist Team'
  ];
  
  const htmlParts = [
    `<p>Hi @${formData.maintainer},</p>`,
    `<p>Thank you for ${action === 'submitted' ? 'submitting' : 'updating'} your wishlist for <strong>${formData.projectTitle}</strong>!</p>`,
    `<p>Your wishlist (#${wishlistId}) is now pending review. You'll be notified once it's approved.</p>`,
    `<p><a href="${wishlistUrl}">View your wishlist</a></p>`,
    `<p>Best regards,<br>OSS Wishlist Team</p>`
  ];
  
  return {
    subject,
    text: textParts.join('\n'),
    html: htmlParts.join('\n')
  };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Check if this is an update (has issueNumber) or new wishlist
    const issueNumber = body.issueNumber ? parseInt(body.issueNumber) : null;
    const isUpdate = issueNumber !== null;
    
    // Extract formData from body (frontend sends it nested)
    const formDataToValidate = body.formData || body;
    
    // Validate form data directly (not the full submission schema)
    const validation = wishlistFormDataSchema.safeParse(formDataToValidate);
    if (!validation.success) {
      const errorMessage = formatZodError(validation.error);
      console.error('[submit-wishlist] Validation error:', errorMessage);
      return jsonError('Validation failed', errorMessage, 400);
    }
    
    const formData = validation.data;
    const origin = new URL(request.url).origin;
    const basePath = import.meta.env.BASE_URL || '';
    
    // For updates
    if (isUpdate && issueNumber) {
      console.log(`[submit-wishlist] Updating wishlist #${issueNumber}`);
      
      // Get existing wishlist to preserve certain fields
      const existing = await getWishlistById(issueNumber);
      if (!existing) {
        return jsonError('Wishlist not found', 'Cannot update non-existent wishlist', 404);
      }
      
      const slug = generateWishlistSlug(formData.projectUrl, issueNumber);
      const wishlistUrl = `${origin}${basePath}/wishlist/${issueNumber}`;
      
      // Update database record
      try {
        await updateWishlist(issueNumber, {
          slug,
          project_name: formData.projectTitle,
          repository_url: formData.projectUrl,
          project_description: formData.description,
          maintainer_username: existing.maintainer_username, // Preserve original
          maintainer_email: formData.maintainerEmail,
          maintainer_avatar_url: existing.maintainer_avatar_url,
          approved: existing.approved, // Preserve approval status
          wishes: formData.services,
          technologies: formData.technologies || [],
          urgency: formData.urgency,
          project_size: formData.projectSize,
          additional_notes: formData.additionalNotes,
          organization_type: formData.organizationType,
          organization_name: formData.organizationName,
          other_organization_type: formData.otherOrganizationType,
          open_to_sponsorship: formData.openToSponsorship,
          preferred_practitioner: formData.preferredPractitioner,
          nominee_name: formData.nomineeName,
          nominee_email: formData.nomineeEmail,
          nominee_github: formData.nomineeGithub,
        });
        console.log(`[submit-wishlist] ✓ Updated database record for wishlist #${issueNumber}`);
      } catch (dbError) {
        console.error('[submit-wishlist] ✗ Failed to update database:', dbError);
        return jsonError('Database error', 'Failed to update wishlist', 500);
      }
      
      // Send admin notification email
      try {
        const emailContent = formatWishlistEmail(formData, issueNumber, wishlistUrl, true);
        await sendAdminEmail(emailContent.subject, emailContent.text, emailContent.html);
        console.log(`[submit-wishlist] ✓ Admin notification email sent for update #${issueNumber}`);
      } catch (emailError) {
        console.error('[submit-wishlist] ✗ Error sending admin email:', emailError);
      }
      
      // Send confirmation email to maintainer
      if (formData.maintainerEmail) {
        try {
          const confirmationContent = formatMaintainerConfirmationEmail(formData, issueNumber, wishlistUrl, true);
          await sendEmail({
            to: formData.maintainerEmail,
            subject: confirmationContent.subject,
            text: confirmationContent.text,
            html: confirmationContent.html
          });
          console.log(`[submit-wishlist] ✓ Confirmation email sent to maintainer`);
        } catch (emailError) {
          console.error('[submit-wishlist] ✗ Error sending confirmation email:', emailError);
        }
      }
      
      return jsonSuccess({
        updated: true,
        issue: {
          number: issueNumber,
          title: formData.projectTitle,
          url: wishlistUrl,
        },
        wishlist: {
          id: issueNumber,
          projectName: formData.projectTitle,
          slug,
        }
      });
    }
    
    // Create new wishlist
    console.log('[submit-wishlist] Creating new wishlist');
    
    // Generate a new ID (simple sequential - use max existing ID + 1)
    // Since we're not using GitHub issue numbers anymore, start from 1000 to avoid conflicts with test data
    const newId = Math.floor(Math.random() * 1000000) + 1000;
    const slug = generateWishlistSlug(formData.projectUrl, newId);
    const wishlistUrl = `${origin}${basePath}/wishlist/${newId}`;
    
    // Create database record
    try {
      await createWishlist({
        id: newId,
        slug,
        project_name: formData.projectTitle,
        repository_url: formData.projectUrl,
        project_description: formData.description,
        maintainer_username: formData.maintainer,
        maintainer_email: formData.maintainerEmail,
        maintainer_avatar_url: `https://github.com/${formData.maintainer}.png`,
        issue_url: wishlistUrl, // Self-referential for now
        issue_state: 'open',
        approved: false, // New wishlists start unapproved
        wishes: formData.services,
        technologies: formData.technologies || [],
        resources: [],
        urgency: formData.urgency,
        project_size: formData.projectSize,
        additional_notes: formData.additionalNotes,
        organization_type: formData.organizationType,
        organization_name: formData.organizationName,
        other_organization_type: formData.otherOrganizationType,
        open_to_sponsorship: formData.openToSponsorship,
        preferred_practitioner: formData.preferredPractitioner,
        nominee_name: formData.nomineeName,
        nominee_email: formData.nomineeEmail,
        nominee_github: formData.nomineeGithub,
      });
      console.log(`[submit-wishlist] ✓ Created database record for wishlist #${newId}`);
    } catch (dbError) {
      console.error('[submit-wishlist] ✗ Failed to create database record:', dbError);
      return jsonError('Database error', 'Failed to save wishlist', 500);
    }
    
    // Send admin notification email
    try {
      const emailContent = formatWishlistEmail(formData, newId, wishlistUrl, false);
      await sendAdminEmail(emailContent.subject, emailContent.text, emailContent.html);
      console.log(`[submit-wishlist] ✓ Admin notification email sent for new wishlist #${newId}`);
    } catch (emailError) {
      console.error('[submit-wishlist] ✗ Error sending admin email:', emailError);
    }
    
    // Send confirmation email to maintainer
    if (formData.maintainerEmail) {
      try {
        const confirmationContent = formatMaintainerConfirmationEmail(formData, newId, wishlistUrl, false);
        await sendEmail({
          to: formData.maintainerEmail,
          subject: confirmationContent.subject,
          text: confirmationContent.text,
          html: confirmationContent.html
        });
        console.log(`[submit-wishlist] ✓ Confirmation email sent to maintainer`);
      } catch (emailError) {
        console.error('[submit-wishlist] ✗ Error sending confirmation email:', emailError);
      }
    }
    
    return jsonSuccess({
      issue: {
        number: newId,
        title: formData.projectTitle,
        url: wishlistUrl,
      },
      wishlist: {
        id: newId,
        projectName: formData.projectTitle,
        slug,
      }
    });
    
  } catch (error) {
    console.error('[submit-wishlist] Error:', error);
    return ApiErrors.serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
};
