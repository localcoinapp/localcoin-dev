
import { NextRequest, NextResponse } from 'next/server';
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
    
    const origin = req.nextUrl.origin;
    const response = await fetch(`${origin}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to send test email via API route.');
    }

    return NextResponse.json({ message: 'Test email sent successfully' });

  } catch (error) {
    console.error('Error in /api/admin/send-test-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to send test email.', details: errorMessage }, { status: 500 });
  }
}
