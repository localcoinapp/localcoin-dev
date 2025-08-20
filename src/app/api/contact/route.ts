
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const origin = req.nextUrl.origin;
    const response = await fetch(`${origin}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to send contact email via API route.');
    }

    return NextResponse.json({ message: 'Email sent successfully' });
    
  } catch (error) {
    console.error('Error in /api/contact:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
