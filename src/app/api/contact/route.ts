
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
