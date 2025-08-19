
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendEmail } from '@/lib/mail';
import type { User, Merchant } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { recipientGroup, subject, body } = await req.json();

    if (!recipientGroup || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    let finalRecipients: string[] = [];

    // --- Fetch ALL potential recipients first ---
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const allUserEmails = usersSnapshot.docs
        .map(doc => (doc.data() as User).email)
        .filter((email): email is string => !!email);

    const merchantsSnapshot = await getDocs(collection(db, 'merchants'));
    const allMerchantEmails = merchantsSnapshot.docs
        .map(doc => (doc.data() as Merchant).contactEmail)
        .filter((email): email is string => !!email);
    
    // --- Determine the final recipient list based on selection ---
    if (recipientGroup === 'all_users') {
        finalRecipients = allUserEmails;
    } else if (recipientGroup === 'all_merchants') {
        finalRecipients = allMerchantEmails;
    } else if (recipientGroup === 'both') {
        finalRecipients = [...new Set([...allUserEmails, ...allMerchantEmails])];
    }
    
    if (finalRecipients.length > 0) {
        // We are not logging server-side anymore as per the debugging flow
        // The list is now returned to the client to be logged there.
        for (const email of finalRecipients) {
            try {
                await sendEmail({
                    to: email,
                    subject: subject,
                    html: body.replace(/\n/g, '<br>'),
                });
            } catch (emailError) {
                console.error(`Failed to send email to ${email}:`, emailError);
                // Continue to next email even if one fails
            }
        }
    }

    // Return the list of recipients and the count to the client.
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
