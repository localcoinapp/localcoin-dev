
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { CartItem } from "@/types"
import { siteConfig } from "@/config/site"
import { QrCode } from "lucide-react"

interface RedeemDialogProps {
  cartItem: CartItem;
  children: React.ReactNode;
}

export function RedeemDialog({ cartItem, children }: RedeemDialogProps) {
  const handleApproveToRedeem = () => {
    // In a real app, this would update the cart item's status and notify the merchant.
    console.log(`User approved to redeem item ${cartItem.id}. Waiting for merchant confirmation.`);
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-2xl font-headline">Redeem Your Item</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Show this code to the merchant to finalize your transaction. The final payment will be transferred upon confirmation.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-lg">
            <p className="text-sm font-semibold text-muted-foreground">CONFIRMATION CODE</p>
            <p className="text-5xl font-bold font-mono tracking-widest text-primary my-4">
                {cartItem.confirmationCode}
            </p>
            <div className="text-center">
                <p className="font-bold">{cartItem.item.name}</p>
                <p className="text-muted-foreground">{cartItem.merchantName}</p>
            </div>
        </div>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction onClick={handleApproveToRedeem}>Approve to Redeem</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
