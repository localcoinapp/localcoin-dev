
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const transporter = nodemailer.createTransport({
    pool: true,
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

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

export async function POST(req: NextRequest) {
  // --- Environment Variable Check ---
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    const errorMsg = `Server is not configured for sending emails. Missing: ${missingVars.join(', ')}`;
    console.error(`CRITICAL: ${errorMsg}`);
    return NextResponse.json({ error: 'Failed to send email.', details: errorMsg }, { status: 500 });
  }
  // ---------------------------------

  try {
    const body: SendEmailOptions = await req.json();
    const { to, subject, html } = body;

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await sendEmail({ to, subject, html });

    return NextResponse.json({ message: 'Email sent successfully' });

  } catch (error) {
    console.error('Error in /api/send-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json({ error: 'Failed to send email.', details: errorMessage }, { status: 500 });
  }
}
