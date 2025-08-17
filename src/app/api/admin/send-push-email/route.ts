
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
    
    if (recipientGroup === 'all_users' || recipientGroup === 'both') {
        const usersSnapshot = await getDocs(usersRef);
        usersSnapshot.forEach(doc => {
            const user = doc.data() as User;
            if (user.email) recipients.push(user.email);
        });
    }
    
    if (recipientGroup === 'all_merchants' || recipientGroup === 'both') {
        const merchantsQuery = query(usersRef, where('role', '==', 'merchant'));
        const merchantsSnapshot = await getDocs(merchantsQuery);
        merchantsSnapshot.forEach(doc => {
            const merchant = doc.data() as User;
            if (merchant.email) recipients.push(merchant.email);
        });
    }

    // Remove duplicates if 'both' was selected
    if (recipientGroup === 'both') {
      recipients = [...new Set(recipients)];
    }

    if (recipients.length === 0) {
        return NextResponse.json({ error: 'No recipients found for the selected group.' }, { status: 404 });
    }
    
    // We send emails one by one to avoid showing all recipients in the "To" field.
    // For large lists, a dedicated bulk email service would be better.
    for (const email of recipients) {
      await sendEmail({
        to: email,
        subject: subject,
        html: body.replace(/\n/g, '<br>'), // Basic conversion of newlines to <br>
      });
    }

    return NextResponse.json({ message: 'Push email sent successfully.', recipientCount: recipients.length });

  } catch (error) {
    console.error('Error in /api/admin/send-push-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to send push email.', details: errorMessage }, { status: 500 });
  }
}
