import type { APIRoute } from 'astro';
import { sendAdminEmail, sendEmail } from '../../lib/mail';
import { moderateContent } from '../../lib/content-moderation';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, RATE_LIMITS } from '../../lib/rate-limit';
import { getBasePath } from '../../lib/paths';
import { z } from 'zod';

export const prerender = false;

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
});

export const POST: APIRoute = async ({ request }) => {
  const basePath = getBasePath();

  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateCheck = checkRateLimit(clientId, RATE_LIMITS.SUBMIT);
  if (rateCheck.limited) {
    return createRateLimitResponse(rateCheck.resetTime);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(null, {
      status: 302,
      headers: { Location: `${basePath}contact?error=invalid` },
    });
  }

  const raw = {
    name: formData.get('name')?.toString() ?? '',
    email: formData.get('email')?.toString() ?? '',
    subject: formData.get('subject')?.toString() ?? '',
    message: formData.get('message')?.toString() ?? '',
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${basePath}contact?error=invalid` },
    });
  }

  const { name, email, subject, message } = parsed.data;

  // Content moderation
  const moderationResult = moderateContent(`${name} ${subject} ${message}`);
  if (!moderationResult.isClean) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${basePath}contact?error=moderation` },
    });
  }

  const text = `New contact form submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`;
  const html = `
    <h2>New Contact Form Submission</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Name</td><td style="padding:8px;border-bottom:1px solid #eee">${name}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Email</td><td style="padding:8px;border-bottom:1px solid #eee"><a href="mailto:${email}">${email}</a></td></tr>
      <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Subject</td><td style="padding:8px;border-bottom:1px solid #eee">${subject}</td></tr>
    </table>
    <h3>Message</h3>
    <p style="white-space:pre-wrap">${message}</p>
  `;

  try {
    await sendAdminEmail(`[Contact Form] ${subject}`, text, html);

    // Send confirmation to the sender
    await sendEmail({
      to: email,
      subject: 'We received your message – OSS Wishlist',
      text: `Hi ${name},\n\nThanks for reaching out! We've received your message and will get back to you as soon as we can.\n\nYour message:\n${message}\n\n— The OSS Wishlist team`,
    });
  } catch (err) {
    console.error('[contact API] email error:', err);
    return new Response(null, {
      status: 302,
      headers: { Location: `${basePath}contact?error=send` },
    });
  }

  return new Response(null, {
    status: 302,
    headers: { Location: `${basePath}contact?success=true` },
  });
};
