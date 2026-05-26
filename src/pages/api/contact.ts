import type { APIRoute } from 'astro';
import { sendAdminEmail, sendEmail } from '../../lib/mail';
import { moderateContent } from '../../lib/content-moderation';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, RATE_LIMITS } from '../../lib/rate-limit';
import { z } from 'zod';

export const prerender = false;

const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
});

export const POST: APIRoute = async ({ request }) => {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateCheck = checkRateLimit(clientId, RATE_LIMITS.SUBMIT);
  if (rateCheck.limited) {
    return createRateLimitResponse(rateCheck.resetTime);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (err) {
    console.error('[contact API] failed to parse JSON body:', err);
    return json({ success: false, code: 'invalid' }, 400);
  }

  // Bot protection: honeypot field must be empty
  const honeypot = typeof body._hp === 'string' ? body._hp : '';
  if (honeypot) {
    return json({ success: true });
  }

  // Bot protection: page must have been loaded at least 2 seconds before submit
  const ts = typeof body._ts === 'number' ? body._ts : parseInt(String(body._ts ?? '0'), 10);
  if (ts && Date.now() - ts < 2000) {
    return json({ success: true });
  }

  const raw = {
    name: typeof body.name === 'string' ? body.name : '',
    email: typeof body.email === 'string' ? body.email : '',
    subject: typeof body.subject === 'string' ? body.subject : '',
    message: typeof body.message === 'string' ? body.message : '',
  };

  console.log('[contact API] received submission for subject:', raw.subject);

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    console.error('[contact API] validation failed:', fieldErrors);
    return json({ success: false, code: 'validation', errors: fieldErrors }, 400);
  }

  const { name, email, subject, message } = parsed.data;

  // Content moderation
  const moderationResult = moderateContent(`${name} ${subject} ${message}`);
  if (!moderationResult.isClean) {
    return json({ success: false, code: 'moderation' }, 400);
  }

  // Check env vars
  const adminEmail = import.meta.env.ADMIN_EMAIL;
  const resendKey = import.meta.env.RESEND_API_KEY;
  console.log('[contact API] ADMIN_EMAIL set:', !!adminEmail, '| RESEND_API_KEY set:', !!resendKey);

  const text = `New contact form submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`;
  const html = `
    <h2>New Contact Form Submission</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Name</td><td style="padding:8px;border-bottom:1px solid #eee">${escHtml(name)}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Email</td><td style="padding:8px;border-bottom:1px solid #eee"><a href="mailto:${escHtml(email)}">${escHtml(email)}</a></td></tr>
      <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee">Subject</td><td style="padding:8px;border-bottom:1px solid #eee">${escHtml(subject)}</td></tr>
    </table>
    <h3>Message</h3>
    <p style="white-space:pre-wrap">${escHtml(message)}</p>
  `;

  try {
    console.log('[contact API] sending admin email...');
    const adminResult = await sendAdminEmail(`[Contact Form] ${subject}`, text, html);
    console.log('[contact API] admin email result:', JSON.stringify(adminResult));

    console.log('[contact API] sending confirmation email...');
    const confirmResult = await sendEmail({
      to: email,
      subject: 'We received your message – OSS Wishlist',
      text: `Hi ${name},\n\nThanks for reaching out! We've received your message and will get back to you as soon as we can.\n\nYour message:\n${message}\n\n— The OSS Wishlist team`,
    });
    console.log('[contact API] confirmation email result:', JSON.stringify(confirmResult));
  } catch (err) {
    console.error('[contact API] email error:', err instanceof Error ? err.message : err);
    return json({ success: false, code: 'send' }, 500);
  }

  return json({ success: true });
};
