
'use client'

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, ArrowUp, KeyRound, Eye, Loader2, History } from "lucide-react"
import { siteConfig } from "@/config/site"
import { RampDialog } from "@/components/wallet/ramp-dialog"
import { RefundDialog } from "@/components/wallet/refund-dialog"
import { PurchaseHistory } from "@/components/purchase-history"
import { useAuth } from "@/hooks/use-auth"
import { Keypair, Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription as AlertDescriptionComponent } from "@/components/ui/alert"
import * as bip39 from "bip39";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TransactionHistoryModal } from "@/components/wallet/transaction-history-modal"


export default function WalletPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isCreatingWallet, setIsCreatingWallet] = useState(false);
    const [isViewingSeed, setIsViewingSeed] = useState(false);
    const [showSeedDialog, setShowSeedDialog] = useState(false);
    const [currentSeedPhrase, setCurrentSeedPhrase] = useState<string | null>(null);
    const [tokenBalance, setTokenBalance] = useState(0);
    const [isBalanceLoading, setIsBalanceLoading] = useState(true);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedSignature, setSelectedSignature] = useState<string | null>(null);

    useEffect(() => {
        const fetchBalance = async () => {
            if (user?.walletAddress) {
                setIsBalanceLoading(true);
                try {
                    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
                    const walletPublicKey = new PublicKey(user.walletAddress);
                    const tokenMintPublicKey = new PublicKey(siteConfig.token.mintAddress);

                    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPublicKey, {
                        mint: tokenMintPublicKey,
                    });

                    if (tokenAccounts.value.length > 0) {
                        const accountInfo = tokenAccounts.value[0].account.data.parsed.info;
                        setTokenBalance(accountInfo.tokenAmount.uiAmount || 0);
                    } else {
                        setTokenBalance(0);
                    }
                } catch (error) {
                    console.error("Failed to fetch token balance:", error);
                    setTokenBalance(0);
                    toast({
                        title: "Error",
                        description: "Could not fetch wallet balance.",
                        variant: "destructive"
                    });
                } finally {
                    setIsBalanceLoading(false);
                }
            } else {
                setIsBalanceLoading(false);
            }
        };

        fetchBalance();
    }, [user?.walletAddress, toast]);


    const handleCreateWallet = async () => {
        if (!user) return;
        setIsCreatingWallet(true);
        try {
            const mnemonic = bip39.generateMnemonic();
            const seed = bip39.mnemonicToSeedSync(mnemonic);
            const keypair = Keypair.fromSeed(seed.slice(0, 32));
            const walletAddress = keypair.publicKey.toBase58();

            const userDocRef = doc(db, 'users', user.id);
            await updateDoc(userDocRef, {
                walletAddress: walletAddress,
                seedPhrase: mnemonic,
            });
            
            setCurrentSeedPhrase(mnemonic);
            setShowSeedDialog(true);
            
            toast({ title: "Wallet Created!", description: "Your new Solana wallet is ready."});

        } catch(e) {
            console.error("Wallet creation failed", e);
            toast({ title: "Error", description: (e as Error).message, variant: "destructive"});
        } finally {
            setIsCreatingWallet(false);
        }
    }

    const handleViewSeedPhrase = () => {
        if (!user?.seedPhrase) {
            toast({ title: "Error", description: "Seed phrase not found.", variant: "destructive" });
            return;
        }
        setCurrentSeedPhrase(user.seedPhrase);
        setShowSeedDialog(true);
    }
    
    const handleViewTransaction = (signature: string) => {
        setSelectedSignature(signature);
        setIsHistoryModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsHistoryModalOpen(false);
        setSelectedSignature(null);
    }

    return (
      <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline">My Wallet</h1>
            <p className="text-muted-foreground">Manage your balance and transaction history.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  {user?.walletAddress ? (
                    <div className="space-y-4">
                      <div className="text-2xl font-bold font-headline">
                        {isBalanceLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            `${tokenBalance.toFixed(2)} ${siteConfig.token.symbol}`
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground pt-2 break-all">
                        Address: {user.walletAddress}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                          <Button variant="secondary" size="sm" onClick={handleViewSeedPhrase} disabled={isViewingSeed}>
                              {isViewingSeed ? <Loader2 className="animate-spin mr-2" /> : <Eye className="mr-2" />}
                              Show Seed Phrase
                          </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-4">
                        <p className="text-muted-foreground">You have not created a wallet yet.</p>
                        <Button onClick={handleCreateWallet} disabled={isCreatingWallet}>
                            {isCreatingWallet ? <Loader2 className="animate-spin mr-2"/> : <KeyRound className="mr-2" />}
                            Create Wallet
                        </Button>
                    </div>
                  )}
              </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Buy/Sell Tokens</CardTitle>
                    <CardDescription>Add or remove funds from your wallet.</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                    <RampDialog type="buy">
                      <Button>
                        <ArrowUp className="mr-2 h-4 w-4" />
                        Buy
                      </Button>
                    </RampDialog>
                     <RefundDialog>
                        <Button variant="secondary">
                            Request Refund
                        </Button>
                     </RefundDialog>
                </CardContent>
            </Card>
        </div>

        <PurchaseHistory onViewTransaction={handleViewTransaction} />
      </div>

      <AlertDialog open={showSeedDialog} onOpenChange={setShowSeedDialog}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Your Secret Seed Phrase</AlertDialogTitle>
                  <AlertDialogDescription>
                      This is the ONLY way to recover your wallet. Store it securely and do not share it with anyone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <Alert variant="destructive" className="text-center">
                  <AlertDescriptionComponent className="font-mono p-4 bg-primary/10 rounded-md">
                    {currentSeedPhrase}
                  </AlertDescriptionComponent>
              </Alert>
              <AlertDialogFooter>
                  <AlertDialogAction onClick={() => { navigator.clipboard.writeText(currentSeedPhrase || ''); toast({ title: 'Copied!' }); }}>Copy Phrase</AlertDialogAction>
                  <AlertDialogCancel onClick={() => { setCurrentSeedPhrase(null); setShowSeedDialog(false) }}>I've saved it</AlertDialogCancel>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      {user?.walletAddress && (
          <TransactionHistoryModal 
            isOpen={isHistoryModalOpen} 
            onClose={handleCloseModal} 
            walletAddress={user.walletAddress}
            signature={selectedSignature}
          />
      )}
      </>
    );
}
