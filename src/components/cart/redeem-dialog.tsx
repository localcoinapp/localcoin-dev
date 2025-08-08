
'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface RedeemDialogProps {
  cartItem: {
    title: string;
    merchantName: string;
    redeemCode: string | null;
  };
  onRedeem: () => void;
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RedeemDialog({ cartItem, onRedeem, children, isOpen, onOpenChange }: RedeemDialogProps) {
  if (!cartItem.redeemCode) {
    // This case should ideally not be hit if the dialog is only shown for 'approved' items
    return <>{children}</>;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-2xl font-headline">Redeem Your Item</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Show this code to the merchant to finalize your transaction. The user must approve the redemption.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-lg">
            <p className="text-sm font-semibold text-muted-foreground">CONFIRMATION CODE</p>
            <p className="text-5xl font-bold font-mono tracking-widest text-primary my-4">
                {cartItem.redeemCode}
            </p>
            <div className="text-center">
                <p className="font-bold">{cartItem.title}</p>
                <p className="text-muted-foreground">{cartItem.merchantName}</p>
            </div>
        </div>
        <div className="flex flex-col sm:flex-row-reverse gap-2 mt-4">
            <Button onClick={onRedeem}>Approve for Redemption</Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
