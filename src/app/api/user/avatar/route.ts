
import { NextRequest, NextResponse } from 'next/server';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import mime from 'mime-types';


export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
        return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
    }

    try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        
        const extension = file.name.split('.').pop() || mime.extension(file.type) || 'png';
        const filename = `avatar.${extension}`;
        const storagePath = `users/${userId}/${filename}`;
        
        const storageRef = ref(storage, storagePath);
        
        const metadata = { contentType: file.type };
        await uploadBytes(storageRef, fileBuffer, metadata);

        const url = await getDownloadURL(storageRef);

        // Also update the user's profile in Firestore
        const userDocRef = doc(db, "users", userId);
        await setDoc(userDocRef, { avatar: url }, { merge: true });

        return NextResponse.json({ url });
    } catch (error) {
        console.error('Error uploading user avatar to Cloud Storage:', error);
        return NextResponse.json({ error: 'Failed to save avatar file' }, { status: 500 });
    }
}
