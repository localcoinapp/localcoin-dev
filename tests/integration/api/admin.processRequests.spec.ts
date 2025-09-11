import { describe, it, expect, vi } from 'vitest';
import { POST as ProcessCashout } from '@/app/api/admin/process-cashout-request/route';
import { NextRequest } from 'next/server';

// Mock admin DB
const update = vi.fn(async () => Promise.resolve());
const get = vi.fn(async () => ({
  exists: true,
  data: () => ({
    merchantId: 'm1',
    status: 'pending',
    amount: 100,
    merchantWalletAddress: 'wallet_address',
    // Add other fields required by the route logic
    owner: 'owner_uid',
    companyName: 'Test Merchant',
    contactEmail: 'test@example.com',
    seedPhrase: 'test twelve words jungle despair hungry viable nation entry room muscle puzzle' // 12 words
  })
}));

vi.mock('@/lib/firebaseAdmin', () => ({
  adminDB: () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({
        get,
        update,
        collection: (sub: string) => ({ // Mock subcollections if needed
          doc: () => ({ update })
        })
      })
    })
  }),
}));

// Mock any blockchain/stripe bits if referenced
vi.mock('@solana/web3.js', async () => {
  const actual = await vi.importActual('@solana/web3.js');
  return {
    ...actual,
    sendAndConfirmTransaction: vi.fn().mockResolvedValue('mock_signature'),
  };
});
vi.mock('@solana/spl-token', async () => {
  const actual = await vi.importActual('@solana/spl-token');
  return {
    ...actual,
    getOrCreateAssociatedTokenAccount: vi.fn().mockResolvedValue({ address: 'mock_ata_address' }),
    createTransferCheckedInstruction: vi.fn(),
    getMint: vi.fn().mockResolvedValue({ decimals: 9 }),
  };
});

vi.mock('@/lib/mail', () => ({
    sendEmail: vi.fn().mockResolvedValue({}),
}));


describe('Admin API - Process Cashout Request', () => {
  it('should update status to approved on valid request', async () => {
    // Mock environment variable
    process.env.LOCALCOIN_MNEMONIC = 'test twelve words jungle despair hungry viable nation entry room muscle puzzle';

    const req = new NextRequest('http://localhost/api/admin/process-cashout-request', {
      method: 'POST',
      body: JSON.stringify({ requestId: 'r1' }),
    });

    const res = await ProcessCashout(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.signature).toBe('mock_signature');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        transactionSignature: 'mock_signature',
      })
    );
  });
});
