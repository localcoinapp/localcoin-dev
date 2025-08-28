
import { NextRequest, NextResponse } from 'next/server';
import { adminStorage } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const merchantId = formData.get('merchantId') as string;
    const fileType = formData.get('fileType') as 'logo' | 'banner';

    if (!file || !merchantId || !fileType) {
        return NextResponse.json({ error: 'Missing file, merchantId, or fileType' }, { status: 400 });
    }

    try {
        const bucket = adminStorage.bucket();
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        
        // Define the path in Firebase Storage
        const extension = file.name.split('.').pop() || 'png';
        const filename = `${fileType}.${extension}`;
        const filePath = `merchants/${merchantId}/${filename}`;
        
        const fileUpload = bucket.file(filePath);

        await fileUpload.save(fileBuffer, {
            metadata: {
                contentType: file.type,
            },
        });

        // Make the file public and get its URL
        await fileUpload.makePublic();
        const url = fileUpload.publicUrl();

        // Update the merchant's profile in Firestore with the new public URL
        const merchantDocRef = doc(db, "merchants", merchantId);
        await setDoc(merchantDocRef, { [fileType]: url }, { merge: true });
        
        return NextResponse.json({ url });

    } catch (error) {
        console.error('Error uploading file to Firebase Storage:', error);
        return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
    }
}
