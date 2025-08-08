
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
import { ReactNode, useState, useEffect } from "react";
import { CheckCircle } from "lucide-react";

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
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    // Reset the internal state when the dialog is closed or a new item is opened
    if (!isOpen) {
      setIsApproved(false);
    }
  }, [isOpen]);


  if (!cartItem.redeemCode) {
    // This case should ideally not be hit if the dialog is only shown for 'approved' items
    return <>{children}</>;
  }

  const handleApproveClick = () => {
    onRedeem();
    setIsApproved(true);
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        {!isApproved ? (
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
                <Button onClick={handleApproveClick}>I've shown the merchant, approve for redemption</Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
                <AlertDialogTitle className="text-center text-2xl font-headline">Ready to Go!</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="flex flex-col items-center justify-center text-center p-8">
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4"/>
                <p className="text-lg font-semibold">The merchant has been notified.</p>
                <p className="text-muted-foreground mt-2">
                    They will now complete the transaction on their end. You can close this window.
                </p>
            </div>
            <AlertDialogFooter>
                <Button onClick={() => onOpenChange(false)}>Close</Button>
            </AlertDialogFooter>
          </>
        )}

      </AlertDialogContent>
    </AlertDialog>
  )
}
