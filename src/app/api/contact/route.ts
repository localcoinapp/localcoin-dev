
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // The recipient email is now securely handled on the server.
    const to = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
    if (!to) {
      console.error('CRITICAL: NEXT_PUBLIC_CONTACT_EMAIL is not set in the environment.');
      throw new Error('The server is not configured to receive contact emails.');
    }

    const { subject, html } = await req.json();

    if (!subject || !html) {
      return NextResponse.json({ error: 'Missing required fields: subject and html' }, { status: 400 });
    }
    
    // Use the direct sendEmail function
    await sendEmail({ to, subject, html });

    return NextResponse.json({ message: 'Email sent successfully' });
    
  } catch (error) {
    console.error('Error in /api/contact:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to send email', details: errorMessage }, { status: 500 });
  }
}
