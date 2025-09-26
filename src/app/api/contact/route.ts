
// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';

export async function POST(req: NextRequest) {
  try {
    // The recipient email address is hardcoded for reliability.
    const to = 'admin@localcoin.cloud';

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { subject, html } = body;
    if (!subject || !html) {
      return NextResponse.json({ error: 'Missing required fields: subject and html' }, { status: 400 });
    }

    // The `sendEmail` function will handle all SMTP logic and errors.
    await sendEmail({ to, subject, html });

    return NextResponse.json({ message: 'Email sent successfully' }, { status: 200 });

  } catch (err: any) {
    // This will catch errors from `sendEmail` (like SMTP failures) or JSON parsing.
    console.error('/api/contact error (detailed):', {
      message: err?.message,
      code: err?.code,
      response: err?.response,
      command: err?.command,
    });
    
    // Return a structured JSON error to the client.
    return NextResponse.json(
      { 
        error: 'Failed to send email.', 
        details: err.message || 'An unknown server error occurred.' 
      }, 
      { status: 500 } // Use 500 for server-side failures.
    );
  }
}
