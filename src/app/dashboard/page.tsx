
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
import { PlusCircle, DollarSign, Activity, ShoppingBag, ArrowRight, Settings } from "lucide-react"
import { siteConfig } from "@/config/site"
import { merchants } from "@/data/merchants"
import { cn } from "@/lib/utils"

const transactions = [
  { id: "1", date: "2023-10-26", amount: -50, status: "Completed", description: "Coffee purchase" },
  { id: "2", date: "2023-10-25", amount: 200, status: "Received", description: "From friend" },
  { id: "3", date: "2023-10-24", amount: -120, status: "Completed", description: "Hotel Booking" },
  { id: "4", date: "2023-10-23", amount: -75, status: "Completed", description: "Excursion service" },
];

const listings = merchants.flatMap(m => m.items); // Assuming a single merchant for simplicity, or aggregate all

export default function DashboardPage() {
  const [isMerchant, setIsMerchant] = useState(true); // Default to merchant view for this page

  if (!isMerchant) {
    // This part is for non-merchants, directing them to apply.
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
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+5 sales</div>
            <p className="text-xs text-muted-foreground">
              in the last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
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
        <Card>
          <CardHeader>
            <CardTitle>Your Listings</CardTitle>
            <CardDescription>Manage your items and services.</CardDescription>
          </CardHeader>
          <CardContent>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((item) => (
                  <TableRow key={item.id} className={cn(item.quantity === 0 && 'text-muted-foreground')}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                    <TableCell>
                      {item.quantity > 0 ? (
                        <span>{item.quantity} in stock</span>
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
