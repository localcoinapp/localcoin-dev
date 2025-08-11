
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, writeBatch, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, ShieldAlert, Eye, Users, ShieldX, UserCheck } from 'lucide-react';
import type { MerchantApplication, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { geohashForLocation } from 'geofire-common';
import Link from 'next/link';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingApp, setViewingApp] = useState<MerchantApplication | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }

    const appsRef = collection(db, 'merchant_applications');
    const unsubscribeApps = onSnapshot(appsRef, (snapshot) => {
      const appsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MerchantApplication));
      setApplications(appsData);
      if(loading) setLoading(false);
    }, (error) => {
      console.error("Failed to fetch applications:", error);
      toast({ title: 'Error', description: 'Could not load merchant applications.', variant: 'destructive' });
      setLoading(false);
    });

    const usersRef = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as User));
        setUsers(usersData);
        if(loading) setLoading(false);
    }, (error) => {
        console.error("Failed to fetch users:", error);
        toast({ title: 'Error', description: 'Could not load users.', variant: 'destructive' });
    });
    
    const blockedUsersRef = collection(db, 'blocked_users');
    const unsubscribeBlockedUsers = onSnapshot(blockedUsersRef, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as User));
        setBlockedUsers(usersData);
    }, (error) => {
        console.error("Failed to fetch blocked users:", error);
        toast({ title: 'Error', description: 'Could not load blocked users.', variant: 'destructive' });
    });

    return () => {
        unsubscribeApps();
        unsubscribeUsers();
        unsubscribeBlockedUsers();
    };
  }, [user, authLoading, router, toast, loading]);

  const handleApprove = async (app: MerchantApplication) => {
    const { userId, ...applicationData } = app;
    
    if (!userId) {
        toast({ title: 'Error', description: 'Application is missing a user ID.', variant: 'destructive' });
        return;
    }

    const batch = writeBatch(db);
    
    const merchantRef = doc(collection(db, 'merchants'));
    const merchantData = {
        ...applicationData,
        owner: userId,
        listings: [],
        rating: 0,
        geohash: geohashForLocation([app.position.lat, app.position.lng]),
        createdAt: new Date(),
    };
    batch.set(merchantRef, merchantData);

    const userRef = doc(db, 'users', userId);
    batch.update(userRef, { role: 'merchant', merchantId: merchantRef.id });

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
  
  const handleViewApp = (app: MerchantApplication) => {
    setViewingApp(app);
    setIsViewModalOpen(true);
  }
  
  const moveUser = async (userId: string, fromCollection: string, toCollection: string) => {
    const fromDocRef = doc(db, fromCollection, userId);
    const toDocRef = doc(db, toCollection, userId);

    try {
        const docSnap = await getDoc(fromDocRef);
        if(docSnap.exists()){
            const batch = writeBatch(db);
            batch.set(toDocRef, docSnap.data());
            batch.delete(fromDocRef);
            await batch.commit();
            toast({ title: "Success", description: `User has been moved.`});
        } else {
            throw new Error("User document not found.");
        }
    } catch (error) {
        console.error("Error moving user:", error);
        toast({ title: "Error", description: "Could not move the user document.", variant: "destructive" });
    }
  };

  const handleBlockUser = (userId: string) => {
    if (userId === user?.id) {
      toast({ title: "Error", description: "You cannot block yourself.", variant: "destructive" });
      return;
    }
    moveUser(userId, 'users', 'blocked_users');
  };

  const handleUnblockUser = (userId: string) => {
    moveUser(userId, 'blocked_users', 'users');
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
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold font-headline mb-4">Admin Dashboard</h1>
        <Tabs defaultValue="applications">
          <TabsList>
            <TabsTrigger value="applications">Merchant Applications ({pendingApplications.length})</TabsTrigger>
            <TabsTrigger value="users">Active Users ({users.length})</TabsTrigger>
            <TabsTrigger value="blocked_users">Blocked Users ({blockedUsers.length})</TabsTrigger>
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
                             <Button size="sm" variant="ghost" onClick={() => handleViewApp(app)}>
                                 <Eye className="mr-2 h-4 w-4" /> View
                             </Button>
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
                  <CardHeader>
                    <CardTitle>Active User Management</CardTitle>
                    <CardDescription>View and manage all registered users.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Wallet Balance</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length > 0 ? (
                                users.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell className="font-medium">{u.name || 'N/A'}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                u.role === 'admin' ? 'destructive' :
                                                u.role === 'merchant' ? 'default' :
                                                'secondary'
                                            } className={u.role === 'merchant' ? 'bg-green-600' : ''}>
                                                {u.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{(u.walletBalance || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Link href={`/admin/users/${u.id}`} passHref>
                                                <Button size="sm" variant="outline">
                                                    <Users className="mr-2 h-4 w-4" /> View
                                                </Button>
                                            </Link>
                                            <Button size="sm" variant="destructive" onClick={() => handleBlockUser(u.id)}>
                                                <ShieldX className="mr-2 h-4 w-4"/> Block
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">No active users found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                  </CardContent>
              </Card>
          </TabsContent>
           <TabsContent value="blocked_users">
              <Card>
                  <CardHeader>
                    <CardTitle>Blocked User Management</CardTitle>
                    <CardDescription>View and manage all blocked users.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {blockedUsers.length > 0 ? (
                                blockedUsers.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell className="font-medium">{u.name || 'N/A'}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell><Badge variant="destructive">{u.role}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="outline" onClick={() => handleUnblockUser(u.id)}>
                                               <UserCheck className="mr-2 h-4 w-4"/> Unblock
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">No blocked users found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                  </CardContent>
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
      
       <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
         {viewingApp && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Application: {viewingApp.companyName}</DialogTitle>
              <DialogDescription>
                Submitted by {viewingApp.userEmail} on {viewingApp.submittedAt ? new Date(viewingApp.submittedAt.seconds * 1000).toLocaleString() : 'N/A'}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                  <div><p className="font-semibold">Company Name</p><p>{viewingApp.companyName}</p></div>
                  <div><p className="font-semibold">Contact Email</p><p>{viewingApp.contactEmail}</p></div>
                  <div><p className="font-semibold">Phone</p><p>{viewingApp.phone}</p></div>
                  <div><p className="font-semibold">Website</p><p><a href={viewingApp.website} target="_blank" rel="noreferrer" className="underline">{viewingApp.website}</a></p></div>
                  <div><p className="font-semibold">Instagram</p><p>{viewingApp.instagram}</p></div>
              </div>
               <div className="border-t pt-4 mt-2">
                  <p className="font-semibold">Address</p>
                  <p>{viewingApp.houseNumber} {viewingApp.street}</p>
                  <p>{viewingApp.city}, {viewingApp.state} {viewingApp.zipCode}</p>
                  <p>{viewingApp.country}</p>
               </div>
               <div className="border-t pt-4 mt-2">
                  <p className="font-semibold">Description</p>
                  <p className="text-sm text-muted-foreground">{viewingApp.description}</p>
               </div>
            </div>
          </DialogContent>
        )}
       </Dialog>
    </>
  );
}

    