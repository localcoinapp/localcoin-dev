
'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, usePathname } from 'next/navigation';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

const protectedRoutes = ['/wallet', '/dashboard', '/profile', '/settings', '/cart'];
const adminRoutes = ['/admin'];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      let unsubscribeSnapshot = () => {};

      const handleUserLogic = async () => {
        if (firebaseUser) {
          // 1. Check if the user is in the blocked list first.
          const blockedUserDocRef = doc(db, 'blocked_users', firebaseUser.uid);
          const blockedDocSnap = await getDoc(blockedUserDocRef);

          if (blockedDocSnap.exists()) {
            await auth.signOut(); // Ensure user is logged out if blocked.
            setUser(null);
            setLoading(false);
            if (protectedRoutes.includes(pathname) || adminRoutes.includes(pathname) || pathname.startsWith('/chat/')) {
              router.push('/login');
            }
            return;
          }
          
          // 2. Set up a real-time listener for the user's document in Firestore.
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          unsubscribeSnapshot = onSnapshot(
            userDocRef,
            (docSnap) => {
              if (docSnap.exists()) {
                const docData = docSnap.data() as User;

                const mergedUser: User = {
                  ...docData, // Firestore data (role, merchantId, etc.)
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  name: firebaseUser.displayName ?? docData.name ?? 'No Name',
                  email: firebaseUser.email,
                  avatar: firebaseUser.photoURL ?? docData.avatar ?? null,
                };
                
                // Redirect non-admins away from admin routes.
                if (mergedUser.role !== 'admin' && adminRoutes.some(p => pathname.startsWith(p))) {
                   router.push('/');
                }
                
                setUser(mergedUser);
              } else {
                // The user exists in Firebase Auth but not in the 'users' collection.
                // This could happen if a user is deleted from the db but not from auth.
                setUser(null);
              }
              setLoading(false);
            },
            (error) => {
              console.error('Error fetching user snapshot:', error);
              setUser(null);
              setLoading(false);
            }
          );
        } else {
          // No user is logged in.
          setUser(null);
          setLoading(false);
          // Redirect if the user is on a protected route.
          if (protectedRoutes.includes(pathname) || adminRoutes.some(p => pathname.startsWith(p)) || pathname.startsWith('/chat/')) {
            router.push('/login');
          }
        }
      };

      handleUserLogic();
      
      // Cleanup function for onAuthStateChanged.
      return () => {
        unsubscribeSnapshot();
      };
    });

    // Cleanup function for the main useEffect.
    return () => unsubscribeAuth();
  }, [router, pathname]);

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
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
