
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/types';
import { useRouter, usePathname } from 'next/navigation';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

const protectedRoutes = ['/wallet', '/dashboard', '/profile', '/settings', '/cart'];
const adminRoutes = ['/admin'];
const chatRoute = '/chat/';
const publicOnlyRoutes = ['/login', '/signup'];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Force refresh the token to get custom claims
        await firebaseUser.getIdToken(true);
        
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Setup a real-time listener for the user document
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const appUser: User = {
              ...data,
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: data.name || firebaseUser.displayName,
              avatar: data.avatar || firebaseUser.photoURL,
              role: data.role || 'user',
              profileComplete: data.profileComplete === true,
            };
            setUser(appUser);
          } else {
            // This case might happen if the user doc creation is delayed or fails
            setUser(null);
          }
          setLoading(false);
        }, (error) => {
            console.error("Error with user document snapshot:", error);
            setUser(null);
            setLoading(false);
        });

        // This cleanup function for the document listener will be called when the auth state changes
        return () => unsubscribeDoc();

      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Effect for handling redirects based on auth state
  useEffect(() => {
    if (loading) {
      return; 
    }

    const isProtectedRoute = protectedRoutes.some(p => pathname.startsWith(p));
    const isAdminRoute = adminRoutes.some(p => pathname.startsWith(p));
    const isChatRoute = pathname.startsWith(chatRoute);
    const isPublicOnlyRoute = publicOnlyRoutes.includes(pathname);

    if (user) {
        // User is logged in
        if (isPublicOnlyRoute) {
            // Redirect from login/signup if logged in
            router.push('/');
        } else if (user.profileComplete === false && pathname !== '/profile') {
            // If profile is incomplete, force redirect to profile page
            router.push('/profile');
        } else if (user.role !== 'admin' && isAdminRoute) {
            // If a non-admin tries to access an admin route, redirect to home
            router.push('/');
        }
    } else {
        // User is not logged in
        if (isProtectedRoute || isAdminRoute || isChatRoute) {
            router.push('/login');
        }
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
