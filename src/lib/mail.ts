
// mail.ts (improved)
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

const asBool = (v?: string) =>
  v ? ['1','true','yes','on'].includes(v.toLowerCase()) : false;

// Helper: trim whitespace/newlines from both ends
const trimAll = (v?: string) => v?.trim();

/**
 * Creates and configures the Nodemailer transport based on environment variables.
 */
function createMailTransport() {
  const host = trimAll(process.env.SMTP_HOST);
  const port = Number(trimAll(process.env.SMTP_PORT) || 587); // default to 587 (STARTTLS)
  const envSecure = process.env.SMTP_SECURE != null ? asBool(trimAll(process.env.SMTP_SECURE)) : undefined;

  // Default to secure for port 465, otherwise false (587 uses STARTTLS)
  const secure = envSecure !== undefined ? envSecure : (port === 465);

  const user = trimAll(process.env.SMTP_USER);
  const pass = trimAll(process.env.SMTP_PASS);

  if (!host) {
    throw new Error('SMTP_HOST is not defined in environment variables.');
  }

  // Determine requireTLS when using STARTTLS (port 587, secure=false)
  const requireTLS = !secure && port === 587;

  const opts: SMTPTransport.Options = {
    host,
    port,
    secure,
    auth: (user && pass) ? { user, pass } : undefined,
    // TLS options
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
      // set servername to support SNI (helps with some hosts)
      servername: host,
    },
    requireTLS,
    // Timeouts — increase for slow hosts/containers
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 20000), // 20s
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 15000), // 15s
    // Logging for non-production
    logger: process.env.NODE_ENV !== 'production',
    debug: process.env.NODE_ENV !== 'production',
  };

  // Non-secret debug log to confirm runtime config (DO NOT log password)
  console.log('SMTP transport create (debug):', {
    host: opts.host,
    port: opts.port,
    secure: opts.secure,
    requireTLS: opts.requireTLS,
    authUserPresent: !!(opts.auth && 'user' in opts.auth && opts.auth.user),
    authPassLength: (opts.auth && 'pass' in opts.auth && opts.auth.pass) ? String(opts.auth.pass).length : 0,
    tls: { rejectUnauthorized: opts.tls?.rejectUnauthorized, servername: opts.tls?.servername },
  });


  return nodemailer.createTransport(opts);
}

/**
 * Send email wrapper with verification and richer error mapping.
 */
export async function sendEmail({ to, subject, html }: {
  to: string;
  subject: string;
  html: string;
}) {
  // Treat empty strings as missing
  const requiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_FROM', 'SMTP_USER', 'SMTP_PASS'];
  const missingEnv = requiredEnv.filter(key => {
    const v = process.env[key];
    return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
  });
  if (missingEnv.length > 0) {
    const errorMsg = `Email sending is not configured. Missing environment variables: ${missingEnv.join(', ')}`;
    console.error('CRITICAL:', errorMsg);
    const e = new Error(errorMsg) as any;
    e.status = 400;
    throw e;
  }

  const transporter = createMailTransport();

  const from = trimAll(process.env.SMTP_FROM) || trimAll(process.env.SMTP_USER)!;

  // Verify connection/auth early to fail fast and return a clear error code
  try {
    console.log('Verifying SMTP transporter...');
    await transporter.verify();
    console.log('SMTP transporter verified.');
  } catch (vErr) {
    console.error('SMTP verify failed (full):', vErr);
    const e = new Error(`SMTP verify failed: ${(vErr as Error).message}`) as any;
    // upstream problem — map to 502
    e.status = 502;
    throw e;
  }

  try {
    console.log(`Attempting to send email from: ${from} to: ${to}`);
    const info = await transporter.sendMail({ from, to, subject, html });
    console.log('Message sent successfully. Message ID:', info.messageId);
    return info;
  } catch (err) {
    const error = err as any;
    // Log a rich error object for debugging/monitoring
    console.error('sendMail failed (detailed):', {
      message: error && error.message,
      code: error && error.code,
      response: error && error.response,
      smtpResponse: error && error.smtpResponse,
      command: error && error.command,
      stack: error && error.stack,
    });

    // Map common errors
    const mapped = new Error(`Failed to send email: ${error && error.message ? error.message : 'unknown error'}`) as any;
    if (error && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
      mapped.status = 502; // bad gateway / upstream unreachable
    } else if (error && error.code === 'ETIMEDOUT') {
      mapped.status = 504; // gateway timeout
    } else {
      mapped.status = 502; // default to upstream error
    }
    throw mapped;
  } finally {
    try {
      transporter.close();
    } catch (closeErr) {
      // ignore
    }
  }
}
