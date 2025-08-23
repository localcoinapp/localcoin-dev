
'use client'

import { useState, useMemo } from "react"
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
import { Loader2, ArrowLeft, Copy, Check } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { RadioGroup, RadioGroupItem } from "../ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { Separator } from "../ui/separator"

interface RampDialogProps {
  type: 'buy';
  children: React.ReactNode;
}

type PaymentStep = 'amount' | 'method' | 'details';
type Currency = 'EUR' | 'USD';
type PaymentMethod = 'stripe' | 'bank';

const generateUniqueCode = (userId: string) => {
    const userPart = userId.substring(0, 4).toUpperCase();
    const datePart = Date.now().toString().slice(-6);
    return `${userPart}-${datePart}`;
};

export function RampDialog({ type, children }: RampDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<PaymentStep>('amount');
    const [currency, setCurrency] = useState<Currency>('EUR');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [hasCopiedCode, setHasCopiedCode] = useState(false);
    const [hasCopiedIban, setHasCopiedIban] = useState(false);


    const uniqueTransferCode = useMemo(() => {
        if (user) return generateUniqueCode(user.id);
        return null;
    }, [user]);

    const resetState = () => {
        setAmount('');
        setStep('amount');
        setCurrency('EUR');
        setPaymentMethod(null);
        setIsLoading(false);
    }
    
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            resetState();
        }
        setOpen(isOpen);
    }

    const handleCopyToClipboard = (text: string, type: 'code' | 'iban') => {
        navigator.clipboard.writeText(text);
        if (type === 'code') {
            setHasCopiedCode(true);
            setTimeout(() => setHasCopiedCode(false), 2000);
        } else {
            setHasCopiedIban(true);
            setTimeout(() => setHasCopiedIban(false), 2000);
        }
    };


    const handleSubmit = async () => {
        if (!user || !user.walletAddress || !amount || !paymentMethod) {
            toast({
                title: "Error",
                description: "User wallet, amount, or payment method is missing.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        try {
            const requestsCollection = collection(db, 'tokenPurchaseRequests');
            await addDoc(requestsCollection, {
                userId: user.id,
                userName: user.name || user.email,
                userWalletAddress: user.walletAddress,
                amount: parseFloat(amount),
                status: 'pending',
                createdAt: serverTimestamp(),
                currency: currency,
                paymentMethod: paymentMethod,
                transferCode: paymentMethod === 'bank' ? uniqueTransferCode : null,
            });

            toast({
                title: "Request Submitted!",
                description: `Your request to buy ${amount} ${siteConfig.token.symbol} is pending admin approval.`,
            });
            
            handleOpenChange(false);
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

    const renderStepContent = () => {
        switch (step) {
            case 'amount':
                return (
                    <>
                        <DialogHeader>
                            <DialogTitle className="capitalize">{type} {siteConfig.token.name}</DialogTitle>
                            <DialogDescription>
                                Enter the amount you want to purchase and select the currency.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount</Label>
                                <Input
                                    id="amount"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    type="number"
                                    placeholder="100.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                                    <SelectTrigger id="currency">
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EUR">EUR (€)</SelectItem>
                                        <SelectItem value="USD">USD ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button 
                                type="button" 
                                onClick={() => setStep('method')} 
                                disabled={!amount || parseFloat(amount) <= 0} 
                            >
                                Continue
                            </Button>
                        </DialogFooter>
                    </>
                );
            
            case 'method':
                return (
                     <>
                        <DialogHeader>
                             <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setStep('amount')}><ArrowLeft/></Button>
                                <DialogTitle>Select Payment Method</DialogTitle>
                             </div>
                             <DialogDescription>
                                How would you like to pay for your {amount} {currency} purchase?
                             </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <RadioGroup value={paymentMethod || ''} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                                <Label htmlFor="stripe" className="flex justify-between items-center p-4 border rounded-md has-[:checked]:border-primary">
                                    <div>
                                        <p className="font-semibold">Credit/Debit Card (Stripe)</p>
                                        <p className="text-sm text-muted-foreground">Pay instantly with your card.</p>
                                    </div>
                                    <RadioGroupItem value="stripe" id="stripe" />
                                </Label>
                                <Label htmlFor="bank" className="flex justify-between items-center p-4 border rounded-md has-[:checked]:border-primary">
                                    <div>
                                        <p className="font-semibold">Bank Transfer</p>
                                        <p className="text-sm text-muted-foreground">Manually transfer from your bank.</p>
                                    </div>
                                    <RadioGroupItem value="bank" id="bank" />
                                </Label>
                            </RadioGroup>
                        </div>
                        <DialogFooter>
                            <Button 
                                type="button" 
                                onClick={() => setStep('details')}
                                disabled={!paymentMethod}
                            >
                                Continue
                            </Button>
                        </DialogFooter>
                     </>
                );

            case 'details':
                if (paymentMethod === 'stripe') {
                    return (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => setStep('method')}><ArrowLeft/></Button>
                                    <DialogTitle>Pay with Stripe</DialogTitle>
                                </div>
                                <DialogDescription>
                                    You are about to purchase tokens worth {amount} {currency}.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 text-center">
                                {/* ====================================================================== */}
                                {/* FUTURE STRIPE INTEGRATION POINT                                        */}
                                {/* ====================================================================== */}
                                {/*                                                                        */}
                                {/* 1. Create a server-side API endpoint (e.g., /api/create-stripe-session). */}
                                {/* 2. In that endpoint, use the Stripe Node.js library to create a         */}
                                {/*    Checkout Session with the amount and currency.                        */}
                                {/* 3. On this page, call that API endpoint to get the session ID.           */}
                                {/* 4. Use the Stripe.js library to redirect to the Stripe-hosted checkout.  */}
                                {/*    (e.g., stripe.redirectToCheckout({ sessionId: 'YOUR_SESSION_ID' })) */}
                                {/* 5. For now, this is a placeholder.                                     */}
                                {/*                                                                        */}
                                {/* ====================================================================== */}
                                <Alert>
                                    <AlertTitle>Stripe Integration Coming Soon</AlertTitle>
                                    <AlertDescription>
                                        This is a placeholder for the Stripe Checkout integration. Press "Confirm Purchase" to submit your request for now. We are using the {currency === 'EUR' ? 'EU' : 'US'} Stripe processor.
                                    </AlertDescription>
                                </Alert>
                            </div>
                            <DialogFooter>
                                <Button 
                                    type="submit" 
                                    onClick={handleSubmit} 
                                    disabled={isLoading} 
                                >
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirm Purchase
                                </Button>
                            </DialogFooter>
                        </>
                    )
                }
                if (paymentMethod === 'bank') {
                    const details = siteConfig.bankDetails[currency];
                    return (
                        <>
                           <DialogHeader>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => setStep('method')}><ArrowLeft/></Button>
                                    <DialogTitle>Bank Transfer Details</DialogTitle>
                                </div>
                                <DialogDescription>
                                   Please transfer {amount} {currency} to the account below. Your purchase will be approved once funds are received.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <Alert variant="destructive">
                                    <AlertTitle>Important!</AlertTitle>
                                    <AlertDescription>
                                        You MUST include the unique transfer code in the reference/memo field of your bank transfer.
                                    </AlertDescription>
                                </Alert>
                                <div className="p-4 border rounded-md space-y-2">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Unique Transfer Code</p>
                                            <p className="font-mono font-bold">{uniqueTransferCode}</p>
                                        </div>
                                         <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(uniqueTransferCode!, 'code')}>
                                            {hasCopiedCode ? <Check className="h-4 w-4 text-green-500"/> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <Separator/>
                                     {currency === 'EUR' ? (
                                        <>
                                           <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">IBAN</p>
                                                    <p className="font-mono">{details.iban}</p>
                                                </div>
                                                 <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(details.iban!, 'iban')}>
                                                    {hasCopiedIban ? <Check className="h-4 w-4 text-green-500"/> : <Copy className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                            <p className="text-sm"><span className="text-muted-foreground">Beneficiary:</span> {details.beneficiary}</p>
                                            <p className="text-sm"><span className="text-muted-foreground">BIC/SWIFT:</span> {details.bic}</p>
                                        </>
                                     ) : (
                                        <>
                                            <p className="text-sm"><span className="text-muted-foreground">Account Number:</span> <span className="font-mono">{details.accountNumber}</span></p>
                                            <p className="text-sm"><span className="text-muted-foreground">ACH Routing:</span> <span className="font-mono">{details.achRouting}</span></p>
                                            <p className="text-sm"><span className="text-muted-foreground">Beneficiary:</span> {details.beneficiary}</p>
                                        </>
                                     )}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button 
                                    type="submit" 
                                    onClick={handleSubmit} 
                                    disabled={isLoading} 
                                >
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    I have sent the transfer
                                </Button>
                            </DialogFooter>
                        </>
                    )
                }
                return null;
        }
    }


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {renderStepContent()}
      </DialogContent>
    </Dialog>
  )
}
