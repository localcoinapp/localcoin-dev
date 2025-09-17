
import nodemailer from 'nodemailer';

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

  const transportOptions: nodemailer.TransportOptions = {
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT!),
    // Let nodemailer handle 'secure' automatically based on port.
    // It will use STARTTLS for 587 and direct SSL for 465.
  };

  // If credentials are provided in the environment, use them.
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transportOptions.auth = {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
      };
  }

  const transporter = nodemailer.createTransport(transportOptions);

  // Verify connection configuration
  transporter.verify((error) => {
    if (error) {
      console.error("SMTP Connection Error:", error);
    } else {
      console.log("SMTP server is ready to take our messages");
    }
  });
  
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
