
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

  const handleApproveClick = () => {
    onRedeem();
    toast({
        title: "Ready to Go!",
        description: "The merchant has been notified. They will complete the transaction on their end."
    })
    // NOTE: We do not close the modal here. The user must do it manually by clicking close.
    // The parent component `cart/page.tsx` controls the state.
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
                Show this code to the merchant. The merchant must confirm they see this screen to approve the redemption.
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
            <AlertDialogFooter className="sm:justify-between sm:flex-row-reverse w-full mt-2">
                {/* 
                  Using a standard Button instead of AlertDialogAction prevents the dialog
                  from closing automatically on click. This is the key to the fix.
                */}
                <Button onClick={handleApproveClick}>I've shown the merchant, approve for redemption</Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </AlertDialogFooter>
          </>
      </AlertDialogContent>
    </AlertDialog>
  )
}
