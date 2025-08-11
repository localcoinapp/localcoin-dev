
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert } from 'lucide-react';
import type { MerchantApplication } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { geohashForLocation } from 'geofire-common';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }

    const appsRef = collection(db, 'merchant_applications');
    const unsubscribe = onSnapshot(appsRef, (snapshot) => {
      const appsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MerchantApplication));
      setApplications(appsData);
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch applications:", error);
      toast({ title: 'Error', description: 'Could not load merchant applications.', variant: 'destructive' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, router, toast]);

  const handleApprove = async (app: MerchantApplication) => {
    const { userId, ...applicationData } = app;
    
    if (!userId) {
        toast({ title: 'Error', description: 'Application is missing a user ID.', variant: 'destructive' });
        return;
    }

    const batch = writeBatch(db);
    
    // 1. Create new merchant document
    const merchantRef = doc(collection(db, 'merchants'));
    const merchantData = {
        ...applicationData,
        owner: userId,
        listings: [],
        rating: 0, // Initial rating
        geohash: geohashForLocation([app.position.lat, app.position.lng]),
        createdAt: new Date(),
    };
    batch.set(merchantRef, merchantData);

    // 2. Update user's role and add merchantId
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, { role: 'merchant', merchantId: merchantRef.id });

    // 3. Update application status
    const appRef = doc(db, 'merchant_applications', app.id);
    batch.update(appRef, { status: 'approved' });

    try {
        await batch.commit();
        toast({ title: 'Success', description: `${app.companyName} has been approved.` });
    } catch (error) {
        console.error("Error approving application:", error);
        toast({ title: 'Approval Failed', description: 'Could not approve the application.', variant: 'destructive' });
    }
  };

  const handleDeny = async (appId: string) => {
     const appRef = doc(db, 'merchant_applications', appId);
     try {
        await updateDoc(appRef, { status: 'rejected' });
        toast({ title: 'Application Denied', variant: 'destructive' });
     } catch (error) {
        toast({ title: 'Error', description: 'Could not deny the application.', variant: 'destructive' });
     }
  };


  if (authLoading || loading) {
    return <div className="container text-center p-8"><Loader2 className="h-12 w-12 animate-spin mx-auto" /></div>;
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="container text-center p-8">
        <Card className="max-w-md mx-auto">
            <CardHeader>
                <ShieldAlert className="h-12 w-12 mx-auto text-destructive" />
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>You do not have permission to view this page.</CardDescription>
            </CardHeader>
        </Card>
      </div>
    );
  }

  const pendingApplications = applications.filter(a => a.status === 'pending');

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold font-headline mb-4">Admin Dashboard</h1>
      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">Merchant Applications ({pendingApplications.length})</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="merchants">Merchant Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics Overview</TabsTrigger>
        </TabsList>
        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Pending Merchant Applications</CardTitle>
              <CardDescription>Review and approve or deny new merchant requests.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApplications.length > 0 ? (
                    pendingApplications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">{app.companyName}</TableCell>
                        <TableCell>{app.userEmail}</TableCell>
                        <TableCell>{app.submittedAt ? new Date(app.submittedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell><Badge variant="outline">{app.status}</Badge></TableCell>
                        <TableCell className="text-right space-x-2">
                           <Button size="sm" onClick={() => handleApprove(app)}>Approve</Button>
                           <Button size="sm" variant="destructive" onClick={() => handleDeny(app.id)}>Deny</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">No pending applications.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="users">
            <Card>
                <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">User management features coming soon.</p></CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="merchants">
            <Card>
                <CardHeader><CardTitle>Merchant Management</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Merchant management features coming soon.</p></CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="analytics">
            <Card>
                <CardHeader><CardTitle>Analytics Overview</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">Analytics dashboard coming soon.</p></CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    