
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

interface RedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  redeemCode: string;
  onRedeem: () => void;
}

export function RedeemModal({ isOpen, onClose, redeemCode, onRedeem }: RedeemModalProps) {

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-2xl font-headline">Confirm Redemption</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Verify the customer's code to complete the transaction.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-lg">
            <p className="text-sm font-semibold text-muted-foreground">CUSTOMER'S CODE</p>
            <p className="text-5xl font-bold font-mono tracking-widest text-primary my-4">
                {redeemCode}
            </p>
        </div>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction onClick={onRedeem}>Confirm & Redeem</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
