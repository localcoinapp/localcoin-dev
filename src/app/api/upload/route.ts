
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const merchantId = formData.get('merchantId') as string;
    const fileType = formData.get('fileType') as 'logo' | 'banner'; // e.g., 'logo' or 'banner'

    if (!file || !merchantId || !fileType) {
        return NextResponse.json({ error: 'Missing file, merchantId, or fileType' }, { status: 400 });
    }

    try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        
        // Use a generic name like 'logo' or 'banner' and preserve the extension
        const extension = file.name.split('.').pop();
        const filename = `${fileType}.${extension}`;
        
        // Save to a non-public 'uploads' directory at the project root
        const dir = join(process.cwd(), 'uploads', 'merchants', merchantId);
        
        // Create the directory if it doesn't exist
        await mkdir(dir, { recursive: true });

        const path = join(dir, filename);
        await writeFile(path, fileBuffer);

        // The URL will point to our new serving API route
        const url = `/api/uploads/merchants/${merchantId}/${filename}`;
        
        return NextResponse.json({ url });

    } catch (error) {
        console.error('Error saving merchant file:', error);
        return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
    }
}
