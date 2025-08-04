
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

interface RampDialogProps {
  type: 'buy';
  children: React.ReactNode;
}

// In a real app, this would come from the logged-in user's profile
const userCountryCode = 'DE'; 

const getCurrencyForCountry = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    return country ? { code: country.currency, symbol: country.currencySymbol } : { code: 'USD', symbol: '$' };
}

export function RampDialog({ type, children }: RampDialogProps) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const currency = getCurrencyForCountry(userCountryCode);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setAmount(value);
    }
    
    const handleSubmit = () => {
        console.log(`${type} ${amount} worth of ${siteConfig.token.symbol}`);
        setOpen(false);
        setAmount('');
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
            Enter the amount of {currency.code} you want to spend.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                   {currency.code}
                </Label>
                <Input
                    id="amount"
                    value={amount}
                    onChange={handleAmountChange}
                    className="col-span-3"
                    type="number"
                    placeholder="0.00"
                />
            </div>
            <div className="text-center text-muted-foreground text-sm">
                You will receive ~{amount || '0.00'} {siteConfig.token.symbol}
            </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={!amount || parseFloat(amount) <= 0} className="capitalize">{type}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
