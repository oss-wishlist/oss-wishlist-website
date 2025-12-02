import type { APIRoute } from 'astro';
import { sendAdminEmail, sendEmail, getEmailConfig } from '../../lib/mail';
import { createPractitioner, updatePractitioner, getPractitionersBySubmitter, getAllPractitioners } from '../../lib/db';
import { verifySession } from '../../lib/github-oauth';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, RATE_LIMITS } from '../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateCheck = checkRateLimit(clientId, RATE_LIMITS.SUBMIT);
  if (rateCheck.limited) {
    return createRateLimitResponse(rateCheck.resetTime);
  }

  try {
    // Verify user is logged in
    const sessionCookie = cookies.get('oss_session') || cookies.get('github_session');
    if (!sessionCookie?.value) {
      return new Response(JSON.stringify({
        success: false,
        error: 'You must be logged in to submit a practitioner profile',
        code: 'UNAUTHORIZED'
      }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sessionSecret = import.meta.env.OAUTH_STATE_SECRET;
    const session = verifySession(sessionCookie.value, sessionSecret);
    
    if (!session) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid session. Please log in again.',
        code: 'UNAUTHORIZED'
      }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const username = session.user?.login || session.user?.name || 'unknown';

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[Practitioner API] JSON parse error:', parseError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON'
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Basic required field validation
    const missing: string[] = [];
    if (!body.fullName) missing.push('fullName');
    if (!body.email) missing.push('email');
    if (!body.title) missing.push('title');
    if (!body.bio) missing.push('bio');
    if (!body.availability) missing.push('availability');
    if (!body.languages || body.languages.length === 0) missing.push('languages');
    if (missing.length) {
      return new Response(JSON.stringify({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`,
        code: 'VALIDATION_ERROR',
        fields: missing
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const proBonoHours = body.proBonoHours ?? body.proBonoCapacity ?? 0;
    
    // Generate slug from name (lowercase, replace spaces with hyphens)
    const slug = `${body.fullName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-practitioner`;

    // Check if practitioner profile already exists for this user
    const existingPractitioners = await getPractitionersBySubmitter(username);
    const existingPractitioner = existingPractitioners.length > 0 ? existingPractitioners[0] : null;

    // Check if email is already in use by another practitioner (different GitHub username)
    const allPractitioners = await getAllPractitioners();
    const emailTaken = allPractitioners.find(p => 
      p.email === body.email && 
      p.submitter_username !== username
    );
    if (emailTaken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'This email address is already registered by another practitioner. Please use a different email.',
        code: 'EMAIL_ALREADY_EXISTS'
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const practitionerData = {
      slug,
      name: body.fullName,
      title: body.title,
      company: body.company || '',
      bio: body.bio,
      // Avatar: Use GitHub avatar if GitHub username provided, otherwise use default logo
      avatar_url: body.github ? `https://github.com/${body.github.replace('https://github.com/', '')}.png` : '/images/oss-wishlist-logo.jpg',
      location: body.location || '',
      languages: body.languages || ['English'],
      email: body.email,
      website: body.website || undefined,
      github: body.github || undefined, // Optional: User's GitHub profile URL
      github_sponsors: body.githubSponsors || undefined,
      mastodon: body.mastodon || undefined,
      linkedin: body.linkedin || undefined,
      services: body.services || body.specialties || [], // Accept both 'services' (edit form) and 'specialties' (new form)
      availability: body.availability,
      accepts_pro_bono: body.proBono === 'on' || body.proBono === true,
      pro_bono_criteria: body.proBonoCriteriaText || undefined,
      pro_bono_hours_per_month: proBonoHours > 0 ? proBonoHours : undefined,
      years_experience: body.experience ? parseInt(body.experience) : undefined,
      notable_experience: body.projects ? body.projects.split('\n').filter((p: string) => p.trim()) : [],
      certifications: [],
      approved: false,
      verified: false,
      submitter_username: username // Auth identifier (currently GitHub username, could be Google email, etc.)
    };

    let practitioner;
    let isUpdate = false;

    if (existingPractitioner) {
      // Update existing practitioner
      practitioner = await updatePractitioner(existingPractitioner.id, practitionerData);
      isUpdate = true;
      console.log(`[submit-practitioner] ✓ Updated database record for practitioner #${practitioner.id} (${body.fullName})`);
    } else {
      // Create new practitioner
      practitioner = await createPractitioner(practitionerData);
      console.log(`[submit-practitioner] ✓ Created database record for practitioner #${practitioner.id} (${body.fullName})`);
    }

    // Initialize email result variables
    let emailResult: any = { success: false, provider: 'none' };
    let confirmationResult: any = { success: false };

    // Only send emails for new applications, not updates
    if (!isUpdate) {
      // Email subject
      const subject = `New Practitioner Application: ${body.fullName}`;
      
      // Create simple email body with application details
      const emailBody = `
New practitioner application received from ${body.fullName}.

**Database ID:** ${practitioner.id}
**Slug:** ${slug}
**Submitter:** @${username}
**Action:** New application

## Contact Information
- **Name:** ${body.fullName}
- **Email:** ${body.email}
- **Title:** ${body.title}
- **Company:** ${body.company || 'Not specified'}
- **Location:** ${body.location || 'Not specified'}
- **Languages:** ${body.languages.join(', ')}

## Professional Background
- **Years of Experience:** ${body.experience || 'Not specified'}
- **Bio:** ${body.bio || 'Not provided'}

## Links & Social
- **GitHub:** ${body.github ? body.github : 'Not provided'}
- **LinkedIn:** ${body.linkedin || 'Not provided'}
- **Mastodon:** ${body.mastodon || 'Not provided'}
- **Website:** ${body.website || 'Not provided'}

## Expertise Areas
${(body.services || body.specialties) && (body.services || body.specialties).length > 0 ? (body.services || body.specialties).map((s: string) => `- ${s}`).join('\n') : 'None selected'}
${body.otherSpecialties ? `\n**Other Specialties:** ${body.otherSpecialties}` : ''}

## Availability & Pro Bono
- **Availability:** ${body.availability || 'Not specified'}
- **Accepts Pro Bono:** ${body.proBono === 'on' || body.proBono === true ? 'Yes' : 'No'}
${body.proBono === 'on' || body.proBono === true ? `- **Pro Bono Hours/Month:** ${proBonoHours}\n- **Pro Bono Criteria:** ${body.proBonoCriteriaText || 'Not specified'}` : ''}

## Notable Projects/Experience
${body.projects || 'Not provided'}

## Additional Information
${body.additionalInfo || 'None provided'}

---
**Database Record:** Practitioner #${practitioner.id}
**Status:** Pending approval
**Submitted:** ${new Date().toLocaleString()}

To approve: Update status in database to 'approved' and set approved=true
`;

      // Check email configuration first
      const emailConfig = getEmailConfig();
        
      if (!emailConfig.adminEmail) {
        console.error('[Practitioner API] ADMIN_EMAIL not configured');
        return new Response(JSON.stringify({
          success: false,
          error: 'Email not configured: ADMIN_EMAIL missing',
          code: 'EMAIL_CONFIG_MISSING',
          emailConfig
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

      // Send email using centralized mail service
      emailResult = await sendAdminEmail(subject, emailBody);
      
      if (!emailResult.success) {
        console.error('Failed to send practitioner admin email:', emailResult.error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Failed to send notification email: ' + emailResult.error 
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Send confirmation email to applicant
      const confirmationSubject = 'Thank You for Your Practitioner Application';
      const confirmationBody = `Hi ${body.fullName},

Thank you for joining as a practitioner with OSS Wishlist!

We've received your application and will review it within 3-5 business days. We'll take a quick look to ensure everything is in order, and get back to you via email if we have any questions.

In the meantime:
• Join our Discord community: https://discord.gg/9BY9P5FD
• Browse our service catalogue: https://oss-wishlist.org/catalog
• Check out our FAQ: https://oss-wishlist.org/faq

If you have any questions, please contact us at info@oss-wishlist.com

We're excited to have you join our community of practitioners helping open source projects thrive!

Best regards,
The OSS Wishlist Team

---
This is an automated confirmation email.`;

      confirmationResult = await sendEmail({
        to: body.email,
        subject: confirmationSubject,
        text: confirmationBody
      });

      console.log(`[submit-practitioner] ✓ Admin notification email sent for practitioner #${practitioner.id}`);
      if (confirmationResult.success) {
        console.log(`[submit-practitioner] ✓ Confirmation email sent to ${body.email}`);
      }
    } else {
      console.log(`[submit-practitioner] ✓ Profile update - no emails sent for practitioner #${practitioner.id}`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: isUpdate ? 'Profile updated successfully' : 'Application submitted successfully',
      practitioner: {
        id: practitioner.id,
        slug: slug,
        name: body.fullName
      },
      isUpdate,
      emailProvider: emailResult.provider,
      confirmationSent: confirmationResult.success
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Practitioner API] Unexpected error:', error);
    console.error('[Practitioner API] Error stack:', error instanceof Error ? error.stack : 'no stack');
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      code: 'UNEXPECTED_ERROR'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
