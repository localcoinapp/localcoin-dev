
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, writeBatch, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, ShieldAlert, Eye, Users, ShieldX, UserCheck, ShieldOff } from 'lucide-react';
import type { MerchantApplication, User, Merchant } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { geohashForLocation } from 'geofire-common';
import Link from 'next/link';

const formatDate = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleDateString();
};

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [blockedMerchants, setBlockedMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingApp, setViewingApp] = useState<MerchantApplication | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }

    const collectionsToMonitor = [
        { name: 'merchant_applications', setter: setApplications },
        { name: 'users', setter: setUsers },
        { name: 'blocked_users', setter: setBlockedUsers },
        { name: 'merchants', setter: setMerchants },
        { name: 'blocked_merchants', setter: setBlockedMerchants },
    ];
    
    let activeSubscriptions = collectionsToMonitor.length;

    const unsubscribes = collectionsToMonitor.map(({ name, setter }) => {
        const ref = collection(db, name);
        return onSnapshot(ref, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            setter(data);
            if (loading && --activeSubscriptions === 0) {
                 setLoading(false);
            }
        }, (error) => {
            console.error(`Failed to fetch ${name}:`, error);
            toast({ title: 'Error', description: `Could not load ${name}.`, variant: 'destructive' });
            if (loading && --activeSubscriptions === 0) {
                 setLoading(false);
            }
        });
    });

    return () => unsubscribes.forEach(unsub => unsub());
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
     const batch = writeBatch(db);
     batch.update(appRef, { status: 'rejected' });
     try {
        await batch.commit();
        toast({ title: 'Application Denied', variant: 'destructive' });
     } catch (error) {
        toast({ title: 'Error', description: 'Could not deny the application.', variant: 'destructive' });
     }
  };
  
  const handleViewApp = (app: MerchantApplication) => {
    setViewingApp(app);
    setIsViewModalOpen(true);
  }
  
  const moveDoc = async (id: string, fromCollection: string, toCollection: string, addData?: object) => {
    const fromDocRef = doc(db, fromCollection, id);
    const toDocRef = doc(db, toCollection, id);

    try {
        const docSnap = await getDoc(fromDocRef);
        if(docSnap.exists()){
            const batch = writeBatch(db);
            const { id: docId, ...dataToMove } = { ...docSnap.data(), ...addData };
            batch.set(toDocRef, dataToMove);
            batch.delete(fromDocRef);
            await batch.commit();
            toast({ title: "Success", description: `Document has been moved.`});
        } else {
            throw new Error("Document not found.");
        }
    } catch (error) {
        console.error("Error moving document:", error);
        toast({ title: "Error", description: "Could not move the document.", variant: "destructive" });
        throw error;
    }
  };

  const handleBlockUser = async (userToBlock: User) => {
    if (userToBlock.id === user?.id) {
      toast({ title: "Error", description: "You cannot block yourself.", variant: "destructive" });
      return;
    }
    await moveDoc(userToBlock.id, 'users', 'blocked_users', { blockedAt: serverTimestamp() });
  };

  const handleUnblockUser = (userId: string) => {
    moveDoc(userId, 'blocked_users', 'users');
  };

  const handleBlockMerchant = async (merchant: Merchant) => {
    if (!merchant.owner) {
        toast({ title: "Error", description: "Merchant owner ID is missing.", variant: "destructive" });
        return;
    }

    const batch = writeBatch(db);
    
    try {
        const merchantFromRef = doc(db, 'merchants', merchant.id);
        const merchantSnap = await getDoc(merchantFromRef);
        if (!merchantSnap.exists()) throw new Error("Merchant document not found.");
        
        const merchantToRef = doc(db, 'blocked_merchants', merchant.id);
        batch.set(merchantToRef, { ...merchantSnap.data(), blockedAt: serverTimestamp() });
        batch.delete(merchantFromRef);

        const userFromRef = doc(db, 'users', merchant.owner);
        const userSnap = await getDoc(userFromRef);
        if (userSnap.exists()) {
            const userToRef = doc(db, 'blocked_users', merchant.owner);
            batch.set(userToRef, { ...userSnap.data(), blockedAt: serverTimestamp() });
            batch.delete(userFromRef);
        }
        
        await batch.commit();
        toast({ title: "Success", description: `Merchant ${merchant.companyName} and their owner have been blocked.` });
    } catch(error) {
        console.error("Error blocking merchant:", error);
        toast({ title: "Blocking Failed", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleUnblockMerchant = async (merchant: Merchant) => {
    if (!merchant.owner) {
        toast({ title: "Error", description: "Merchant owner ID is missing.", variant: "destructive" });
        return;
    }
    
    const batch = writeBatch(db);
    
    try {
        const merchantFromRef = doc(db, 'blocked_merchants', merchant.id);
        const merchantSnap = await getDoc(merchantFromRef);
        if (!merchantSnap.exists()) throw new Error("Blocked merchant document not found.");
        
        const merchantToRef = doc(db, 'merchants', merchant.id);
        const { blockedAt, ...merchantData } = merchantSnap.data();
        batch.set(merchantToRef, merchantData);
        batch.delete(merchantFromRef);

        const userFromRef = doc(db, 'blocked_users', merchant.owner);
        const userSnap = await getDoc(userFromRef);
        if (userSnap.exists()) {
            const userToRef = doc(db, 'users', merchant.owner);
            const { blockedAt, ...userData } = userSnap.data();
            batch.set(userToRef, userData);
            batch.delete(userFromRef);
        }
        
        await batch.commit();
        toast({ title: "Success", description: `Merchant ${merchant.companyName} and their owner have been unblocked.` });
    } catch(error) {
        console.error("Error unblocking merchant:", error);
        toast({ title: "Unblocking Failed", description: (error as Error).message, variant: "destructive" });
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
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold font-headline mb-4">Admin Dashboard</h1>
        <Tabs defaultValue="applications">
          <TabsList className="grid grid-cols-1 sm:grid-cols-4 w-full">
            <TabsTrigger value="applications">Merchant Applications ({pendingApplications.length})</TabsTrigger>
            <TabsTrigger value="user_management">User Management</TabsTrigger>
            <TabsTrigger value="merchant_management">Merchant Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <Card>
              <CardHeader><CardTitle>Pending Merchant Applications</CardTitle><CardDescription>Review and approve or deny new merchant requests.</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Applicant</TableHead><TableHead>Submitted</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {pendingApplications.length > 0 ? (
                      pendingApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.companyName}</TableCell>
                          <TableCell>{app.userEmail}</TableCell>
                          <TableCell>{formatDate(app.submittedAt)}</TableCell>
                          <TableCell><Badge variant="outline">{app.status}</Badge></TableCell>
                          <TableCell className="text-right space-x-2">
                             <Button size="sm" variant="ghost" onClick={() => handleViewApp(app)}><Eye className="mr-2 h-4 w-4" /> View</Button>
                             <Button size="sm" onClick={() => handleApprove(app)}>Approve</Button>
                             <Button size="sm" variant="destructive" onClick={() => handleDeny(app.id)}>Deny</Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={5} className="text-center h-24">No pending applications.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="user_management">
            <Tabs defaultValue="active_users" className="w-full">
                <TabsList className="grid grid-cols-2 w-full"><TabsTrigger value="active_users">Active Users ({users.length})</TabsTrigger><TabsTrigger value="blocked_users">Blocked Users ({blockedUsers.length})</TabsTrigger></TabsList>
                <TabsContent value="active_users">
                    <Card><CardHeader><CardTitle>Active User Management</CardTitle><CardDescription>View and manage all registered users.</CardDescription></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {users.map((u) => (
                                        <TableRow key={u.id}>
                                            <TableCell className="font-medium">{u.name || 'N/A'}</TableCell><TableCell>{u.email}</TableCell>
                                            <TableCell><Badge variant={ u.role === 'admin' ? 'destructive' : u.role === 'merchant' ? 'default' : 'secondary'} className={u.role === 'merchant' ? 'bg-green-600 text-white' : ''}>{u.role}</Badge></TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Link href={`/admin/users/${u.id}`} passHref><Button size="sm" variant="outline"><Users className="mr-2 h-4 w-4" /> View</Button></Link>
                                                <Button size="sm" variant="destructive" onClick={() => handleBlockUser(u)} disabled={u.id === user.id}><ShieldX className="mr-2 h-4 w-4"/> Block</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="blocked_users">
                    <Card><CardHeader><CardTitle>Blocked User Management</CardTitle><CardDescription>View and manage all blocked users.</CardDescription></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {blockedUsers.map((u) => (
                                        <TableRow key={u.id}><TableCell className="font-medium">{u.name || 'N/A'}</TableCell><TableCell>{u.email}</TableCell><TableCell><Badge variant="destructive">{u.role}</Badge></TableCell>
                                            <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => handleUnblockUser(u.id)}><UserCheck className="mr-2 h-4 w-4"/> Unblock</Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="merchant_management">
             <Tabs defaultValue="active_merchants" className="w-full">
                <TabsList className="grid grid-cols-2 w-full"><TabsTrigger value="active_merchants">Active Merchants ({merchants.length})</TabsTrigger><TabsTrigger value="blocked_merchants">Blocked Merchants ({blockedMerchants.length})</TabsTrigger></TabsList>
                <TabsContent value="active_merchants">
                  <Card><CardHeader><CardTitle>Active Merchant Management</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Owner Email</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {merchants.map(m => <TableRow key={m.id}><TableCell>{m.companyName}</TableCell><TableCell>{m.userEmail}</TableCell><TableCell>{formatDate(m.createdAt)}</TableCell>
                              <TableCell className="text-right"><Button size="sm" variant="destructive" onClick={() => handleBlockMerchant(m)} disabled={m.owner === user?.id}><ShieldX className="mr-2 h-4 w-4" /> Block</Button></TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="blocked_merchants">
                  <Card><CardHeader><CardTitle>Blocked Merchant Management</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Owner Email</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {blockedMerchants.map(m => <TableRow key={m.id}><TableCell>{m.companyName}</TableCell><TableCell>{m.userEmail}</TableCell>
                              <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => handleUnblockMerchant(m)}><ShieldOff className="mr-2 h-4 w-4"/> Unblock</Button></TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
          </TabsContent>

           <TabsContent value="analytics">
              <Card><CardHeader><CardTitle>Analytics Overview</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Analytics dashboard coming soon.</p></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
      
       <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
         {viewingApp && (
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Application: {viewingApp.companyName}</DialogTitle>
              <DialogDescription>Submitted by {viewingApp.userEmail} on {formatDate(viewingApp.submittedAt)}.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                  <div><p className="font-semibold">Company Name</p><p>{viewingApp.companyName}</p></div>
                  <div><p className="font-semibold">Contact Email</p><p>{viewingApp.contactEmail}</p></div>
                  <div><p className="font-semibold">Phone</p><p>{viewingApp.phone}</p></div>
                  <div><p className="font-semibold">Website</p><p><a href={viewingApp.website} target="_blank" rel="noreferrer" className="underline">{viewingApp.website}</a></p></div>
                  <div><p className="font-semibold">Instagram</p><p>{viewingApp.instagram}</p></div>
              </div>
               <div className="border-t pt-4 mt-2"><p className="font-semibold">Address</p><p>{viewingApp.houseNumber} {viewingApp.street}</p><p>{viewingApp.city}, {viewingApp.state} {viewingApp.zipCode}</p><p>{viewingApp.country}</p></div>
               <div className="border-t pt-4 mt-2"><p className="font-semibold">Description</p><p className="text-sm text-muted-foreground">{viewingApp.description}</p></div>
            </div>
          </DialogContent>
        )}
       </Dialog>
    </>
  );
}
