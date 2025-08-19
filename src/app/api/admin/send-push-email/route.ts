
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendEmail } from '@/lib/mail';
import type { User, Merchant } from '@/types';

export async function POST(req: NextRequest) {
  console.log('--- Received POST /api/admin/send-push-email ---');
  try {
    const { recipientGroup, subject, body } = await req.json();
    console.log(`Step 1: Payload received: recipientGroup='${recipientGroup}', subject='${subject.substring(0, 30)}...'`);

    if (!recipientGroup || !subject || !body) {
      console.error('Validation failed: Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let userEmails: string[] = [];
    let merchantEmails: string[] = [];
    
    if (recipientGroup === 'all_users' || recipientGroup === 'both') {
        console.log("Step 2a: Fetching all users from the 'users' collection...");
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        userEmails = usersSnapshot.docs
            .map(doc => (doc.data() as User).email)
            .filter((email): email is string => !!email);
        console.log(`Step 2b: Found ${userEmails.length} user email(s).`);
    }

    if (recipientGroup === 'all_merchants' || recipientGroup === 'both') {
        console.log("Step 3a: Fetching merchants from the 'merchants' collection...");
        const merchantsRef = collection(db, 'merchants');
        const merchantsSnapshot = await getDocs(merchantsRef);
        merchantEmails = merchantsSnapshot.docs
            .map(doc => (doc.data() as Merchant).contactEmail)
            .filter((email): email is string => !!email);
        console.log(`Step 3b: Found ${merchantEmails.length} merchant email(s).`);
    }

    // Combine and de-duplicate the lists
    const recipients = [...new Set([...userEmails, ...merchantEmails])];
    console.log(`Step 4: Combined and de-duplicated list. Total unique recipients: ${recipients.length}.`);

    // --- THIS IS THE FINAL CONSOLE LOG YOU REQUESTED ---
    console.log(`Step 5: Preparing to send email to the following recipients:`, recipients);
    
    if (recipients.length === 0) {
        console.log("Step 6: No recipients found for the selected group. Exiting.");
        return NextResponse.json({ message: 'No recipients found for the selected group.', recipientCount: 0 });
    }
    
    for (const email of recipients) {
      try {
        await sendEmail({
          to: email,
          subject: subject,
          html: body.replace(/\n/g, '<br>'),
        });
        console.log(`Successfully queued email for ${email}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
      }
    }

    console.log("Step 7: All emails have been processed by the sendEmail function.");
    return NextResponse.json({ message: 'Push email sent successfully.', recipientCount: recipients.length });

  } catch (error) {
    console.error('Error in /api/admin/send-push-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to send push email.', details: errorMessage }, { status: 500 });
  }
}
