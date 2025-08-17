
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';
import { siteConfig } from '@/config/site';

export async function POST(req: NextRequest) {
  try {
    const { to } = await req.json();

    if (!to) {
      return NextResponse.json({ error: 'Recipient email address is required' }, { status: 400 });
    }

    const subject = `Test Email from ${siteConfig.name}`;
    const html = `
      <h1>SMTP Configuration Test</h1>
      <p>This is a test email to confirm that your SMTP settings are configured correctly.</p>
      <p>If you have received this, your email service is working.</p>
      <br/>
      <p>Sent at: ${new Date().toUTCString()}</p>
    `;

    await sendEmail({ to, subject, html });

    return NextResponse.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Error in /api/admin/send-test-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    // Pass the specific error message to the frontend for better debugging.
    return NextResponse.json({ error: 'Failed to send test email.', details: errorMessage }, { status: 500 });
  }
}
