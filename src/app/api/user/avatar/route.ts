import { NextRequest, NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
        return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
    }

    try {
        const bucket = adminStorage.bucket();
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        
        // Define the path in Firebase Storage
        const extension = file.name.split('.').pop() || 'png';
        const filename = `avatar.${extension}`;
        const filePath = `users/${userId}/${filename}`;
        
        const fileUpload = bucket.file(filePath);

        await fileUpload.save(fileBuffer, {
            metadata: {
                contentType: file.type,
            },
        });

        // Make the file public and get its URL
        await fileUpload.makePublic();
        const url = fileUpload.publicUrl();

        // Update the user's profile in Firestore with the new public URL
        const userDocRef = doc(db, "users", userId);
        await setDoc(userDocRef, { avatar: url }, { merge: true });

        return NextResponse.json({ url });
    } catch (error) {
        console.error('Error uploading avatar to Firebase Storage:', error);
        return NextResponse.json({ error: 'Failed to save avatar file' }, { status: 500 });
    }
}
