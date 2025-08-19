
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendEmail } from '@/lib/mail';
import type { User, Merchant } from '@/types';

export async function POST(req: NextRequest) {
  console.log('--- Received POST /api/admin/send-push-email ---');
  try {
    const { recipientGroup, subject, body } = await req.json();
    console.log(`Payload received: recipientGroup='${recipientGroup}', subject='${subject.substring(0, 30)}...'`);

    if (!recipientGroup || !subject || !body) {
      console.error('Validation failed: Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let recipients: string[] = [];
    
    // Logic for fetching 'merchants'
    if (recipientGroup === 'all_merchants' || recipientGroup === 'both') {
        console.log("Step 1: Fetching merchants from the 'merchants' collection...");
        const merchantsRef = collection(db, 'merchants');
        // No specific query needed, we get all merchants and their contact emails
        const merchantsSnapshot = await getDocs(merchantsRef);
        const merchantEmails = merchantsSnapshot.docs
            .map(doc => (doc.data() as Merchant).contactEmail)
            .filter((email): email is string => !!email); // Ensure email is not null/undefined
        recipients.push(...merchantEmails);
        console.log(`Found ${merchantEmails.length} merchant email(s).`);
    }

    // Logic for fetching 'users'
    if (recipientGroup === 'all_users' || recipientGroup === 'both') {
        console.log("Step 2: Fetching all users from the 'users' collection...");
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const userEmails = usersSnapshot.docs
            .map(doc => (doc.data() as User).email)
            .filter((email): email is string => !!email); // Ensure email is not null/undefined
        recipients.push(...userEmails);
        console.log(`Found ${userEmails.length} total user email(s).`);
    }

    // De-duplicate the list
    if (recipients.length > 0) {
      const initialCount = recipients.length;
      recipients = [...new Set(recipients)];
      console.log(`Step 3: De-duplicated recipients: ${initialCount} -> ${recipients.length} unique emails.`);
    }
    
    if (recipients.length === 0) {
        console.log("Step 4: No recipients found for the selected group. Exiting.");
        return NextResponse.json({ message: 'No recipients found for the selected group.', recipientCount: 0 });
    }
    
    // --- THIS IS THE NEW CONSOLE LOG YOU REQUESTED ---
    console.log(`Step 4: Preparing to send email to ${recipients.length} unique recipient(s):`, recipients);
    
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
        // Continue to next email even if one fails
      }
    }

    console.log("Step 5: All emails have been processed by the sendEmail function.");
    return NextResponse.json({ message: 'Push email sent successfully.', recipientCount: recipients.length });

  } catch (error) {
    console.error('Error in /api/admin/send-push-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to send push email.', details: errorMessage }, { status: 500 });
  }
}
