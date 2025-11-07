import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getPriceForService, formatPrice } from '../../lib/pricing';
import { sendAdminEmail, sendEmail } from '../../lib/mail';
import { withBasePath } from '../../lib/paths';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();
    
  // Get all selected services from checkboxes (per-service in fulfill.astro)
  const fundedServices = formData.getAll('services-to-fund') as string[];
  const fundedServiceSlugs = formData.getAll('funded-slugs') as string[];
    
    // Get project name and issue details
    const projectName = formData.get('project-name') as string;
    const issueNumber = formData.get('issue-number') as string;
    const githubUrl = formData.get('github-url') as string;
    const maintainer = formData.get('maintainer') as string;
    
    // Gather per-service selections by parsing form field names
    const perServiceSelections: Record<string, {
      selection?: 'no-preference' | 'provide-own' | 'practitioner' | 'employee';
      practitionerSlug?: string;
      customPractitioner?: string | null;
      useEmployee?: boolean;
    }> = {};

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('practitioner-')) {
        const slug = key.replace('practitioner-', '');
        const v = String(value);
        perServiceSelections[slug] = perServiceSelections[slug] || {};
        if (v === 'no-preference') {
          perServiceSelections[slug].selection = 'no-preference';
        } else if (v === 'provide-own') {
          perServiceSelections[slug].selection = 'provide-own';
        } else {
          perServiceSelections[slug].selection = 'practitioner';
          perServiceSelections[slug].practitionerSlug = v;
        }
      }
      if (key.startsWith('use-employee-')) {
        const slug = key.replace('use-employee-', '');
        perServiceSelections[slug] = perServiceSelections[slug] || {};
        perServiceSelections[slug].useEmployee = true;
        perServiceSelections[slug].selection = 'employee';
      }
      if (key.startsWith('custom-practitioner-')) {
        const slug = key.replace('custom-practitioner-', '');
        perServiceSelections[slug] = perServiceSelections[slug] || {};
        perServiceSelections[slug].customPractitioner = String(value);
      }
    }

    // Resolve service titles from slugs for nicer email output
    const services = await getCollection('services');
    const serviceTitleBySlug = services.reduce<Record<string, string>>((acc, svc: any) => {
      if (svc && (svc as any).slug) acc[(svc as any).slug] = svc.data?.title || (svc as any).slug;
      return acc;
    }, {});

    const projectSizeRaw = (formData.get('project-size') as string) || 'medium';
    const projectSize = (['small','medium','large'].includes(projectSizeRaw) ? projectSizeRaw : 'medium') as 'small'|'medium'|'large';

    const fulfillmentData = {
      projectName: projectName,
      issueNumber: issueNumber,
      githubUrl: githubUrl,
      maintainer: maintainer,
      fundedServices: fundedServices,
      fundedServiceSlugs,
      perServiceSelections,
      additionalItems: formData.get('additional-items'),
      includeSponsorship: formData.get('include-sponsorship') === 'yes',
      processAgreement: !!formData.get('process-agreement'),
      timeline: formData.get('timeline'),
      contactPerson: formData.get('contact-person'),
      email: formData.get('email'),
      company: formData.get('company'),
      reason: formData.get('reason'),
      projectSize,
      timestamp: new Date().toISOString()
    };

    // Create email subject
    const emailSubject = `🎉 New Wishlist Fulfillment Request: ${projectName}`;
    
    // Build per-service section with selections
    const perServiceLines: string[] = [];
    // Prefer slugs from checked services if provided; otherwise include all
    const slugsToReport = fundedServiceSlugs.length > 0 ? fundedServiceSlugs : Object.keys(perServiceSelections);
    if (slugsToReport.length > 0) {
      for (const slug of slugsToReport) {
        const title = serviceTitleBySlug[slug] || slug;
        const sel = perServiceSelections[slug];
        let choice: string = sel && sel.selection ? '' : 'No selection provided';
        if (sel && sel.selection === 'practitioner' && sel.practitionerSlug) {
          choice = `Specific practitioner: ${sel.practitionerSlug}`;
        } else if (sel && sel.selection === 'provide-own') {
          choice = 'Provide own practitioner';
        } else if (sel && sel.selection === 'employee') {
          choice = 'Use own employee practitioner';
        } else if (sel && sel.selection === 'no-preference') {
          choice = 'No preference';
        }
        const custom = sel && sel.customPractitioner ? ` (Custom details: ${sel.customPractitioner})` : '';
        const priceVal = getPriceForService(slug, fulfillmentData.projectSize, services as any);
        const priceText = priceVal ? formatPrice(priceVal) : 'Custom pricing';
        perServiceLines.push(`- ${title}: ${choice}${custom} — Price: ${priceText}`);
      }
    } else {
      // Only names from fundedServices list
      for (const name of fundedServices) {
        // We don't have slugs here, so price unknown
        perServiceLines.push(`- ${name}`);
      }
    }

    // Create email content
  const emailBody = `
# New OSS Wishlist Fulfillment Request Received

## CONTACT INFORMATION
- **Name:** ${fulfillmentData.contactPerson}
- **Email:** ${fulfillmentData.email}
- **Company:** ${fulfillmentData.company || 'Not specified'}

## SELECTED SERVICES
${perServiceLines.length > 0 ? perServiceLines.join('\n') : '- None selected'}

**Project size:** ${fulfillmentData.projectSize.charAt(0).toUpperCase() + fulfillmentData.projectSize.slice(1)}
${fulfillmentData.timeline ? `\n**Timeline:** ${fulfillmentData.timeline}` : ''}

## ADDITIONAL ITEMS
${fulfillmentData.additionalItems || 'None specified'}

## HONORARIUM (Maintainer)
${fulfillmentData.includeSponsorship ? '✅ Include one-time honorarium' : '—'}

## REASON FOR FULFILLMENT
${fulfillmentData.reason}

## PROCESS AGREEMENT
${fulfillmentData.processAgreement ? '✅ Agreed: Employee/practitioner will complete the service using OSS Wishlist process' : '❌ Not agreed'}

---
*Submitted: ${new Date(fulfillmentData.timestamp).toLocaleString()}*
    `.trim();

    // Send email notification using centralized mail service
    const emailResult = await sendAdminEmail(emailSubject, emailBody);
    
    if (!emailResult.success) {
      console.error('Failed to send fulfillment email:', emailResult.error);
      return redirect(withBasePath(`fulfill?issue=${issueNumber}&error=email_failed`));
    }

    // Send confirmation email to requester (non-blocking for redirect)
    const requesterEmail = String(fulfillmentData.email || '').trim();
    if (requesterEmail) {
      const confirmSubject = `We've received your wishlist fulfillment request: ${projectName}`;
      const confirmBody = `Hi ${fulfillmentData.contactPerson || 'there'},

Thank you for submitting a wishlist fulfillment request for "${projectName}".
We've received your details and will review and follow up within 2-3 business days.

Summary:
- Project: ${projectName}
- GitHub: ${githubUrl}
- Issue #: ${issueNumber}
- Contact: ${fulfillmentData.contactPerson} (${requesterEmail})
- Project size: ${fulfillmentData.projectSize}
${fulfillmentData.timeline ? `- Timeline: ${fulfillmentData.timeline}` : ''}

Next steps:
• We'll review your selections and reach out with any questions.
• If practitioners were selected, we’ll coordinate introductions.

Questions? Email us at info@oss-wishlist.com

Helpful links:
• Community Discord: https://discord.gg/9BY9P5FD
• FAQ: https://oss-wishlist.org/faq

Best,
OSS Wishlist Team`;

      try {
        await sendEmail({
          to: requesterEmail,
          subject: confirmSubject,
          text: confirmBody,
        });
      } catch (e) {
        // Do not block user flow on confirmation failure
        console.error('Failed to send fulfillment confirmation email:', e);
      }
    }

    // Redirect to success page
    return redirect(withBasePath('fulfill-success'));

  } catch (error) {
    console.error('Error processing fulfillment request:', error);
    return redirect(withBasePath('fulfill?error=submission_failed'));
  }
};