
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, usePathname } from 'next/navigation';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;      // Your app-level user (may be “auth-only” if Firestore denied)
  loading: boolean;       // True until we’ve decided what to render
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

const protectedRoutes = ['/wallet', '/dashboard', '/profile', '/settings', '/cart'];
const adminRoutes = ['/admin'];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null); // <-- source of truth for login
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // 1) Watch Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setAuthUser(fbUser);

      if (!fbUser) {
        setUser(null);
        setLoading(false);

        const isProtected = protectedRoutes.some(p => pathname.startsWith(p))
                          || adminRoutes.some(p => pathname.startsWith(p))
                          || pathname.startsWith('/chat/');
        if (isProtected) router.push('/login');
      }
      // If fbUser exists, we don't setLoading(false) here; Firestore listener below will.
    });
    return unsubscribe;
  }, [router, pathname]);

  // 2) Watch /users/{uid} only when signed in
  useEffect(() => {
    if (!authUser) return;

    setLoading(true);
    const uid = authUser.uid;
    const userDocRef = doc(db, 'users', uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      async (snap) => {
        if (!snap.exists()) {
          // Create a minimal user doc instead of signing out
          try {
            await setDoc(
              userDocRef,
              {
                role: 'user',
                email: authUser.email ?? null,
                name: authUser.displayName ?? null,
                avatar: authUser.photoURL ?? null,
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
              },
              { merge: true }
            );
            // Next snapshot tick will populate state
            return;
          } catch (e) {
            console.error('Failed to create user doc:', e);
          }
        }

        const data = (snap.data() || {}) as Partial<User>;
        const merged: User = {
          id: uid,
          uid,
          name: authUser.displayName ?? data.name ?? 'No Name',
          email: authUser.email ?? (data as any).email ?? null,
          avatar: authUser.photoURL ?? data.avatar ?? null,
          role: (data as any).role ?? 'user',
          ...data,
        } as User;

        setUser(merged);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore 'users' subscription error:", error);

        // Permission denied? Fall back to an Auth-only user so the app can render.
        if ((error as any)?.code === 'permission-denied') {
          const fallback: User = {
            id: authUser.uid,
            uid: authUser.uid,
            name: authUser.displayName ?? 'No Name',
            email: authUser.email ?? null,
            avatar: authUser.photoURL ?? null,
            role: 'user',
            // @ts-ignore
            __limited: true,
          };
          setUser(fallback);
        } else {
          // Other errors: keep the session, just surface null user
          setUser(null);
        }
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [authUser?.uid]); // depend on uid, not auth.currentUser

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {loading ? (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <Skeleton className="h-16 w-full mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
