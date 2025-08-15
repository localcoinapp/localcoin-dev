
'use client'

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { siteConfig } from "@/config/site"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import type { Merchant } from "@/types"

interface CashoutDialogProps {
  children: React.ReactNode;
}

export function CashoutDialog({ children }: CashoutDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setAmount(value);
    }
    
    const handleSubmit = async () => {
        if (!user || !user.merchantId) {
            toast({ title: "Error", description: "Merchant details not found.", variant: "destructive" });
            return;
        }

        const merchant = user as any as Merchant; // Cast user to merchant which has the required fields
        if (!merchant.walletAddress) {
            toast({ title: "Error", description: "Merchant wallet address not found.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const requestsCollection = collection(db, 'merchantCashoutRequests');
            await addDoc(requestsCollection, {
                merchantId: user.merchantId,
                merchantName: merchant.companyName,
                merchantWalletAddress: merchant.walletAddress,
                amount: parseFloat(amount),
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            toast({
                title: "Request Submitted!",
                description: `Your request to cash out ${amount} ${siteConfig.token.symbol} is pending admin approval.`,
            });
            
            setOpen(false);
            setAmount('');
        } catch (error) {
            toast({
                title: "Request Failed",
                description: (error as Error).message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request Cash Out</DialogTitle>
          <DialogDescription>
            Enter the amount of {siteConfig.token.name} you want to cash out. An admin will review and process your request.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                   Amount
                </Label>
                <Input
                    id="amount"
                    value={amount}
                    onChange={handleAmountChange}
                    className="col-span-3"
                    type="number"
                    placeholder={`0.00 ${siteConfig.token.symbol}`}
                />
            </div>
        </div>
        <DialogFooter>
          <Button 
            type="submit" 
            onClick={handleSubmit} 
            disabled={!amount || parseFloat(amount) <= 0 || isLoading} 
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
