
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { auth, db } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
        return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
    }

    try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        // Use a generic name like 'avatar' and preserve the extension
        const extension = file.name.split('.').pop();
        const filename = `avatar.${extension}`;
        const dir = join(process.cwd(), 'public', 'users', userId);
        
        // Create the directory if it doesn't exist
        await mkdir(dir, { recursive: true });

        const path = join(dir, filename);
        await writeFile(path, fileBuffer);

        const url = `/users/${userId}/${filename}`;

        // Also update the user's profile in Firebase
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === userId) {
            await updateProfile(currentUser, { photoURL: url });
            const userDocRef = doc(db, "users", userId);
            await setDoc(userDocRef, { avatar: url }, { merge: true });
        } else {
            // This case might happen if the token is expired or there's a mismatch.
            // For now, we'll log it, but in a real app, you might want more robust error handling.
            console.warn("User from request does not match authenticated user. Profile not updated in Firebase.");
        }


        return NextResponse.json({ url });
    } catch (error) {
        console.error('Error saving file:', error);
        return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
    }
}
