
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
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 1) Blocked user check
        const blockedUserDocRef = doc(db, 'blocked_users', firebaseUser.uid);
        const blockedDocSnap = await getDoc(blockedUserDocRef);

        if (blockedDocSnap.exists()) {
          await auth.signOut();
          setUser(null);
          setLoading(false);
          // Redirect if on a protected route
          if (protectedRoutes.includes(pathname) || adminRoutes.includes(pathname) || pathname.startsWith('/chat/')) {
            router.push('/login');
          }
          return;
        }

        // 2) Live Firestore user snapshot
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeSnapshot = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const docData = docSnap.data() as User; // Cast as User to get all fields

              const mergedUser: User = {
                // Start with data from Firestore, which has role, merchantId, etc.
                ...docData, 
                // Overwrite with guaranteed fresh data from Firebase Auth
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                name: firebaseUser.displayName ?? docData.name ?? '',
                email: firebaseUser.email ?? docData.email ?? null,
                avatar: firebaseUser.photoURL ?? docData.avatar ?? null,
              };

              setUser(mergedUser);
              
              // Redirect non-admins from admin routes
              if (mergedUser.role !== 'admin' && adminRoutes.includes(pathname)) {
                 router.push('/');
              }
            } else {
              setUser(null); // User deleted from 'users' but still in auth
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error fetching user snapshot:', error);
            setUser(null);
            setLoading(false);
          }
        );

        return () => unsubscribeSnapshot();
      } else {
        // No user logged in
        setUser(null);
        setLoading(false);
        if (protectedRoutes.includes(pathname) || adminRoutes.includes(pathname) || pathname.startsWith('/chat/')) {
          router.push('/login');
        }
      }
    });

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
