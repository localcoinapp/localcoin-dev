
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendEmail } from '@/lib/mail';
import type { User } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { recipientGroup, subject, body } = await req.json();

    if (!recipientGroup || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let recipients: string[] = [];
    const usersRef = collection(db, 'users');
    
    // Fetch merchants if requested
    if (recipientGroup === 'all_merchants' || recipientGroup === 'both') {
        console.log("Fetching merchants...");
        const merchantsQuery = query(usersRef, where('role', '==', 'merchant'));
        const merchantsSnapshot = await getDocs(merchantsQuery);
        const merchantEmails = merchantsSnapshot.docs.map(doc => (doc.data() as User).email).filter(Boolean) as string[];
        recipients.push(...merchantEmails);
        console.log(`Found ${merchantEmails.length} merchant(s).`);
    }

    // Fetch all users if requested
    if (recipientGroup === 'all_users' || recipientGroup === 'both') {
        console.log("Fetching all users...");
        // Note: This fetches everyone, including merchants and admins.
        const usersSnapshot = await getDocs(usersRef);
        const userEmails = usersSnapshot.docs.map(doc => (doc.data() as User).email).filter(Boolean) as string[];
        recipients.push(...userEmails);
        console.log(`Found ${userEmails.length} total user(s).`);
    }

    // Remove duplicates if 'both' was selected, ensuring each person gets only one email
    if (recipients.length > 0) {
      recipients = [...new Set(recipients)];
    }
    
    console.log(`Sending email to ${recipients.length} unique recipient(s).`);

    if (recipients.length === 0) {
        return NextResponse.json({ message: 'No recipients found for the selected group.', recipientCount: 0 });
    }
    
    // We send emails one by one to avoid showing all recipients in the "To" field.
    // For large lists, a dedicated bulk email service would be better.
    console.log(`Attempting to send email to: ${recipients.join(', ')}`);
    for (const email of recipients) {
      await sendEmail({
        to: email,
        subject: subject,
        html: body.replace(/\n/g, '<br>'), // Basic conversion of newlines to <br>
      });
      console.log(`Successfully queued email for ${email}`);
    }

    return NextResponse.json({ message: 'Push email sent successfully.', recipientCount: recipients.length });

  } catch (error) {
    console.error('Error in /api/admin/send-push-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to send push email.', details: errorMessage }, { status: 500 });
  }
}
