
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // --- Environment Variable Check for email sending capabilities ---
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'NEXT_PUBLIC_CONTACT_EMAIL'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    const errorMsg = `Server is not configured for sending emails. Missing: ${missingVars.join(', ')}`;
    console.error(`CRITICAL: ${errorMsg}`);
    return NextResponse.json({ error: 'Failed to send email.', details: errorMsg }, { status: 500 });
  }
  // ---------------------------------
  
  try {
    const origin = req.nextUrl.origin;
    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
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
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to send email', details: errorMessage }, { status: 500 });
  }
}
