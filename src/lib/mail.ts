
import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Generic transporter configuration for any SMTP server
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
  }
});

transporter.verify(function(error, success) {
  if (error) {
    console.log("SMTP Connection Error:", error);
  } else {
    console.log("SMTP server is ready to take our messages");
  }
});

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'LocalCoin'}" <${process.env.SMTP_FROM}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    // Throw a detailed error to be caught by the API route
    throw new Error(`Failed to send email: ${(error as Error).message}. Please check your credentials and SMTP settings.`);
  }
}
