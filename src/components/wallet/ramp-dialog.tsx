
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

interface RampDialogProps {
  type: 'buy' | 'sell';
  children: React.ReactNode;
}

export function RampDialog({ type, children }: RampDialogProps) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState('');

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setAmount(value);
    }
    
    const handleSubmit = () => {
        console.log(`${type} ${amount} worth of ${type === 'buy' ? siteConfig.token.symbol : 'USD'}`);
        setOpen(false);
        setAmount('');
    }

    const isBuy = type === 'buy';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="capitalize">{type} {siteConfig.token.name}</DialogTitle>
          <DialogDescription>
            {isBuy ? `Enter the amount of ${siteConfig.token.symbol} you want to purchase.` : 'Enter the amount of LCL you want to sell for USD.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                   {isBuy ? siteConfig.token.symbol : 'USD'}
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
                {isBuy ? `You will pay ${amount || '0.00'} USD` : `You will receive ${amount || '0.00'} ${siteConfig.token.symbol}`}
            </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={!amount || parseFloat(amount) <= 0} className="capitalize">{type}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
