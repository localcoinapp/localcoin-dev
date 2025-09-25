
// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const to = process.env.CONTACT_EMAIL || process.env.SMTP_TO || process.env.NEXT_PUBLIC_CONTACT_EMAIL;
    if (!to) {
      console.error('CRITICAL: CONTACT_EMAIL / SMTP_TO / NEXT_PUBLIC_CONTACT_EMAIL not set.');
      return NextResponse.json({ error: 'Server not configured to receive contact emails' }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const { subject, html } = body;
    if (!subject || !html) {
      return NextResponse.json({ error: 'Missing required fields: subject and html' }, { status: 400 });
    }

    await sendEmail({ to, subject, html });

    return NextResponse.json({ message: 'Email sent successfully' }, { status: 200 });

  } catch (err: any) {
    // Log the full error on the server for debugging
    console.error('/api/contact error (detailed):', {
      message: err?.message,
      code: err?.code,
      response: err?.response,
      smtpResponse: err?.smtpResponse,
      command: err?.command,
      stack: err?.stack,
    });
    
    // Return a structured JSON error to the client instead of crashing
    return NextResponse.json(
      { 
        error: 'Failed to send email.', 
        details: err.message || 'An unknown server error occurred.' 
      }, 
      { status: 500 }
    );
  }
}
