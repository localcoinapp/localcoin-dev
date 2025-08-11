
'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { User, UserRole } from '@/types';
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
// Note: /chat and /chat/[id] are now handled separately

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user is in the 'blocked_users' collection
        const blockedUserDocRef = doc(db, "blocked_users", firebaseUser.uid);
        const blockedDocSnap = await getDoc(blockedUserDocRef);

        if (blockedDocSnap.exists()) {
          // If user is blocked, sign them out and treat as logged out
          auth.signOut();
          setUser(null);
          setLoading(false);
          // Optional: redirect to a "you are blocked" page or show a toast
          if (protectedRoutes.includes(pathname) || pathname.startsWith('/chat/')) {
            router.push('/login');
          }
          return;
        }

        // If not blocked, proceed with fetching user data from 'users' collection
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const docData = docSnap.data();
            setUser({
              id: firebaseUser.uid, 
              name: firebaseUser.displayName || docData.name,
              email: firebaseUser.email,
              avatar: firebaseUser.photoURL || docData.avatar,
              ...docData,
            });
          } else {
             // This case might happen if a user is created in Auth but not in Firestore,
             // or if their document was deleted.
            setUser(null); // Treat as not logged in if no Firestore doc exists
          }
          setLoading(false);
        }, (error) => {
           console.error("Error fetching user snapshot:", error);
           setUser(null);
           setLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        setUser(null);
        if (protectedRoutes.includes(pathname) || pathname.startsWith('/chat/')) {
          router.push('/login');
        }
        setLoading(false);
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

    