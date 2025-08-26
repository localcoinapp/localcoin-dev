
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { stat, readFile } from 'fs/promises';
import mime from 'mime-types';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filePath = join(process.cwd(), 'uploads', ...params.path);

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    
    // Determine content type from file extension
    const contentType = mime.lookup(filePath) || 'application/octet-stream';

    // Create a response with the file buffer and correct content type
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStat.size.toString(),
      },
    });

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File not found
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    // Other errors
    console.error('Error reading file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
