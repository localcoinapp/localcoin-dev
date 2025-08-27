
import { NextRequest, NextResponse } from 'next/server';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import mime from 'mime-types';

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
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        
        // Use a generic name like 'logo' or 'banner' and preserve the extension
        const extension = file.name.split('.').pop() || mime.extension(file.type) || 'png';
        const filename = `${fileType}.${extension}`;
        const storagePath = `merchants/${merchantId}/${filename}`;
        
        const storageRef = ref(storage, storagePath);

        const metadata = { contentType: file.type };
        await uploadBytes(storageRef, fileBuffer, metadata);

        const url = await getDownloadURL(storageRef);
        
        return NextResponse.json({ url });

    } catch (error) {
        console.error('Error uploading merchant file to Cloud Storage:', error);
        return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
    }
}
