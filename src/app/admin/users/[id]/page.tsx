
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, DollarSign, ShoppingCart, ShieldAlert } from 'lucide-react';
import type { User, CartItem } from '@/types';
import Link from 'next/link';

const formatDate = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function UserDetailPage() {
  const { id } = useParams();
  const { user: adminUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [userDetail, setUserDetail] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (authLoading) return;
    if (!adminUser || adminUser.role !== 'admin') {
      router.push('/');
      return;
    }

    if (userId) {
      const userDocRef = doc(db, 'users', userId);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserDetail({ id: docSnap.id, ...docSnap.data() } as User);
        } else {
          setUserDetail(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user details:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [userId, adminUser, authLoading, router]);

  if (loading || authLoading) {
    return <div className="container text-center p-8"><Loader2 className="h-12 w-12 animate-spin mx-auto" /></div>;
  }
  
  if (!adminUser || adminUser.role !== 'admin') {
     return null; // Redirect is handled by the hook
  }

  if (!userDetail) {
    return (
      <div className="container text-center p-8">
        <Card className="max-w-md mx-auto">
            <CardHeader>
                <ShieldAlert className="h-12 w-12 mx-auto text-destructive" />
                <CardTitle>User Not Found</CardTitle>
                <CardDescription>The requested user could not be found.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild><Link href="/admin">Back to Admin</Link></Button>
            </CardContent>
        </Card>
      </div>
    );
  }
  
  const completedPurchases = (userDetail.cart || []).filter(item => item.status === 'completed');

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" passHref>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-headline">User Details</h1>
          <p className="text-muted-foreground">Information for {userDetail.email}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="items-center text-center">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={userDetail.avatar || undefined} />
              <AvatarFallback>{userDetail.name?.charAt(0) || userDetail.email?.charAt(0)}</AvatarFallback>
            </Avatar>
            <CardTitle>{userDetail.name}</CardTitle>
            <CardDescription>{userDetail.email}</CardDescription>
            <Badge variant="secondary">{userDetail.role}</Badge>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">User ID:</span>
              <span className="font-mono text-xs">{userDetail.id}</span>
            </div>
             <div className="flex justify-between">
              <span className="text-muted-foreground">Wallet Balance:</span>
              <span className="font-medium">{(userDetail.walletBalance || 0).toFixed(2)} LCL</span>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><DollarSign className="mr-2 h-5 w-5"/>Token Purchase History</CardTitle>
                    <CardDescription>History of token purchases from the ramp.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-4">Token purchase history feature coming soon.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><ShoppingCart className="mr-2 h-5 w-5"/>Cart Purchase History</CardTitle>
                    <CardDescription>History of redeemed items from merchants.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Merchant</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {completedPurchases.length > 0 ? (
                                completedPurchases.map(item => (
                                    <TableRow key={item.orderId}>
                                        <TableCell>{item.title}</TableCell>
                                        <TableCell>{item.merchantName}</TableCell>
                                        <TableCell>{item.price.toFixed(2)} LCL</TableCell>
                                        <TableCell>{formatDate(item.redeemedAt)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">No completed purchases.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

