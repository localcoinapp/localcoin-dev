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
const publicOnlyRoutes = ['/login', '/signup'];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, (snap) => {
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
              profileComplete: data.profileComplete === true, // Ensure it's a boolean
            });
          } else {
            // This case might happen briefly if a user is created but their doc isn't yet.
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
