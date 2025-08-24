
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get('ids');
  if (!ids) {
    return NextResponse.json({ error: 'Missing required query parameter: ids' }, { status: 400 });
  }

  const upstream = `https://lite-api.jup.ag/v3/price?ids=${encodeURIComponent(ids)}`;

  try {
    const resp = await fetch(upstream, {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 0 }, // avoid caching
    });

    const body = await resp.text();
    if (!resp.ok) {
      console.error('Jupiter API Error:', body);
      return NextResponse.json(
        { error: 'Failed to fetch price from Jupiter Price API.', details: body },
        { status: resp.status }
      );
    }

    // Pass through the JSON as-is
    return new NextResponse(body, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('Error proxying Jupiter API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json({ error: 'Failed to proxy request to Jupiter API.', details: errorMessage }, { status: 500 });
  }
}
