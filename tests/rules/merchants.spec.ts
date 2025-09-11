import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { vi } from 'vitest';

const rules = readFileSync('firestore.rules', 'utf8');

describe('merchants rules', () => {
  let env: any;
  beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'demo-project', firestore: { rules } }); });
  afterAll(async () => { await env.cleanup(); });
  beforeEach(async () => { await env.clearFirestore(); });

  test('public can read live merchants', async () => {
    const adminDb = env.unauthenticatedContext().firestore();
    await setDoc(doc(adminDb, 'merchants/m1'), { status: 'live', owner: 'u1', companyName: 'A' });

    const anonDb = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(anonDb, 'merchants/m1')));
  });

  test('public cannot read non-live merchants', async () => {
    const adminDb = env.unauthenticatedContext().firestore();
    await setDoc(doc(adminDb, 'merchants/m-pending'), { status: 'pending', owner: 'u1' });
    await setDoc(doc(adminDb, 'merchants/m-paused'), { status: 'paused', owner: 'u1' });

    const anonDb = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonDb, 'merchants/m-pending')));
    await assertFails(getDoc(doc(anonDb, 'merchants/m-paused')));
  });

  test('owner can toggle live <-> paused with metadata', async () => {
    const adminDb = env.unauthenticatedContext().firestore();
    await setDoc(doc(adminDb, 'merchants/m2'), { status: 'live', owner: 'u1' });
    await setDoc(doc(adminDb, 'merchants/m3'), { status: 'paused', owner: 'u1' });

    const ownerDb = env.authenticatedContext('u1').firestore();
    await assertSucceeds(updateDoc(doc(ownerDb, 'merchants/m2'), { status: 'paused', updatedAt: new Date() }));
    await assertSucceeds(updateDoc(doc(ownerDb, 'merchants/m3'), { status: 'live', statusNote: 'Back online' }));
  });

  test('non-owner cannot update merchant', async () => {
    const adminDb = env.unauthenticatedContext().firestore();
    await setDoc(doc(adminDb, 'merchants/m4'), { status: 'live', owner: 'u1' });

    const otherUserDb = env.authenticatedContext('u2').firestore();
    await assertFails(updateDoc(doc(otherUserDb, 'merchants/m4'), { status: 'paused' }));
  });
});
