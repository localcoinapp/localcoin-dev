
import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Create a transporter object using Gmail's service settings.
// This is more reliable for Gmail than generic SMTP.
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use the built-in Gmail service
  auth: {
    user: process.env.SMTP_USER, // Your full Gmail address
    pass: process.env.SMTP_PASS, // An App Password if 2-Step Verification is enabled
  },
});

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  // Verify connection configuration on first use or if there are issues.
  try {
      await transporter.verify();
      console.log("SMTP server connection is ready.");
  } catch(error) {
      console.error("SMTP Connection Error:", error);
      // Provide a more specific error for App Password issues.
      if ((error as any).code === 'EAUTH') {
          throw new Error(`SMTP Connection Failed: Invalid credentials. If you're using Gmail with 2-Step Verification, you must generate and use an App Password. Regular passwords will not work.`);
      }
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
    // Throw a more specific error to be caught by the API route
    throw new Error(`Failed to send email: ${(error as Error).message}`);
  }
}
