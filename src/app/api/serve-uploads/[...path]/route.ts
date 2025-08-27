
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import mime from 'mime-types';

export const runtime = 'nodejs';

// This is the base directory on the server's filesystem where uploads are stored.
// On a self-hosted VM, this should be an absolute path outside the app's code,
// e.g., '/var/www/uploads'. The default is for local development.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const filePathParts = params.path;

  if (!filePathParts || filePathParts.length === 0) {
    return new NextResponse('File path is required', { status: 400 });
  }

  // Sanitize the file path to prevent directory traversal attacks.
  // path.join will resolve '..' segments. We also check if the final path is within our UPLOAD_DIR.
  const requestedPath = path.join(UPLOAD_DIR, ...filePathParts);

  if (!requestedPath.startsWith(UPLOAD_DIR)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const fileBuffer = await fs.readFile(requestedPath);
    const mimeType = mime.lookup(requestedPath) || 'application/octet-stream';

    // The fix is ensuring the Buffer is passed as a Uint8Array.
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File not found
      return new NextResponse('Not Found', { status: 404 });
    }
    // Other errors (e.g., permissions)
    console.error(`Error serving file ${requestedPath}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
