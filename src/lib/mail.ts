/**
 * Centralized email service for OSS Wishlist
 * 
 * Supports multiple email providers:
 * - Resend (recommended)
 * - SendGrid
 * - Console logging (development)
 * 
 * Configuration via environment variables:
 * - ADMIN_EMAIL: Primary admin email address
 * - EMAIL_PROVIDER: 'resend' | 'sendgrid' | 'console' (default: auto-detect)
 * - RESEND_API_KEY: API key for Resend
 * - SENDGRID_API_KEY: API key for SendGrid
 * - EMAIL_FROM_ADDRESS: Sender email address (must be verified with provider)
 * - EMAIL_FROM_NAME: Sender display name (default: "OSS Wishlist")
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  from?: {
    email: string;
    name?: string;
  };
}

export interface EmailResult {
  success: boolean;
  error?: string;
  provider?: string;
  messageId?: string;
}

/**
 * Send an email using the configured provider
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const provider = getEmailProvider();
  
  try {
    switch (provider) {
      case 'resend':
        return await sendViaResend(options);
      case 'sendgrid':
        return await sendViaSendGrid(options);
      case 'console':
        return sendViaConsole(options);
      default:
        throw new Error(`Unknown email provider: ${provider}`);
    }
  } catch (error) {
    console.error('Email sending failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      provider
    };
  }
}

/**
 * Determine which email provider to use
 */
function getEmailProvider(): 'resend' | 'sendgrid' | 'console' {
  // Allow explicit provider selection
  const envProvider = import.meta.env.EMAIL_PROVIDER;
  if (envProvider) {
    return envProvider as 'resend' | 'sendgrid' | 'console';
  }
  
  // Auto-detect based on available API keys
  if (import.meta.env.RESEND_API_KEY) {
    return 'resend';
  }
  
  if (import.meta.env.SENDGRID_API_KEY) {
    return 'sendgrid';
  }
  
  // Default to console in development
  return 'console';
}

/**
 * Get the configured "from" address
 */
function getFromAddress(customFrom?: { email: string; name?: string }) {
  if (customFrom) {
    return customFrom;
  }
  
  return {
    email: import.meta.env.EMAIL_FROM_ADDRESS || 'noreply@oss-wishlist.com',
    name: import.meta.env.EMAIL_FROM_NAME || 'OSS Wishlist'
  };
}

/**
 * Send email via Resend
 */
async function sendViaResend(options: EmailOptions): Promise<EmailResult> {
  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }
  
  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);
  
  const from = getFromAddress(options.from);
  const fromString = from.name ? `${from.name} <${from.email}>` : from.email;
  
  const result = await resend.emails.send({
    from: fromString,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    text: options.text,
    html: options.html
  });
  
  if (result.error) {
    throw new Error(`Resend API error: ${JSON.stringify(result.error)}`);
  }
  
  return {
    success: true,
    provider: 'resend',
    messageId: result.data?.id
  };
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(options: EmailOptions): Promise<EmailResult> {
  const apiKey = import.meta.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY not configured');
  }
  
  const from = getFromAddress(options.from);
  
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{
        to: Array.isArray(options.to) 
          ? options.to.map(email => ({ email }))
          : [{ email: options.to }],
        subject: options.subject
      }],
      from: {
        email: from.email,
        name: from.name
      },
      content: [
        {
          type: 'text/plain',
          value: options.text
        },
        ...(options.html ? [{
          type: 'text/html',
          value: options.html
        }] : [])
      ]
    })
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`SendGrid API error: ${errorData}`);
  }
  
  return {
    success: true,
    provider: 'sendgrid'
  };
}

/**
 * Log email to console (for development)
 */
function sendViaConsole(options: EmailOptions): EmailResult {
  console.log('\n========================================');
  console.log('📧 EMAIL (Console Mode - Development)');
  console.log('========================================');
  console.log('From:', getFromAddress(options.from));
  console.log('To:', options.to);
  console.log('Subject:', options.subject);
  console.log('----------------------------------------');
  console.log(options.text);
  console.log('========================================\n');
  
  // In production, fail if no email provider is configured
  if (import.meta.env.PROD) {
    console.warn('⚠️  WARNING: Email sent to console in production! Configure an email provider.');
  }
  
  return {
    success: true,
    provider: 'console',
    messageId: `console-${Date.now()}`
  };
}

/**
 * Send email to admin
 * Convenience function for sending to the configured admin email
 */
export async function sendAdminEmail(subject: string, text: string, html?: string): Promise<EmailResult> {
  const adminEmail = import.meta.env.ADMIN_EMAIL;
  
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL not configured in environment variables');
  }
  
  return sendEmail({
    to: adminEmail,
    subject,
    text,
    html
  });
}

/**
 * Check if email service is properly configured
 */
export function isEmailConfigured(): boolean {
  const hasProvider = !!(
    import.meta.env.RESEND_API_KEY || 
    import.meta.env.SENDGRID_API_KEY
  );
  const hasAdminEmail = !!import.meta.env.ADMIN_EMAIL;
  
  return hasProvider && hasAdminEmail;
}

/**
 * Get email configuration status
 */
export function getEmailConfig() {
  return {
    provider: getEmailProvider(),
    adminEmail: import.meta.env.ADMIN_EMAIL || null,
    fromAddress: import.meta.env.EMAIL_FROM_ADDRESS || null,
    fromName: import.meta.env.EMAIL_FROM_NAME || 'OSS Wishlist',
    configured: isEmailConfigured()
  };
}
