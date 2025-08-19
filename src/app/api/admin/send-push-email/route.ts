
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query } from 'firebase/firestore';
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
    
    // --- Fetch ALL potential recipients first ---
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const allUserEmails = usersSnapshot.docs
        .map(doc => (doc.data() as User).email)
        .filter((email): email is string => !!email);
    console.log(`Step 2: Fetched ${allUserEmails.length} total user emails from 'users' collection.`);

    const merchantsSnapshot = await getDocs(collection(db, 'merchants'));
    const allMerchantEmails = merchantsSnapshot.docs
        .map(doc => (doc.data() as Merchant).contactEmail)
        .filter((email): email is string => !!email);
    console.log(`Step 3: Fetched ${allMerchantEmails.length} total merchant emails from 'merchants' collection.`);

    // --- Determine the final recipient list ---
    let finalRecipients: string[] = [];
    if (recipientGroup === 'all_users') {
        finalRecipients = allUserEmails;
    } else if (recipientGroup === 'all_merchants') {
        finalRecipients = allMerchantEmails;
    } else if (recipientGroup === 'both') {
        finalRecipients = [...new Set([...allUserEmails, ...allMerchantEmails])];
    }
    
    // --- THIS IS THE FINAL CONSOLE LOG YOU REQUESTED ---
    console.log(`Step 4: Preparing to send email to ${finalRecipients.length} unique recipient(s):`, finalRecipients);
    
    if (finalRecipients.length === 0) {
        console.log("Step 5: No recipients found for the selected group. Exiting.");
        return NextResponse.json({ message: 'No recipients found for the selected group.', recipientCount: 0 });
    }
    
    // Using a separate loop for sending allows us to log errors without stopping the whole process.
    let sentCount = 0;
    for (const email of finalRecipients) {
      try {
        await sendEmail({
          to: email,
          subject: subject,
          html: body.replace(/\n/g, '<br>'), // Basic HTML conversion for newlines
        });
        console.log(`Successfully queued email for ${email}`);
        sentCount++;
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
        // We will not re-throw here, so the process continues for other users.
        // The overall result will still indicate success but the console will contain the specific error.
      }
    }

    console.log(`Step 6: Finished processing. Successfully sent ${sentCount} of ${finalRecipients.length} emails.`);
    return NextResponse.json({ message: 'Push email process completed.', recipientCount: sentCount });

  } catch (error) {
    console.error('CRITICAL Error in /api/admin/send-push-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    // Ensure an error is always returned to the client in case of a crash.
    return NextResponse.json({ error: 'Failed to send push email.', details: errorMessage }, { status: 500 });
  }
}
