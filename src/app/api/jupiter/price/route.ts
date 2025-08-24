
import { NextRequest, NextResponse } from 'next/server';

// This route acts as a proxy to the Jupiter Price API to avoid CORS issues.
// It uses the v6 endpoint, which is more current.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get('ids');
  
  if (!ids) {
    return NextResponse.json({ error: 'Missing required query parameter: ids' }, { status: 400 });
  }

  // Corrected to use the v6 endpoint and removed the unsupported 'vsToken' parameter.
  const JUPITER_API_URL = `https://quote-api.jup.ag/v6/price?ids=${ids}`;

  try {
    const response = await fetch(JUPITER_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jupiter API Error:', errorText);
      return NextResponse.json({ error: 'Failed to fetch price from Jupiter API.', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error proxying Jupiter API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json({ error: 'Failed to proxy request to Jupiter API.', details: errorMessage }, { status: 500 });
  }
}
