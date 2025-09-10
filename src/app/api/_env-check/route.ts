// app/api/_env-check/route.ts
export const runtime = 'nodejs';
export function GET() {
  return Response.json({
    hasEUR: !!process.env.STRIPE_SECRET_KEY_EUR,
    hasUSD: !!process.env.STRIPE_SECRET_KEY_USD,
    hasPubEUR: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_EUR,
  });
}
