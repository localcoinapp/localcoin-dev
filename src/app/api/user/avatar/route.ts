
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { firestore, bucket } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `avatar.${extension}`;
    const destinationPath = `users/${userId}/${filename}`;

    let url: string;

    if (process.env.NODE_ENV === 'production') {
       if (!bucket.name) {
        throw new Error(
          'Firebase Storage bucket is not configured. Set FIREBASE_STORAGE_BUCKET env variable.'
        );
      }

      const fileInBucket = bucket.file(destinationPath);
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      await fileInBucket.save(fileBuffer, {
        metadata: {
          contentType: file.type,
          cacheControl: 'public, max-age=31536000',
        },
      });
      
      const [signedUrl] = await fileInBucket.getSignedUrl({
        action: 'read',
        expires: '2150-01-01', // A very long-lived URL
      });
      url = signedUrl;

    } else {
      const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
      const relativePath = `users/${userId}/${filename}`;
      const directory = path.join(UPLOAD_DIR, path.dirname(relativePath));
      await fs.mkdir(directory, { recursive: true });
      const filePath = path.join(directory, path.basename(relativePath));
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, fileBuffer);
      url = `/api/serve-uploads/${relativePath}`;
    }

    await firestore.collection("users").doc(userId).update({ avatar: url });

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Error in avatar upload API:', error);
    return NextResponse.json(
      { error: 'Failed to save avatar', details: error.message },
      { status: 500 }
    );
  }
}
