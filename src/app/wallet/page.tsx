
'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, ArrowRight, LifeBuoy, ArrowUp } from "lucide-react"
import { siteConfig } from "@/config/site"
import { RampDialog } from "@/components/wallet/ramp-dialog"
import { RefundDialog } from "@/components/wallet/refund-dialog"
import Link from "next/link"
import { PurchaseHistory } from "@/components/purchase-history"

export default function WalletPage() {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline">My Wallet</h1>
            <p className="text-muted-foreground">Manage your balance and transaction history.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold">0.00 {siteConfig.token.symbol}</div>
                  <p className="text-xs text-muted-foreground">
                  ~ $0.00 USD
                  </p>
                  <div className="flex gap-2 mt-4">
                    <RampDialog type="buy">
                      <Button>
                        <ArrowUp className="mr-2 h-4 w-4" />
                        Buy
                      </Button>
                    </RampDialog>
                     <RefundDialog>
                        <Button variant="secondary">
                            <LifeBuoy className="mr-2 h-4 w-4" />
                            Request a Refund
                        </Button>
                     </RefundDialog>
                  </div>
              </CardContent>
            </Card>
            <Card>
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

        <PurchaseHistory />
      </div>
    );
}
