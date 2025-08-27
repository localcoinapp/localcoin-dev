
// This file is now redundant and can be removed.
// The logic has been moved to src/lib/mail.ts to be used directly by other API routes.
// Keeping a blank file or deleting it is fine. Deleting is cleaner.

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated.',
      details: 'Email sending logic has been moved to an internal utility.',
    },
    { status: 410 }
  );
}
