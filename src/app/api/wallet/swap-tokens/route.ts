
import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { siteConfig } from '@/config/site';

async function getJupiterQuote(inputToken: string, outputToken: string, amount: number) {
    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputToken}&outputMint=${outputToken}&amount=${amount}&slippageBps=50`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch quote from Jupiter API: ${response.statusText}`);
    }
    return response.json();
}

async function getJupiterSwapTransaction(userWallet: string, quoteResponse: any) {
    const response = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            quoteResponse,
            userPublicKey: userWallet,
            wrapAndUnwrapSol: true,
        })
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch swap transaction from Jupiter API: ${response.statusText}`);
    }
    return response.json();
}


export async function POST(req: NextRequest) {
    try {
        const { userWallet, inputToken, outputToken, amount } = await req.json();

        if (!userWallet || !inputToken || !outputToken || !amount) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // 1. Get quote from Jupiter
        const quoteResponse = await getJupiterQuote(inputToken, outputToken, amount);

        // 2. Get the swap transaction from Jupiter
        const { swapTransaction } = await getJupiterSwapTransaction(userWallet, quoteResponse);

        return NextResponse.json({ swapTransaction });

    } catch (error) {
        console.error('Error in swap-tokens API:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

    