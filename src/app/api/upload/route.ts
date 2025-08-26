
import { NextRequest, NextResponse } from 'next/server';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from '@/lib/firebase';

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const merchantId = formData.get('merchantId') as string;

    if (!file || !merchantId) {
        return NextResponse.json({ error: 'Missing file or merchantId' }, { status: 400 });
    }

    try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        
        // Create a storage reference
        const storageRef = ref(storage, `merchants/${merchantId}/${file.name}`);

        // Upload the file
        const uploadTask = await uploadBytesResumable(storageRef, fileBuffer, {
            contentType: file.type,
        });

        // Get the public download URL
        const downloadURL = await getDownloadURL(uploadTask.ref);

        return NextResponse.json({ url: downloadURL });

    } catch (error) {
        console.error('Error uploading file to Firebase Storage:', error);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
}
