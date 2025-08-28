
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const runtime = 'nodejs';

// This is the base directory on the server's filesystem where uploads are stored.
// On a self-hosted VM, this should be an absolute path outside the app's code,
// e.g., '/var/www/uploads'. The default is for local development.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const merchantId = formData.get('merchantId') as string | null;
    const fileType = formData.get('fileType') as 'logo' | 'banner' | null;

    if (!file || !merchantId || !fileType) {
      return NextResponse.json(
        { error: 'Missing file, merchantId, or fileType' },
        { status: 400 }
      );
    }

    // --- Create directory if it doesn't exist ---
    const merchantUploadDir = path.join(UPLOAD_DIR, 'merchants', merchantId);
    await fs.mkdir(merchantUploadDir, { recursive: true });
    // ---------------------------------------------

    // --- Standardize filename ---
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `${fileType}.${extension}`;
    const filePath = path.join(merchantUploadDir, filename);
    // --------------------------

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, fileBuffer);

    // The URL path should be relative and handled by our serving API
    const url = `/api/serve-uploads/merchants/${merchantId}/${filename}`;

    // Update Firestore with the relative URL
    const merchantDocRef = doc(db, 'merchants', merchantId);
    await updateDoc(merchantDocRef, { [fileType]: url });

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Error in upload API:', error);
    return NextResponse.json(
      { error: 'Failed to save file', details: error.message },
      { status: 500 }
    );
  }
}
