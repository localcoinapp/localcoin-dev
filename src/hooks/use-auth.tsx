'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/types';
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
            // Correctly construct the User object by picking properties
            setUser({
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: data.name || firebaseUser.displayName,
              avatar: data.avatar || firebaseUser.photoURL,
              role: data.role || 'user',
              ...data,
            });
          } else {
            // This case handles a rare edge case where a user is authenticated
            // with Firebase Auth but doesn't have a Firestore document.
            // This can happen if the signup process was interrupted.
            // We set the user to null and let the protected route logic handle it.
            setUser(null);
          }
          setLoading(false);
        }, (error) => {
            console.error("Error on user snapshot:", error);
            setUser(null);
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
