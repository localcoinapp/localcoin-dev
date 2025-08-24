// app/api/jupiter/price/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // disable static optimization
export const runtime = 'nodejs';        // use Node.js runtime (safe default)

// Basic CORS helper (optional but handy if you ever call this from another origin)
function withCORS(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get('ids');

  if (!ids) {
    return withCORS(
      NextResponse.json(
        { error: 'Missing required query parameter: ids' },
        { status: 400 }
      )
    );
  }

  // ✅ Correct endpoint (Price API v3 lives at /price/v3)
  const upstream = `https://lite-api.jup.ag/price/v3?ids=${encodeURIComponent(ids)}`;

  try {
    const resp = await fetch(upstream, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      next: { revalidate: 0 },
    });

    const body = await resp.text();

    if (!resp.ok) {
      console.error('Jupiter API Error:', body);
      return withCORS(
        NextResponse.json(
          { error: 'Failed to fetch price from Jupiter Price API.', details: body },
          { status: resp.status }
        )
      );
    }

    // Pass through JSON as-is
    return withCORS(
      new NextResponse(body, {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store',
        },
      })
    );
  } catch (err) {
    console.error('Error proxying Jupiter API:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return withCORS(
      NextResponse.json(
        { error: 'Failed to proxy request to Jupiter API.', details: msg },
        { status: 500 }
      )
    );
  }
}
