

'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, writeBatch, getDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, ShieldAlert, Eye, Users, ShieldX, UserCheck, ShieldOff, DollarSign, Check, X, ArrowDown, ExternalLink, TrendingUp, TrendingDown, Wallet, BarChart, Mail, Send } from 'lucide-react';
import type { User, Merchant, TokenPurchaseRequest, MerchantCashoutRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription as AlertDescriptionComponent } from '@/components/ui/alert';

const formatDate = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleDateString();
};

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [tokenRequests, setTokenRequests] = useState<TokenPurchaseRequest[]>([]);
  const [pendingCashoutRequests, setPendingCashoutRequests] = useState<MerchantCashoutRequest[]>([]);
  const [historicalCashoutRequests, setHistoricalCashoutRequests] = useState<MerchantCashoutRequest[]>([]);
  const [allTokenRequests, setAllTokenRequests] = useState<TokenPurchaseRequest[]>([]);
  const [allCashoutRequests, setAllCashoutRequests] = useState<MerchantCashoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingApp, setViewingApp] = useState<Merchant | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  // Email state
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);


  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }

    const unsubscribes = [
      onSnapshot(collection(db, 'users'), (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
      }),
      onSnapshot(collection(db, 'blocked_users'), (snapshot) => {
        setBlockedUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
      }),
      onSnapshot(collection(db, 'merchants'), (snapshot) => {
        setMerchants(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Merchant)));
      }),
      onSnapshot(collection(db, 'tokenPurchaseRequests'), (snapshot) => {
        const allRequests = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TokenPurchaseRequest));
        setAllTokenRequests(allRequests);
        setTokenRequests(allRequests.filter(req => req.status === 'pending'));
      }),
      onSnapshot(collection(db, 'merchantCashoutRequests'), (snapshot) => {
        const allRequests = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MerchantCashoutRequest));
        setAllCashoutRequests(allRequests);
        setPendingCashoutRequests(allRequests.filter(req => req.status === 'pending'));
        setHistoricalCashoutRequests(allRequests.filter(req => req.status !== 'pending'));
      })
    ];

    setLoading(false);

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user, authLoading, router]);
  
  const handleProcessTokenRequest = async (requestId: string, action: 'approve' | 'deny') => {
    setProcessingRequest(requestId);
    try {
        if (action === 'approve') {
            const response = await fetch('/api/admin/process-token-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.details || 'Failed to approve request.');
            }
            toast({ title: 'Success', description: 'Token purchase approved and processed.' });
        } else { // Deny
            const requestRef = doc(db, 'tokenPurchaseRequests', requestId);
            await updateDoc(requestRef, { status: 'denied' });
            toast({ title: 'Request Denied', variant: 'destructive' });
        }
    } catch (error) {
        console.error("Error processing token request:", error);
        toast({ title: 'Processing Failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
        setProcessingRequest(null);
    }
  };

  const handleProcessCashoutRequest = async (requestId: string, action: 'approve' | 'deny') => {
    setProcessingRequest(requestId);
    try {
        if (action === 'approve') {
            const response = await fetch('/api/admin/process-cashout-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.details || 'Failed to approve cashout request.');
            }
            toast({ title: 'Success', description: 'Cashout request approved and processed.' });
        } else { // Deny
            const requestRef = doc(db, 'merchantCashoutRequests', requestId);
            await updateDoc(requestRef, { status: 'denied', processedAt: serverTimestamp() });
            toast({ title: 'Request Denied', variant: 'destructive' });
        }
    } catch (error) {
        console.error("Error processing cashout request:", error);
        toast({ title: 'Processing Failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
        setProcessingRequest(null);
    }
  };


  const handleApprove = async (merchant: Merchant) => {
    if (!merchant.id || !merchant.owner) {
        toast({ title: 'Error', description: 'Application is missing merchant or user ID.', variant: 'destructive' });
        return;
    }

    const batch = writeBatch(db);
    
    const merchantRef = doc(db, 'merchants', merchant.id);
    batch.update(merchantRef, { status: 'approved' });

    const userRef = doc(db, 'users', merchant.owner);
    batch.update(userRef, { role: 'merchant', merchantId: merchant.id });

    try {
        await batch.commit();
        toast({ title: 'Success', description: `${merchant.companyName} has been approved. They can now go live from their dashboard.` });
    } catch (error) {
        console.error("Error approving application:", error);
        toast({ title: 'Approval Failed', description: 'Could not approve the application.', variant: 'destructive' });
    }
  };

  const handleDeny = async (merchantId: string) => {
     const merchantRef = doc(db, 'merchants', merchantId);
     try {
        await updateDoc(merchantRef, { status: 'rejected' });
        toast({ title: 'Application Denied', variant: 'destructive' });
     } catch (error) {
        toast({ title: 'Error', description: 'Could not deny the application.', variant: 'destructive' });
     }
  };
  
  const handleViewApp = (merchant: Merchant) => {
    setViewingApp(merchant);
    setIsViewModalOpen(true);
  }

  const handleBlockUser = async (userToBlock: User) => {
    if (userToBlock.id === user?.id) {
      toast({ title: "Error", description: "You cannot block yourself.", variant: "destructive" });
      return;
    }
    const fromDocRef = doc(db, 'users', userToBlock.id);
    const toDocRef = doc(db, 'blocked_users', userToBlock.id);

    try {
        const docSnap = await getDoc(fromDocRef);
        if(docSnap.exists()){
            const batch = writeBatch(db);
            const dataToMove = { ...docSnap.data(), blockedAt: serverTimestamp() };
            batch.set(toDocRef, dataToMove);
            batch.delete(fromDocRef);
            await batch.commit();
            toast({ title: "Success", description: `User has been blocked.`});
        }
    } catch (error) {
        toast({ title: "Error", description: "Could not block the user.", variant: "destructive" });
    }
  };

  const handleUnblockUser = async (userId: string) => {
    const fromDocRef = doc(db, 'blocked_users', userId);
    const toDocRef = doc(db, 'users', userId);
    try {
        const docSnap = await getDoc(fromDocRef);
        if(docSnap.exists()){
            const batch = writeBatch(db);
            const { blockedAt, ...dataToMove } = docSnap.data();
            batch.set(toDocRef, dataToMove);
            batch.delete(fromDocRef);
            await batch.commit();
            toast({ title: "Success", description: `User has been unblocked.`});
        }
    } catch (error) {
        toast({ title: "Error", description: "Could not unblock the user.", variant: "destructive" });
    }
  };

  const handleBlockMerchant = async (merchant: Merchant) => {
    if (!merchant.id || !merchant.owner) {
        toast({ title: "Error", description: "Merchant ID or Owner ID is missing.", variant: "destructive" });
        return;
    }
    
    const batch = writeBatch(db);

    const merchantRef = doc(db, 'merchants', merchant.id);
    batch.update(merchantRef, { status: 'blocked' });

    const userFromRef = doc(db, 'users', merchant.owner);
    const userToRef = doc(db, 'blocked_users', merchant.owner);

    try {
        const userSnap = await getDoc(userFromRef);
        if (userSnap.exists()) {
            batch.set(userToRef, { ...userSnap.data(), blockedAt: serverTimestamp() });
            batch.delete(userFromRef);
        } else {
            console.warn(`User ${merchant.owner} not found in 'users' collection to block. They may already be blocked.`);
        }

        await batch.commit();
        toast({ title: "Success", description: `Merchant ${merchant.companyName} and their owner have been blocked.` });
    } catch(error) {
        console.error("Error blocking merchant:", error);
        toast({ title: "Blocking Failed", description: (error as Error).message, variant: "destructive" });
    }
  };


  const handleUnblockMerchant = async (merchant: Merchant) => {
    if (!merchant.id || !merchant.owner) {
        toast({ title: "Error", description: "Merchant ID or owner ID is missing.", variant: "destructive" });
        return;
    }
    
    const batch = writeBatch(db);

    const merchantRef = doc(db, 'merchants', merchant.id);
    batch.update(merchantRef, { status: 'approved' });

    const userFromRef = doc(db, 'blocked_users', merchant.owner);
    const userToRef = doc(db, 'users', merchant.owner);
    
    try {
        const userSnap = await getDoc(userFromRef);
        if (userSnap.exists()) {
            const { blockedAt, ...userData } = userSnap.data();
            batch.set(userToRef, userData);
            batch.delete(userFromRef);
        } else {
             console.warn(`User ${merchant.owner} not found in 'blocked_users' collection to unblock.`);
        }
        
        await batch.commit();
        toast({ title: "Success", description: `Merchant ${merchant.companyName} and their owner have been unblocked.` });
    } catch(error) {
        console.error("Error unblocking merchant:", error);
        toast({ title: "Unblocking Failed", description: (error as Error).message, variant: "destructive" });
    }
  };
  
  const handleSendTestEmail = async () => {
    if (!testEmail) {
        toast({ title: "Error", description: "Please enter a recipient email address.", variant: "destructive"});
        return;
    }
    setIsSendingTestEmail(true);
    try {
        const response = await fetch('/api/admin/send-test-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: testEmail }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.details || 'Failed to send test email.');
        }
        toast({ title: "Success", description: `Test email sent to ${testEmail}.` });

    } catch(error) {
        console.error("Full error object from send test email:", error);
        toast({ title: "Error Sending Email", description: (error as Error).message, variant: "destructive" });
    } finally {
        setIsSendingTestEmail(false);
    }
  }


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

  const pendingApplications = merchants.filter(m => m.status === 'pending');
  const activeMerchants = merchants.filter(m => m.status === 'approved' || m.status === 'live' || m.status === 'paused');
  const blockedMerchants = merchants.filter(m => m.status === 'blocked');
  
  const totalTokensIssued = allTokenRequests
    .filter(req => req.status === 'approved')
    .reduce((acc, req) => acc + req.amount, 0);

  const totalTokensCashedOut = allCashoutRequests
    .filter(req => req.status === 'approved')
    .reduce((acc, req) => acc + req.amount, 0);

  const platformProfit = totalTokensCashedOut * siteConfig.commissionRate;


  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold font-headline mb-4">Admin Dashboard</h1>
        <Tabs defaultValue="applications">
          <TabsList className="grid grid-cols-1 sm:grid-cols-7 w-full">
            <TabsTrigger value="applications">Merchant Applications ({pendingApplications.length})</TabsTrigger>
            <TabsTrigger value="token_requests">Token Requests ({tokenRequests.length})</TabsTrigger>
            <TabsTrigger value="cashout_requests">Cashout Requests</TabsTrigger>
            <TabsTrigger value="user_management">User Management</TabsTrigger>
            <TabsTrigger value="merchant_management">Merchant Management</TabsTrigger>
            <TabsTrigger value="accounting">Accounting</TabsTrigger>
            <TabsTrigger value="email_settings">Email Settings</TabsTrigger>
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

          <TabsContent value="token_requests">
             <Card>
                <CardHeader>
                    <CardTitle>Pending Token Purchase Requests</CardTitle>
                    <CardDescription>Review and process user requests to buy tokens.</CardDescription>
                </CardHeader>
                <CardContent>
                   <Table>
                        <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Amount</TableHead><TableHead>Wallet Address</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {tokenRequests.length > 0 ? tokenRequests.map(req => (
                                <TableRow key={req.id}>
                                    <TableCell>{req.userName || req.userId}</TableCell>
                                    <TableCell>{req.amount.toFixed(2)} {siteConfig.token.symbol}</TableCell>
                                    <TableCell className="font-mono text-xs">{req.userWalletAddress}</TableCell>
                                    <TableCell>{formatDate(req.createdAt)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" onClick={() => handleProcessTokenRequest(req.id, 'approve')} disabled={processingRequest === req.id}>
                                                {processingRequest === req.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Approve
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleProcessTokenRequest(req.id, 'deny')} disabled={processingRequest === req.id}>
                                                <X className="mr-2 h-4 w-4" /> Deny
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={5} className="text-center h-24">No pending token requests.</TableCell></TableRow>}
                        </TableBody>
                   </Table>
                </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="cashout_requests">
            <Tabs defaultValue="pending_cashouts" className="w-full">
                <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="pending_cashouts">Pending ({pendingCashoutRequests.length})</TabsTrigger>
                    <TabsTrigger value="history_cashouts">History ({historicalCashoutRequests.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="pending_cashouts">
                     <Card>
                        <CardHeader>
                            <CardTitle>Merchant Cashout Requests</CardTitle>
                            <CardDescription>Review and process merchant requests to cash out tokens.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader><TableRow><TableHead>Merchant</TableHead><TableHead>Amount</TableHead><TableHead>Wallet Address</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {pendingCashoutRequests.length > 0 ? pendingCashoutRequests.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell>{req.merchantName}</TableCell>
                                            <TableCell>{req.amount.toFixed(2)} {siteConfig.token.symbol}</TableCell>
                                            <TableCell className="font-mono text-xs">{req.merchantWalletAddress}</TableCell>
                                            <TableCell>{formatDate(req.createdAt)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" onClick={() => handleProcessCashoutRequest(req.id, 'approve')} disabled={processingRequest === req.id}>
                                                        {processingRequest === req.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Approve
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleProcessCashoutRequest(req.id, 'deny')} disabled={processingRequest === req.id}>
                                                        <X className="mr-2 h-4 w-4" /> Deny
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )) : <TableRow><TableCell colSpan={5} className="text-center h-24">No pending cashout requests.</TableCell></TableRow>}
                                </TableBody>
                           </Table>
                        </CardContent>
                     </Card>
                </TabsContent>
                <TabsContent value="history_cashouts">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cashout History</CardTitle>
                            <CardDescription>A log of all processed cashout requests.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Merchant</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Processed</TableHead><TableHead className="text-right">Transaction</TableHead></TableRow></TableHeader>
                                <TableBody>
                                {historicalCashoutRequests.length > 0 ? historicalCashoutRequests.map(req => (
                                    <TableRow key={req.id}>
                                        <TableCell>{req.merchantName}</TableCell>
                                        <TableCell>{req.amount.toFixed(2)} {siteConfig.token.symbol}</TableCell>
                                        <TableCell><Badge variant={req.status === 'approved' ? 'default' : 'destructive'}>{req.status}</Badge></TableCell>
                                        <TableCell>{formatDate(req.processedAt)}</TableCell>
                                        <TableCell className="text-right">
                                            {req.transactionSignature ? (
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`https://explorer.solana.com/tx/${req.transactionSignature}?cluster=devnet`} target="_blank">
                                                        <ExternalLink className="mr-2 h-4 w-4" />
                                                        View
                                                    </Link>
                                                </Button>
                                            ) : 'N/A'}
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={5} className="text-center h-24">No historical cashout requests.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
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
                <TabsList className="grid grid-cols-2 w-full"><TabsTrigger value="active_merchants">Active Merchants ({activeMerchants.length})</TabsTrigger><TabsTrigger value="blocked_merchants">Blocked Merchants ({blockedMerchants.length})</TabsTrigger></TabsList>
                <TabsContent value="active_merchants">
                  <Card><CardHeader><CardTitle>Active Merchant Management</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Owner Email</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {activeMerchants.map(m => <TableRow key={m.id}><TableCell>{m.companyName}</TableCell><TableCell>{m.userEmail}</TableCell>
                              <TableCell><Badge variant={m.status === 'live' ? 'default' : 'secondary'} className={m.status === 'live' ? 'bg-green-600 text-white' : ''}>{m.status}</Badge></TableCell>
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
          
          <TabsContent value="accounting">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5" />Platform Accounting</CardTitle>
                    <CardDescription>An overview of the token economy.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-3">
                   <Card>
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                           <CardTitle className="text-sm font-medium">Total Tokens Issued</CardTitle>
                           <TrendingUp className="h-4 w-4 text-muted-foreground" />
                       </CardHeader>
                       <CardContent>
                           <div className="text-2xl font-bold">{totalTokensIssued.toFixed(2)} {siteConfig.token.symbol}</div>
                           <p className="text-xs text-muted-foreground">from {allTokenRequests.filter(r=>r.status === 'approved').length} approved requests</p>
                       </CardContent>
                   </Card>
                   <Card>
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                           <CardTitle className="text-sm font-medium">Total Tokens Cashed Out</CardTitle>
                           <TrendingDown className="h-4 w-4 text-muted-foreground" />
                       </CardHeader>
                       <CardContent>
                           <div className="text-2xl font-bold">{totalTokensCashedOut.toFixed(2)} {siteConfig.token.symbol}</div>
                            <p className="text-xs text-muted-foreground">from {allCashoutRequests.filter(r=>r.status === 'approved').length} approved requests</p>
                       </CardContent>
                   </Card>
                   <Card>
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                           <CardTitle className="text-sm font-medium">Platform Profit ({siteConfig.commissionRate * 100}%)</CardTitle>
                           <Wallet className="h-4 w-4 text-muted-foreground" />
                       </CardHeader>
                       <CardContent>
                           <div className="text-2xl font-bold">{platformProfit.toFixed(2)} {siteConfig.fiatCurrency.symbol}</div>
                           <p className="text-xs text-muted-foreground">from cashed out tokens</p>
                       </CardContent>
                   </Card>
                </CardContent>
             </Card>
          </TabsContent>
          
          <TabsContent value="email_settings">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Mail className="mr-2 h-5 w-5" />Email Configuration</CardTitle>
                    <CardDescription>Test your SMTP settings to ensure emails are being sent correctly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <Alert>
                        <AlertTitle>Configuration Note</AlertTitle>
                        <AlertDescriptionComponent>
                            SMTP settings must be configured in your project's server environment variables. This form only sends a test email using the existing configuration.
                        </AlertDescriptionComponent>
                   </Alert>
                   <div className="space-y-2">
                        <Label htmlFor="test-email">Recipient Email Address</Label>
                        <div className="flex gap-2">
                            <Input 
                                id="test-email" 
                                type="email" 
                                placeholder="recipient@example.com"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                            />
                            <Button onClick={handleSendTestEmail} disabled={isSendingTestEmail}>
                                {isSendingTestEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Send Test Email
                            </Button>
                        </div>
                   </div>
                </CardContent>
             </Card>
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

    