
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendEmail } from '@/lib/mail';
import type { User, Merchant } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { recipientGroup, subject, body } = await req.json();
    console.log('Step 1: API route /api/admin/send-push-email called.');
    console.log('Step 2: Received data - Group:', recipientGroup, 'Subject:', subject);

    if (!recipientGroup || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    let userEmails: string[] = [];
    let merchantEmails: string[] = [];

    if (recipientGroup === 'all_users' || recipientGroup === 'both') {
      console.log("Fetching users from 'users' collection...");
      const usersSnapshot = await getDocs(collection(db, 'users'));
      userEmails = usersSnapshot.docs
          .map(doc => (doc.data() as User).email)
          .filter((email): email is string => !!email);
      console.log(`Found ${userEmails.length} user emails.`);
    }

    if (recipientGroup === 'all_merchants' || recipientGroup === 'both') {
      console.log("Fetching merchants from 'merchants' collection...");
      const merchantsSnapshot = await getDocs(collection(db, 'merchants'));
      merchantEmails = merchantsSnapshot.docs
          .map(doc => (doc.data() as Merchant).contactEmail)
          .filter((email): email is string => !!email);
      console.log(`Found ${merchantEmails.length} merchant emails.`);
    }

    const finalRecipients = [...new Set([...userEmails, ...merchantEmails])];
    
    console.log(`Step 3: Preparing to send email to ${finalRecipients.length} unique recipient(s).`);

    if (finalRecipients.length > 0) {
        for (const email of finalRecipients) {
            try {
                await sendEmail({
                    to: email,
                    subject: subject,
                    html: body.replace(/\n/g, '<br>'),
                });
                console.log(`Successfully sent email to ${email}`);
            } catch (emailError) {
                console.error(`Failed to send email to ${email}:`, emailError);
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
