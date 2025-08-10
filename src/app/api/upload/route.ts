
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const merchantId = formData.get('merchantId') as string;

    if (!file || !merchantId) {
        return NextResponse.json({ error: 'Missing file or merchantId' }, { status: 400 });
    }

    try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const dir = join(process.cwd(), 'public', 'merchants', merchantId);
        
        // Create the directory if it doesn't exist
        await mkdir(dir, { recursive: true });

        const path = join(dir, file.name);
        await writeFile(path, fileBuffer);

        const url = `/merchants/${merchantId}/${file.name}`;

        return NextResponse.json({ url });
    } catch (error) {
        console.error('Error saving file:', error);
        return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
    }
}
