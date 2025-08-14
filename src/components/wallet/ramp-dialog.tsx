
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
import { countries } from "@/data/countries"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface RampDialogProps {
  type: 'buy';
  children: React.ReactNode;
}

const userCountryCode = 'DE'; 

const getCurrencyForCountry = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    return country ? { code: country.currency, symbol: country.currencySymbol } : { code: 'USD', symbol: '$' };
}

export function RampDialog({ type, children }: RampDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const currency = getCurrencyForCountry(userCountryCode);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setAmount(value);
    }
    
    const handleSubmit = async () => {
        if (!user || !user.walletAddress || !amount) {
            toast({
                title: "Error",
                description: "User wallet or amount is missing.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/buy-tokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: user.walletAddress,
                    amount: parseFloat(amount)
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Transaction failed');
            }

            toast({
                title: "Purchase Successful!",
                description: (
                    <span>
                        Transaction completed. {' '}
                        <a href={`https://explorer.solana.com/tx/${data.signature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="underline">
                            View on Explorer
                        </a>
                    </span>
                ),
            });
            
            setOpen(false);
            setAmount('');
        } catch (error) {
            toast({
                title: "Purchase Failed",
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
          <DialogTitle className="capitalize">{type} {siteConfig.token.name}</DialogTitle>
          <DialogDescription>
            Enter the amount you want to purchase.
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
            className="capitalize"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {type}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
