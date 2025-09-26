
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';

async function verifyRecaptcha(token: string): Promise<boolean> {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
        console.error("CRITICAL: RECAPTCHA_SECRET_KEY is not set.");
        // Fail open or closed? For anti-spam, failing closed is safer.
        return false;
    }

    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;

    try {
        const response = await fetch(verificationUrl, { method: 'POST' });
        const data: { success: boolean, [key: string]: any } = await response.json();
        return data.success;
    } catch (error) {
        console.error("Error verifying reCAPTCHA:", error);
        return false;
    }
}


export async function POST(req: NextRequest) {
  try {
    const to = process.env.SMTP_FROM;
    if (!to) {
      const errorMsg = 'The recipient email address (SMTP_FROM) is not set.';
      console.error('CRITICAL:', errorMsg);
      return NextResponse.json({ error: 'Server not configured to receive contact emails', details: errorMsg }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { subject, html, recaptchaToken } = body;
    if (!subject || !html || !recaptchaToken) {
      return NextResponse.json({ error: 'Missing required fields: subject, html, and recaptchaToken' }, { status: 400 });
    }

    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isRecaptchaValid) {
        return NextResponse.json({ error: 'reCAPTCHA verification failed', details: 'Invalid or expired reCAPTCHA token.' }, { status: 403 });
    }

    await sendEmail({ to, subject, html });

    return NextResponse.json({ message: 'Email sent successfully' }, { status: 200 });

  } catch (err: any) {
    console.error('/api/contact error (detailed):', {
      message: err?.message,
      code: err?.code,
      response: err?.response,
      command: err?.command,
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to send email.', 
        details: err.message || 'An unknown server error occurred.' 
      }, 
      { status: 500 }
    );
  }
}
