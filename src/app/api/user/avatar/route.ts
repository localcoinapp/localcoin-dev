
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import mime from 'mime-types';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export const runtime = 'nodejs';

// Define the base directory for uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public/uploads');

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
        return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
    }

    try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        
        const dirPath = path.join(UPLOAD_DIR, 'users', userId);
        await fs.mkdir(dirPath, { recursive: true });
        
        const extension = file.name.split('.').pop() || mime.extension(file.type) || 'png';
        const filename = `avatar.${extension}`;
        const fullPath = path.join(dirPath, filename);
        
        await fs.writeFile(fullPath, fileBuffer);

        const url = `/uploads/users/${userId}/${filename}`;

        // Also update the user's profile in Firestore
        const userDocRef = doc(db, "users", userId);
        await setDoc(userDocRef, { avatar: url }, { merge: true });

        return NextResponse.json({ url });
    } catch (error) {
        console.error('Error saving user avatar to filesystem:', error);
        return NextResponse.json({ error: 'Failed to save avatar file' }, { status: 500 });
    }
}
