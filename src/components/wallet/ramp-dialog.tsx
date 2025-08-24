
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
import { Loader2, ArrowLeft, Copy, Check, Wallet } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { RadioGroup, RadioGroupItem } from "../ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { Separator } from "../ui/separator"
import { loadStripe, Stripe } from '@stripe/stripe-js';

interface RampDialogProps {
  type: 'buy';
  children: React.ReactNode;
}

type PaymentStep = 'amount' | 'method' | 'details';
type Currency = 'EUR' | 'USD';
type PaymentMethod = 'stripe' | 'bank' | 'crypto';

const generateUniqueCode = (userId: string) => {
    const userPart = userId.substring(0, 4).toUpperCase();
    const datePart = Date.now().toString().slice(-6);
    return `${userPart}-${datePart}`;
};

// Function to get the correct Stripe promise based on currency
const getStripePromise = (currency: Currency) => {
    const publishableKey = currency === 'EUR' 
        ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_EUR
        : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_USD;

    if (!publishableKey) {
        throw new Error(`Stripe publishable key for ${currency} is not set.`);
    }
    return loadStripe(publishableKey);
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

        // --- Stripe Payment Flow ---
        if (paymentMethod === 'stripe') {
            try {
                const response = await fetch('/api/stripe/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: parseFloat(amount),
                        currency: currency,
                        userId: user.id,
                        userName: user.name || user.email,
                        userWalletAddress: user.walletAddress,
                    }),
                });

                const { sessionId, error: apiError } = await response.json();
                
                if (apiError || !response.ok) {
                    throw new Error(apiError || "Failed to create Stripe session.");
                }

                const stripe = await getStripePromise(currency);
                if (!stripe) throw new Error("Stripe.js has not loaded yet.");

                const { error } = await stripe.redirectToCheckout({ sessionId });

                if (error) {
                    toast({
                        title: "Stripe Error",
                        description: error.message || "An unexpected error occurred during redirection.",
                        variant: "destructive"
                    });
                }
            } catch (error) {
                 toast({
                    title: "Request Failed",
                    description: (error as Error).message,
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // --- Bank Transfer & Crypto placeholder Flow ---
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
                                <Label htmlFor="stripe" className="flex justify-between items-center p-4 border rounded-md has-[:checked]:border-primary cursor-pointer">
                                    <div>
                                        <p className="font-semibold">Credit/Debit Card (Stripe)</p>
                                        <p className="text-sm text-muted-foreground">Pay instantly with your card.</p>
                                    </div>
                                    <RadioGroupItem value="stripe" id="stripe" />
                                </Label>
                                <Label htmlFor="bank" className="flex justify-between items-center p-4 border rounded-md has-[:checked]:border-primary cursor-pointer">
                                    <div>
                                        <p className="font-semibold">Bank Transfer</p>
                                        <p className="text-sm text-muted-foreground">Manually transfer from your bank.</p>
                                    </div>
                                    <RadioGroupItem value="bank" id="bank" />
                                </Label>
                                <Label htmlFor="crypto" className="flex justify-between items-center p-4 border rounded-md has-[:checked]:border-primary cursor-pointer">
                                    <div>
                                        <p className="font-semibold">Pay with Crypto</p>
                                        <p className="text-sm text-muted-foreground">Use another token in your wallet.</p>
                                    </div>
                                    <RadioGroupItem value="crypto" id="crypto" />
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
                                    <DialogTitle>Pay with Card</DialogTitle>
                                </div>
                                <DialogDescription>
                                    You will be redirected to Stripe to securely complete your purchase of tokens worth {amount} {currency}.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 text-center">
                               <Alert>
                                    <AlertTitle>Redirecting to Stripe</AlertTitle>
                                    <AlertDescription>
                                        Press "Continue to Payment" to proceed to our secure payment page.
                                    </AlertDescription>
                                </Alert>
                            </div>
                            <DialogFooter>
                                <Button 
                                    type="submit" 
                                    onClick={handleSubmit} 
                                    disabled={isLoading} 
                                >
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Continue to Payment
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
                if (paymentMethod === 'crypto') {
                    return (
                         <>
                           <DialogHeader>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => setStep('method')}><ArrowLeft/></Button>
                                    <DialogTitle>Pay with Crypto</DialogTitle>
                                </div>
                                <DialogDescription>
                                   Pay for {amount} {siteConfig.token.symbol} tokens by swapping another token from your wallet.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <Button className="w-full" variant="outline">
                                    <Wallet className="mr-2 h-4 w-4" /> Scan my wallet for tokens
                                </Button>

                                {/* 
                                  // ================== DEVELOPER TODO ==================
                                  // This section is a placeholder for the crypto payment UI.
                                  // You would need to implement the following logic here:
                                  //
                                  // 1. **Scan Wallet**: On button click, use Connection.getParsedTokenAccountsByOwner(user.walletAddress)
                                  //    to find all tokens the user holds.
                                  //
                                  // 2. **Get Prices**: For each token found, use a price oracle API (e.g., Jupiter aggregator)
                                  //    to get its current price in USD.
                                  //
                                  // 3. **Display Tokens**: Populate a list or a <Select> component with the tokens the user can afford to swap.
                                  //    For each token, show the user's balance and its USD value.
                                  //
                                  // 4. **Calculate Swap**: When a user selects a token, calculate how much of that token is
                                  //    needed to equal the value of the LCL tokens they want to buy (e.g., $50 of LCL = $50 of USDC).
                                  //
                                  // 5. **Execute Swap**: On confirmation, use a library like @solana/web3.js to construct and
                                  //    send a transaction that transfers the selected token from the user's wallet to the admin's wallet.
                                  // ======================================================
                                */}
                                <div className="p-4 border rounded-md space-y-3 text-sm text-muted-foreground">
                                    <p className="font-semibold text-foreground">1. Your Tokens</p>
                                    <p>After scanning, your available tokens will appear here.</p>
                                    
                                    <p className="font-semibold text-foreground pt-3 border-t">2. Select Token to Pay With</p>
                                    <p>Select a token from the list above.</p>

                                    <p className="font-semibold text-foreground pt-3 border-t">3. Confirm Swap</p>
                                    <p>You will be asked to approve the transaction to swap your token for {amount} {siteConfig.token.symbol}.</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button 
                                    type="submit" 
                                    onClick={handleSubmit} 
                                    disabled={true} // Disabled until wallet integration is complete
                                >
                                    Pay with Crypto (Coming Soon)
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

    