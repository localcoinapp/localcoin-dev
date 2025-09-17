
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

/**
 * Creates a Nodemailer transport based on environment variables.
 * Uses a concrete SMTPTransport.Options type to ensure `auth` is a valid property.
 */
function createMailTransport(): Transporter {
  // Use the concrete SMTP options type so `auth` is valid
  const transportOptions: SMTPTransport.Options = {
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for others (STARTTLS)
  };

  // Add auth block only if credentials are provided
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transportOptions.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    };
  }

  // Fallback for local development if no host is set, to prevent network errors
  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  return nodemailer.createTransport(transportOptions);
}


interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  // --- Environment Variable Check ---
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_FROM'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    const errorMsg = `Server is not configured for sending emails. Missing: ${missingVars.join(', ')}`;
    console.error(`CRITICAL: ${errorMsg}`);
    throw new Error(errorMsg);
  }
  // ---------------------------------
  
  const transporter = createMailTransport();

  // Verify connection configuration in development
  if (process.env.NODE_ENV !== 'production') {
      transporter.verify((error) => {
        if (error) {
          console.error("SMTP Connection Error:", error);
        } else {
          console.log("SMTP server is ready to take our messages");
        }
      });
  }
  
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  };

  console.log(`Attempting to send email from: ${mailOptions.from} to: ${to}`);
  const info = await transporter.sendMail(mailOptions);
  console.log('Message sent: %s', info.messageId);
  console.log('Full SMTP response:', info.response);
  return info;
}
