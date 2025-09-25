
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

const asBool = (v?: string) =>
  v ? ['1','true','yes','on'].includes(v.toLowerCase()) : false;

// Helper to trim trailing newlines that can be added by secret managers
const trim1 = (v?: string) => v?.replace(/\r?\n$/, '');

/**
 * Creates and configures the Nodemailer transport based on environment variables.
 * This is the central point for SMTP configuration.
 */
function createMailTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '465', 10);

  // Default to secure if the port is 465, but allow override.
  const secure = process.env.SMTP_SECURE != null
    ? asBool(process.env.SMTP_SECURE)
    : port === 465;

  const user = trim1(process.env.SMTP_USER);
  const pass = trim1(process.env.SMTP_PASS);

  if (!host) {
    throw new Error('SMTP_HOST is not defined in environment variables.');
  }

  const opts: SMTPTransport.Options = {
    host,
    port,
    secure,
    auth: (user && pass) ? { user, pass } : undefined,
    // Add robust TLS options for compatibility and security
    tls: {
      minVersion: 'TLSv1.2',
      // Do not reject self-signed certificates if explicitly allowed (for testing)
      // In production, this should ideally be false.
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false', 
    },
    // Add connection timeout to prevent hangs
    connectionTimeout: 10000, // 10 seconds
    // More detailed logging for easier debugging
    logger: process.env.NODE_ENV !== 'production',
    debug: process.env.NODE_ENV !== 'production',
  };

  return nodemailer.createTransport(opts);
}

/**
 * A robust wrapper for sending emails. It checks for required environment variables
 * and provides detailed error logging.
 * @param to Recipient email address.
 * @param subject Email subject.
 * @param html The HTML body of the email.
 */
export async function sendEmail({ to, subject, html }: {
  to: string;
  subject: string;
  html: string;
}) {
  // Check for all required environment variables for sending email.
  const requiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_FROM', 'SMTP_USER', 'SMTP_PASS'];
  const missingEnv = requiredEnv.filter(key => !process.env[key]);
  if (missingEnv.length > 0) {
    const errorMsg = `Email sending is not configured. Missing environment variables: ${missingEnv.join(', ')}`;
    console.error(`CRITICAL: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const transporter = createMailTransport();

  // The 'From' address. Fallback to user if SMTP_FROM is not set.
  const from = process.env.SMTP_FROM || trim1(process.env.SMTP_USER)!;

  try {
    console.log(`Attempting to send email from: ${from} to: ${to}`);
    const info = await transporter.sendMail({ from, to, subject, html });
    console.log('Message sent successfully. Message ID:', info.messageId);
    return info;
  } catch (err) {
    // Log detailed error information to diagnose the timeout.
    const error = err as (Error & { code?: string; command?: string; response?: string });
    console.error('sendMail failed with error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack,
    });
    // Re-throw a user-friendly error.
    throw new Error(`Failed to send email. Reason: ${error.message}`);
  }
}
