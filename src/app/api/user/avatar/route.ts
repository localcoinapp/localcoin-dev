
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
        
        // Save to the non-public 'uploads' directory
        const dir = join(process.cwd(), 'uploads', 'users', userId);
        
        // Create the directory if it doesn't exist
        await mkdir(dir, { recursive: true });

        const path = join(dir, filename);
        await writeFile(path, fileBuffer);

        // The URL will point to our new serving API route
        const url = `/api/uploads/users/${userId}/${filename}`;

        // Also update the user's profile in Firestore
        const userDocRef = doc(db, "users", userId);
        await setDoc(userDocRef, { avatar: url }, { merge: true });

        // We can still attempt to update the auth profile, but Firestore is the source of truth for the app UI
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === userId) {
            await updateProfile(currentUser, { photoURL: url });
        }


        return NextResponse.json({ url });
    } catch (error) {
        console.error('Error saving file:', error);
        return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
    }
}
