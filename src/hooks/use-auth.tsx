
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, usePathname } from 'next/navigation';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

const protectedRoutes = ['/wallet', '/dashboard', '/profile', '/settings', '/cart'];
const adminRoutes = ['/admin'];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUser({
              id: firebaseUser.uid,
              ...firebaseUser,
              ...data,
            } as User);
          } else {
            // New user, create the doc
            const newUser: Omit<User, 'id'> = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName,
              email: firebaseUser.email,
              avatar: firebaseUser.photoURL,
              role: 'user',
              profileComplete: false,
            };
            setDoc(userDocRef, newUser, { merge: true });
            setUser({ id: firebaseUser.uid, ...newUser } as User);
          }
          setLoading(false);
        });
        return () => unsubscribeDoc();
      } else {
        setUser(null);
        setLoading(false);
        const isProtected = protectedRoutes.some(p => pathname.startsWith(p)) || adminRoutes.some(p => pathname.startsWith(p)) || pathname.startsWith('/chat/');
        if (isProtected) {
          router.push('/login');
        }
      }
    });
    return () => unsubscribe();
  }, [router, pathname]);


  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
