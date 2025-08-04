
'use client'

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, DollarSign, Activity, ShoppingBag, ArrowRight, Settings, Check, X, Clock, CheckCircle } from "lucide-react"
import { siteConfig } from "@/config/site"
import { merchants } from "@/data/merchants"
import { cn } from "@/lib/utils"

const transactions = [
  { id: "1", date: "2023-10-26", amount: -50, status: "Completed", description: "Coffee purchase" },
  { id: "2", date: "2023-10-25", amount: 200, status: "Received", description: "From friend" },
  { id: "3", date: "2023-10-24", amount: -120, status: "Completed", description: "Hotel Booking" },
  { id: "4", date: "2023-10-23", amount: -75, status: "Completed", description: "Excursion service" },
];

const listings = merchants.flatMap(m => m.items);

const initialOrders = [
    { id: 'ord1', user: 'Alex Smith', item: 'Espresso', price: 2.50, status: 'pending' },
    { id: 'ord2', user: 'Maria Garcia', item: 'Day Pass', price: 20.00, status: 'pending' },
];

const initialApproved = [
    { id: 'ord3', user: 'Chen Wei', item: '3-Course Menu', price: 55.00, status: 'approved' }
];


export default function DashboardPage() {
  const [isMerchant, setIsMerchant] = useState(true);
  const [orders, setOrders] = useState(initialOrders);
  const [approved, setApproved] = useState(initialApproved);

  const handleOrderStatus = (orderId: string, status: 'approved' | 'denied') => {
    const orderToProcess = orders.find(o => o.id === orderId);
    if (!orderToProcess) return;

    setOrders(orders.filter(order => order.id !== orderId));
    
    if (status === 'approved') {
        setApproved([...approved, { ...orderToProcess, status: 'approved' }]);
        console.log(`Order ${orderId} has been approved.`);
    } else {
        console.log(`Order ${orderId} has been denied.`);
    }
  };
  
  const handleRedemption = (orderId: string) => {
    console.log(`Merchant confirms redemption for order ${orderId}. Payment is now being processed.`);
    setApproved(approved.filter(order => order.id !== orderId));
    // Here you would trigger the final transaction logic.
  }

  if (!isMerchant) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-lg text-center">
            <CardHeader>
                <CardTitle>Become a Merchant</CardTitle>
                <CardDescription>You are not a merchant yet. Apply to start selling your own services on the marketplace.</CardDescription>
            </CardHeader>
            <CardContent>
                <Link href="/dashboard/become-merchant">
                    <Button>
                        Get Started <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Merchant Dashboard</h1>
          <p className="text-muted-foreground">Manage your store, wallet, and listings.</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Link href="/dashboard/add-listing" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Listing
            </Button>
          </Link>
          <Link href="/dashboard/settings" passHref>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Store Settings
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,250.75 {siteConfig.token.symbol}</div>
            <p className="text-xs text-muted-foreground">
              ~ $1,250.75 USD
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{listings.length}</div>
            <p className="text-xs text-muted-foreground">
              Active items and services
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">
              New requests to approve
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-8">
            <Card>
            <CardHeader>
                <CardTitle>Incoming Orders</CardTitle>
                <CardDescription>Review and approve new requests from customers.</CardDescription>
            </CardHeader>
            <CardContent>
                {orders.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell>{order.user}</TableCell>
                                <TableCell>{order.item}</TableCell>
                                <TableCell>{order.price.toFixed(2)} {siteConfig.token.symbol}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={() => handleOrderStatus(order.id, 'approved')}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleOrderStatus(order.id, 'denied')}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-muted-foreground text-center p-4">No pending orders.</p>
                )}
            </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Approved Redemptions</CardTitle>
                    <CardDescription>Confirm redemptions after the user approves it from their end.</CardDescription>
                </CardHeader>
                <CardContent>
                    {approved.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {approved.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>{order.user}</TableCell>
                                        <TableCell>{order.item}</TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="outline" disabled>
                                                <CheckCircle className="mr-2 h-4 w-4"/>
                                                Confirm Redemption
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                       <p className="text-muted-foreground text-center p-4">No redemptions to confirm.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>An overview of your recent wallet activity.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell className={tx.amount > 0 ? "text-green-600" : "text-red-600"}>
                        {tx.amount.toFixed(2)} {siteConfig.token.symbol}
                        </TableCell>
                        <TableCell>
                        <Badge variant={tx.status === "Completed" ? "default" : "secondary"}>
                            {tx.status}
                        </Badge>
                        </TableCell>
                        <TableCell className="text-right">{tx.date}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
            </Card>
        </div>
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Your Listings</CardTitle>
            <CardDescription>Manage your items and services.</CardDescription>
          </CardHeader>
          <CardContent>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((item) => (
                  <TableRow key={item.id} className={cn(item.quantity === 0 && 'text-muted-foreground')}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      {item.quantity > 0 ? (
                        <span>{item.quantity}</span>
                      ) : (
                        <Badge variant="destructive">Sold Out</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.price.toFixed(2)} {siteConfig.token.symbol}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
