
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
import { DollarSign, ArrowRight } from "lucide-react"
import { siteConfig } from "@/config/site"

const transactions = [
  { id: "1", date: "2023-10-26", amount: -50, status: "Completed", description: "Coffee purchase" },
  { id: "2", date: "2023-10-25", amount: 200, status: "Received", description: "From friend" },
  { id: "3", date: "2023-10-24", amount: -120, status: "Completed", description: "Hotel Booking" },
  { id: "4", date: "2023-10-23", amount: -75, status: "Completed", description: "Excursion service" },
];

export default function WalletPage() {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline">My Wallet</h1>
            <p className="text-muted-foreground">Manage your balance and transaction history.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">450.00 {siteConfig.token.symbol}</div>
                <p className="text-xs text-muted-foreground">
                ~ $450.00 USD
                </p>
            </CardContent>
            </Card>
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Become a Merchant</CardTitle>
                    <CardDescription>Start selling your own services on the marketplace.</CardDescription>
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
    );
}
