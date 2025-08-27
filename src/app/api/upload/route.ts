
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import mime from 'mime-types';

export const runtime = 'nodejs';

// Define the base directory for uploads. On a production VM, you would set this
// via an environment variable to a persistent path like /var/www/uploads.
// The default saves to the public folder, which works for local dev but is ephemeral in most cloud environments.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');

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
        
        // Define the directory path for this specific merchant
        const dirPath = path.join(UPLOAD_DIR, 'merchants', merchantId);
        // Ensure the directory exists
        await fs.mkdir(dirPath, { recursive: true });

        // Use a generic name like 'logo' or 'banner' and preserve the extension
        const extension = mime.extension(file.type) || file.name.split('.').pop() || 'png';
        const filename = `${fileType}.${extension}`;
        const fullPath = path.join(dirPath, filename);

        // Write the file to the filesystem
        await fs.writeFile(fullPath, fileBuffer);

        // The URL path that will be stored in the database and used by the client.
        // This is a relative URL that will be handled by our /api/serve-uploads route.
        const url = `/api/serve-uploads/merchants/${merchantId}/${filename}`;
        
        return NextResponse.json({ url });

    } catch (error) {
        console.error('Error saving merchant file to filesystem:', error);
        return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
    }
}
