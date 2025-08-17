
import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Create a transporter object using generic SMTP settings
// These must be configured in your .env file
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  // Verify connection configuration on first use or if there are issues.
  // In a production app, you might do this less frequently.
  try {
      await transporter.verify();
      console.log("SMTP server connection is ready.");
  } catch(error) {
      console.error("SMTP Connection Error:", error);
      throw new Error(`SMTP Connection Failed: ${(error as Error).message}. Please check your credentials and SMTP settings.`);
  }


  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'LocalCoin Marketplace'}" <${process.env.SMTP_FROM}>`, // sender address
    to, // list of receivers
    subject, // Subject line
    html, // html body
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${(error as Error).message}`);
  }
}
