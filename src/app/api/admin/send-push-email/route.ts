
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Merchant } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { recipientGroup, subject, body } = await req.json();

    if (!recipientGroup || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    let userEmails: string[] = [];
    let merchantEmails: string[] = [];

    if (recipientGroup === 'all_users' || recipientGroup === 'both') {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      userEmails = usersSnapshot.docs
          .map(doc => (doc.data() as User).email)
          .filter((email): email is string => !!email);
    }

    if (recipientGroup === 'all_merchants' || recipientGroup === 'both') {
      const merchantsSnapshot = await getDocs(collection(db, 'merchants'));
      merchantEmails = merchantsSnapshot.docs
          .map(doc => (doc.data() as Merchant).contactEmail)
          .filter((email): email is string => !!email);
    }

    const finalRecipients = [...new Set([...userEmails, ...merchantEmails])];
    
    console.log(`Preparing to send email to ${finalRecipients.length} unique recipient(s).`);
    
    if (finalRecipients.length > 0) {
        const origin = req.nextUrl.origin;
        for (const email of finalRecipients) {
            try {
                const html = body.replace(/\n/g, '<br>');
                await fetch(`${origin}/api/send-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ to: email, subject, html }),
                });
                console.log(`Successfully queued email to ${email}`);
            } catch (emailError) {
                console.error(`Failed to queue email to ${email}:`, emailError);
            }
        }
    }

    return NextResponse.json({ 
        message: 'Push email process completed.', 
        recipientCount: finalRecipients.length,
        recipients: finalRecipients 
    });

  } catch (error) {
    console.error('CRITICAL Error in /api/admin/send-push-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json({ error: 'Failed to send push email.', details: errorMessage }, { status: 500 });
  }
}
