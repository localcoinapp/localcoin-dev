
'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";
import { toast } from "@/hooks/use-toast";

interface RedeemDialogProps {
  cartItem: {
    title: string;
    merchantName: string;
    redeemCode: string | null;
  };
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RedeemDialog({ cartItem, children, isOpen, onOpenChange }: RedeemDialogProps) {

  if (!cartItem.redeemCode) {
    // Fallback if dialog is somehow triggered for an item without a code.
    return <>{children}</>;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-center text-2xl font-headline">Redeem Your Item</AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Show this code to the merchant. The merchant will complete the transaction on their side.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-lg">
                <p className="text-sm font-semibold text-muted-foreground">REDEMPTION CODE</p>
                <p className="text-5xl font-bold font-mono tracking-widest text-primary my-4">
                    {cartItem.redeemCode}
                </p>
                <div className="text-center">
                    <p className="font-bold">{cartItem.title}</p>
                    <p className="text-muted-foreground">{cartItem.merchantName}</p>
                </div>
            </div>
            <AlertDialogFooter className="w-full mt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">Close</Button>
            </AlertDialogFooter>
          </>
      </AlertDialogContent>
    </AlertDialog>
  )
}
