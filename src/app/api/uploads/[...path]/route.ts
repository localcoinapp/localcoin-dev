import { NextRequest, NextResponse } from 'next/server';
import { join, normalize } from 'path';
import { stat, readFile } from 'fs/promises';
import mime from 'mime-types';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const uploadsDir = join(process.cwd(), 'uploads');
  const requested = join(uploadsDir, ...(params.path || []));
  const normalized = normalize(requested);

  // prevent path traversal
  if (!normalized.startsWith(uploadsDir)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const fileStat = await stat(normalized);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 404 });
    }

    const fileBuffer = await readFile(normalized);
    const contentType = (mime.lookup(normalized) || 'application/octet-stream').toString();

    // Use Uint8Array so TS sees a valid BodyInit
    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileBuffer.byteLength),
        // 'Cache-Control': 'public, max-age=3600, immutable',
      },
    });
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    console.error('Error reading file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
