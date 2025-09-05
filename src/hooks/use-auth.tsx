
'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, usePathname } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';

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
    // This effect handles ONLY the Firebase Auth state.
    // It determines if a user is logged in according to Firebase.
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // A user is logged in, but we don't have their Firestore data yet.
        // The listener below will handle that.
      } else {
        // No user is logged in.
        setUser(null);
        setLoading(false);
        // Redirect if the user is on a protected route.
        const isProtectedRoute = protectedRoutes.some(p => pathname.startsWith(p));
        const isAdminRoute = adminRoutes.some(p => pathname.startsWith(p));
        if (isProtectedRoute || isAdminRoute || pathname.startsWith('/chat/')) {
          router.push('/login');
        }
      }
    });
    return () => unsubscribeAuth();
  }, [router, pathname]);

  useEffect(() => {
    // This effect listens for Firestore changes for the currently authenticated user.
    if (auth.currentUser) {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const unsubscribeSnapshot = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const docData = docSnap.data() as User;
            const mergedUser: User = {
              ...docData,
              id: auth.currentUser!.uid,
              uid: auth.currentUser!.uid,
              name: auth.currentUser!.displayName ?? docData.name ?? 'No Name',
              email: auth.currentUser!.email,
              avatar: auth.currentUser!.photoURL ?? docData.avatar ?? null,
            };
            setUser(mergedUser);
          } else {
            // User is authenticated but has no Firestore document.
            // This can happen if they were deleted or are in the process of signing up.
            // Logging them out forces the creation flow to re-run.
            auth.signOut();
            setUser(null);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Firestore 'users' subscription error:", error);
          // If we get a permission-denied, don't log the user out.
          // Just clear their user data and stop loading. The UI will show access denied.
          setUser(null);
          setLoading(false);
        }
      );
      return () => unsubscribeSnapshot();
    } else {
      // If there's no currentUser, we are done loading.
      setLoading(false);
    }
  }, [auth.currentUser]); // Re-run when the firebase user object changes.

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
