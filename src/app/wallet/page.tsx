
'use client'

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, ArrowRight, LifeBuoy, ArrowUp, KeyRound, Eye, Loader2 } from "lucide-react"
import { siteConfig } from "@/config/site"
import { RampDialog } from "@/components/wallet/ramp-dialog"
import { RefundDialog } from "@/components/wallet/refund-dialog"
import Link from "next/link"
import { PurchaseHistory } from "@/components/purchase-history"
import { useAuth } from "@/hooks/use-auth"
import { Keypair } from "@solana/web3.js";
import * as bip39 from "bip39";
import { db } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"
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


export default function WalletPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isCreatingWallet, setIsCreatingWallet] = useState(false);
    const [showSeedPhrase, setShowSeedPhrase] = useState(false);
    const [newSeedPhrase, setNewSeedPhrase] = useState<string | null>(null);

    // This is a placeholder for now. Real balance would come from Solana's RPC.
    const walletBalance = 0; 

    const handleCreateWallet = async () => {
        if (!user) return;
        setIsCreatingWallet(true);
        try {
            const mnemonic = bip39.generateMnemonic();
            const seed = bip39.mnemonicToSeedSync(mnemonic);
            const keypair = Keypair.fromSeed(seed.slice(0, 32));
            const address = keypair.publicKey.toBase58();

            const userDocRef = doc(db, "users", user.id);
            // In a real app, this should be encrypted before storing
            await setDoc(userDocRef, { walletAddress: address, seedPhrase: mnemonic }, { merge: true });

            setNewSeedPhrase(mnemonic);
            toast({ title: "Wallet Created!", description: "Your new Solana wallet is ready."});
        } catch(e) {
            console.error("Wallet creation failed", e);
            toast({ title: "Error", description: "Failed to create a new wallet.", variant: "destructive"});
        } finally {
            setIsCreatingWallet(false);
        }
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
                  <CardTitle className="text-sm font-medium">Solana Wallet</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  {user?.walletAddress ? (
                    <div className="space-y-4">
                      <div className="text-2xl font-bold font-headline break-all">{user.walletAddress}</div>
                      <p className="text-xs text-muted-foreground">
                        Balance: {walletBalance.toFixed(2)} SOL
                      </p>
                      <div className="flex gap-2 mt-4">
                          <Button variant="secondary" size="sm" onClick={() => setShowSeedPhrase(true)}>
                              <Eye className="mr-2" /> Show Seed Phrase
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
                            <LifeBuoy className="mr-2 h-4 w-4" />
                            Sell / Refund
                        </Button>
                     </RefundDialog>
                </CardContent>
            </Card>
        </div>

        <PurchaseHistory />
      </div>

       {/* Dialog for displaying NEWLY created seed phrase */}
      <AlertDialog open={!!newSeedPhrase} onOpenChange={() => setNewSeedPhrase(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Wallet Created Successfully!</AlertDialogTitle>
                  <AlertDialogDescription>
                      Please save this seed phrase in a secure location. It is the ONLY way to recover your wallet.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <Alert variant="destructive" className="text-center">
                  <AlertDescriptionComponent className="font-mono p-4 bg-primary/10 rounded-md">
                    {newSeedPhrase}
                  </AlertDescriptionComponent>
              </Alert>
              <AlertDialogFooter>
                  <AlertDialogAction onClick={() => { navigator.clipboard.writeText(newSeedPhrase || ''); toast({ title: 'Copied!' }); }}>Copy Phrase</AlertDialogAction>
                  <AlertDialogCancel onClick={() => setNewSeedPhrase(null)}>I've saved it</AlertDialogCancel>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for showing EXISTING seed phrase */}
      <AlertDialog open={showSeedPhrase} onOpenChange={setShowSeedPhrase}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Your Secret Seed Phrase</AlertDialogTitle>
                  <AlertDialogDescription>
                    Do not share this with anyone! Anyone with this phrase can take your assets.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <Alert variant="destructive" className="text-center">
                  <AlertDescriptionComponent className="font-mono p-4 bg-primary/10 rounded-md">
                    {user?.seedPhrase || "No seed phrase found."}
                  </AlertDescriptionComponent>
              </Alert>
              <AlertDialogFooter>
                  <AlertDialogAction onClick={() => { navigator.clipboard.writeText(user?.seedPhrase || ''); toast({ title: 'Copied!' }); }}>Copy Phrase</AlertDialogAction>
                  <AlertDialogCancel onClick={() => setShowSeedPhrase(false)}>Close</AlertDialogCancel>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      </>
    );
}
