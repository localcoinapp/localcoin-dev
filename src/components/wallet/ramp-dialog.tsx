
'use client'

import { useState, useMemo, useEffect } from "react"
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
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Skeleton } from "../ui/skeleton"

interface RampDialogProps {
  type: 'buy';
  children: React.ReactNode;
}

type PaymentStep = 'amount' | 'method' | 'details';
type Currency = 'EUR' | 'USD';
type PaymentMethod = 'stripe' | 'bank' | 'crypto';
type TokenInfo = {
    mint: string;
    balance: number;
    name?: string; // Optional name for display (e.g., "SOL")
}


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
    const [isScanningWallet, setIsScanningWallet] = useState(false);
    const [walletTokens, setWalletTokens] = useState<TokenInfo[]>([]);


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
        setWalletTokens([]);
        setIsScanningWallet(false);
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
    
    const handleScanWallet = async () => {
        if (!user || !user.walletAddress) {
            toast({ title: "Wallet not found", description: "Your wallet address is not available.", variant: "destructive" });
            return;
        }
        setIsScanningWallet(true);
        setWalletTokens([]);
        try {
            const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
            const walletPublicKey = new PublicKey(user.walletAddress);

            // --- 1. Fetch native SOL balance ---
            const solBalanceLamports = await connection.getBalance(walletPublicKey);
            const solBalance = solBalanceLamports / LAMPORTS_PER_SOL;
            const allTokens: TokenInfo[] = [];

            if (solBalance > 0) {
                allTokens.push({
                    name: 'SOL',
                    mint: 'So11111111111111111111111111111111111111112', // Native SOL mint address
                    balance: solBalance,
                });
            }

            // --- 2. Fetch SPL Token balances ---
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPublicKey, {
                programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
            });
            
            const splTokens = tokenAccounts.value
                .map(account => {
                    const parsedInfo = account.account.data.parsed.info;
                    return {
                        mint: parsedInfo.mint,
                        balance: parsedInfo.tokenAmount.uiAmount,
                    };
                })
                .filter(token => token.balance > 0); // Only show tokens with a balance
            
            // --- 3. Combine and set state ---
            const finalTokenList = [...allTokens, ...splTokens];
            setWalletTokens(finalTokenList);

            if (finalTokenList.length === 0) {
                 toast({ title: "No Tokens Found", description: "No SOL or other tokens were found in your wallet."});
            }

        } catch (error) {
            console.error("Failed to scan wallet:", error);
            toast({ title: "Error", description: "Could not scan your wallet for tokens.", variant: "destructive" });
        } finally {
            setIsScanningWallet(false);
        }
    }


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
                                <Button className="w-full" variant="outline" onClick={handleScanWallet} disabled={isScanningWallet}>
                                    {isScanningWallet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    Scan my wallet for tokens
                                </Button>

                                <div className="p-4 border rounded-md space-y-3 text-sm text-muted-foreground min-h-[150px]">
                                     <p className="font-semibold text-foreground">Your Tokens</p>
                                    {isScanningWallet ? (
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-5/6" />
                                        </div>
                                    ) : walletTokens.length > 0 ? (
                                        <div className="space-y-2">
                                            {walletTokens.map(token => (
                                                <div key={token.mint} className="flex justify-between items-center text-foreground">
                                                    <div>
                                                        <span className="font-semibold">{token.name || 'Token'}</span>
                                                        <span className="font-mono text-xs block break-all pr-2">{token.name ? '' : token.mint}</span>
                                                    </div>
                                                    <span className="font-semibold">{token.balance.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p>Your tokens will appear here after scanning.</p>
                                    )}
                                    <Separator />
                                    <p className="font-semibold text-foreground pt-2">Next Steps</p>
                                    <p>Select a token from the list above to proceed with the swap.</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button 
                                    type="submit" 
                                    onClick={handleSubmit} 
                                    disabled={true} // Disabled until full swap logic is implemented
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
