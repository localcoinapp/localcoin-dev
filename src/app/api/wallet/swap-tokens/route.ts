
import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { siteConfig } from '@/config/site';

export async function POST(req: NextRequest) {
    try {
        const { userWallet, inputMint, outputMint, amount } = await req.json();

        if (!userWallet || !inputMint || !outputMint || !amount) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // --- Fetch quote from Jupiter API ---
        const quoteResponse = await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`
        );
        const quote = await quoteResponse.json();

        // --- Get the serialized transaction from Jupiter ---
        const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quoteResponse: quote,
                userPublicKey: userWallet,
                wrapAndUnwrapSol: true,
            }),
        });

        const { swapTransaction, error } = await swapResponse.json();

        if (error) {
            return NextResponse.json({ error: `Jupiter Swap API Error: ${error}` }, { status: 500 });
        }

        return NextResponse.json({ swapTransaction });

    } catch (err: any) {
        console.error("Swap API Error:", err);
        return NextResponse.json(
            { error: 'Failed to get swap transaction', details: err.message },
            { status: 500 }
        );
    }
}

    