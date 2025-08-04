
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
    const [lclAmount, setLclAmount] = useState('');
    const [usdAmount, setUsdAmount] = useState('');

    const handleLclChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLclAmount(value);
        setUsdAmount(value); // Assuming 1 LCL = 1 USD
    }
    
    const handleUsdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setUsdAmount(value);
        setLclAmount(value);
    }
    
    const handleSubmit = () => {
        console.log(`${type} ${lclAmount} ${siteConfig.token.symbol} for ${usdAmount} USD`);
        setOpen(false);
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
            {type === 'buy' ? 'Purchase LCL to use in the marketplace.' : 'Sell your LCL for USD.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lcl-amount" className="text-right">
                    {siteConfig.token.symbol}
                </Label>
                <Input
                    id="lcl-amount"
                    value={lclAmount}
                    onChange={handleLclChange}
                    className="col-span-3"
                    type="number"
                    placeholder="0.00"
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="usd-amount" className="text-right">
                    USD
                </Label>
                <Input
                    id="usd-amount"
                    value={usdAmount}
                    onChange={handleUsdChange}
                    className="col-span-3"
                    type="number"
                    placeholder="0.00"
                />
            </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} className="capitalize">{type}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
