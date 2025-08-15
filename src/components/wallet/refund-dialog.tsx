
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
import { Textarea } from "@/components/ui/textarea"
import { siteConfig } from "@/config/site"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal, LifeBuoy } from "lucide-react"

interface RefundDialogProps {
  children: React.ReactNode;
}

export function RefundDialog({ children }: RefundDialogProps) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        console.log(`Refund request submitted: Amount: ${amount} ${siteConfig.token.symbol}, Reason: ${reason}`);
        // In a real app, this would trigger a support ticket creation process.
        setOpen(false);
        setAmount('');
        setReason('');
    }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Request a Refund</DialogTitle>
          <DialogDescription>
            Submit a request to refund your {siteConfig.token.name}. Our team will review your case.
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
                    onChange={(e) => setAmount(e.target.value)}
                    className="col-span-3"
                    type="number"
                    placeholder={`0.00 ${siteConfig.token.symbol}`}
                />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="reason" className="text-right pt-2">
                   Reason
                </Label>
                 <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="col-span-3"
                    placeholder="Please describe the reason for your refund request in detail."
                />
            </div>
            <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Please Note</AlertTitle>
                <AlertDescription>
                    Refunds are not guaranteed and are handled on a case-by-case basis. The review process is managed offline by our support team.
                </AlertDescription>
            </Alert>
        </div>
        <DialogFooter>
          <Button 
            type="submit" 
            onClick={handleSubmit} 
            disabled={!amount || parseFloat(amount) <= 0 || !reason.trim()}
          >
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
