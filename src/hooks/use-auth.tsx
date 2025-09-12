
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/types';
import { useRouter, usePathname } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

const protectedRoutes = ['/wallet', '/dashboard', '/profile', '/settings', '/cart'];
const adminRoutes = ['/admin'];
const chatRoute = '/chat/';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      let unsubscribeDoc: (() => void) | undefined;

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeDoc = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUser({
              ...data,
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: data.name || firebaseUser.displayName,
              avatar: data.avatar || firebaseUser.photoURL,
              role: data.role || 'user',
            });
          } else {
            // User authenticated in Auth, but no Firestore doc. This is an invalid state.
            setUser(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error on user snapshot:", error);
          setUser(null);
          setLoading(false);
        });
      } else {
        // No Firebase user, so set user to null and finish loading.
        setUser(null);
        setLoading(false);
      }

      // Cleanup function for the document listener
      return () => {
        if (unsubscribeDoc) {
          unsubscribeDoc();
        }
      };
    });

    // Cleanup function for the auth state listener
    return () => unsubscribeAuth();
  }, []); // Run only once on mount


  // Effect for handling redirects based on auth state
  useEffect(() => {
    if (loading) {
      return; // Don't redirect until auth state is resolved
    }

    const isProtectedRoute = protectedRoutes.some(p => pathname.startsWith(p));
    const isAdminRoute = adminRoutes.some(p => pathname.startsWith(p));
    const isChatRoute = pathname.startsWith(chatRoute);

    if (!user) {
      // If user is not logged in, redirect from any protected route to login
      if (isProtectedRoute || isAdminRoute || isChatRoute) {
        router.push('/login');
      }
    } else if (user.role !== 'admin' && isAdminRoute) {
      // If a non-admin user tries to access an admin route, redirect to home
      router.push('/');
    }
  }, [user, loading, pathname, router]);

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
