import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { vi } from 'vitest';

const rules = readFileSync('firestore.rules', 'utf8');

describe('users rules', () => {
  let env: any;
  beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'demo-users', firestore: { rules } }); });
  afterAll(async () => { await env.cleanup(); });
  beforeEach(async () => { await env.clearFirestore(); });


  test('user can read/update own doc', async () => {
    const u1Db = env.authenticatedContext('u1').firestore();
    await assertSucceeds(setDoc(doc(u1Db, 'users/u1'), { role: 'user' }));
    await assertSucceeds(getDoc(doc(u1Db, 'users/u1')));
    await assertSucceeds(updateDoc(doc(u1Db, 'users/u1'), { name: 'User One' }));
  });

  test('user cannot read or write to other user docs', async () => {
    const adminDb = env.unauthenticatedContext().firestore();
    await setDoc(doc(adminDb, 'users/u1'), { role: 'user' });

    const u2Db = env.authenticatedContext('u2').firestore();
    await assertFails(getDoc(doc(u2Db, 'users/u1')));
    await assertFails(updateDoc(doc(u2Db, 'users/u1'), { name: 'Malicious Update' }));
  });

  test('admin can read any user doc', async () => {
    const adminDb = env.authenticatedContext('admin-uid', { role: 'admin' }).firestore();
    // Admin needs its own doc to pass isAdmin() check
    await setDoc(doc(adminDb, 'users/admin-uid'), { role: 'admin' });
    await setDoc(doc(adminDb, 'users/u1'), { role: 'user' });

    await assertSucceeds(getDoc(doc(adminDb, 'users/u1')));
  });
});
