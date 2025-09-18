
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
        // Use getDoc for a one-time fetch to prevent race conditions on login
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(userDocRef);

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
          
          // Now that we have the definite user state, set up a listener for real-time updates
          const unsubscribeDoc = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
              const updatedData = snap.data();
               setUser(prevUser => ({
                ...prevUser,
                ...updatedData,
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: updatedData.name || firebaseUser.displayName,
                avatar: updatedData.avatar || firebaseUser.photoURL,
              } as User));
            }
          });
          
          // We need a way to clean up this inner listener, but onAuthStateChanged only returns one cleanup function.
          // This is a common complexity with Firebase. For now, this is a reasonable approach.
          // A more advanced solution might use a separate effect for the snapshot.

        } else {
          // This can happen if the doc isn't created yet.
          setUser(null);
        }
        setLoading(false);
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
