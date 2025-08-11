
'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Loader2, KeyRound, Eye } from "lucide-react"
import { countries } from "@/data/countries"
import { states } from "@/data/states"
import { provinces } from "@/data/provinces"
import { useAuth } from "@/hooks/use-auth"
import { auth, db, updateProfile } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import React, { useRef, useState } from "react"
import { Keypair } from "@solana/web3.js";
import * as bip39 from "bip39";
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
import { Separator } from "@/components/ui/separator"
import { Alert, AlertTitle, AlertDescription as AlertDescriptionComponent } from "@/components/ui/alert"


const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email(),
  bio: z.string().max(160).optional(),
  country: z.string().min(1, { message: "Please select a country." }),
  address: z.object({
    street: z.string().optional(),
    houseNumber: z.string().optional(),
    postcode: z.string().optional(),
  }),
  state: z.string().optional(),
  province: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function ProfilePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [newSeedPhrase, setNewSeedPhrase] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      bio: "",
      country: "",
      address: { street: "", houseNumber: "", postcode: "" },
      state: "",
      province: "",
    },
    mode: "onChange",
  })

  const watchedCountry = form.watch("country")

  React.useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email || "",
        bio: user.bio || "",
        country: user.country || "US",
        address: {
          street: user.address?.street || "",
          houseNumber: user.address?.houseNumber || "",
          postcode: user.address?.postcode || "",
        },
        state: user.state || "",
        province: user.province || "",
      })
    }
  }, [user, form])

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.id);

    try {
        const response = await fetch('/api/user/avatar', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed');
        }

        toast({ title: "Avatar Updated", description: "Your new avatar has been saved." });
        window.location.reload();

    } catch (error) {
        console.error("Upload failed:", error);
        toast({ title: "Upload Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
        setIsUploading(false);
    }
  };

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

  async function onSubmit(data: ProfileFormValues) {
    try {
      const currentUser = auth.currentUser
      if (currentUser) {
        await updateProfile(currentUser, { displayName: data.name })

        const userDocRef = doc(db, "users", currentUser.uid)
        await setDoc(userDocRef, {
          name: data.name,
          email: data.email,
          bio: data.bio,
          country: data.country,
          address: data.address,
          state: data.state,
          province: data.province,
        }, { merge: true })
      }
      toast({ title: "Profile updated", description: "Your profile has been updated successfully." })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({ title: "Error", description: "There was an error updating your profile.", variant: "destructive" })
    }
  }

  return (
    <>
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-2xl text-left shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-center">My Profile</CardTitle>
          <CardDescription className="text-center">
            Manage your account settings and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user?.avatar || "https://placehold.co/100x100"} alt="User avatar" />
                    <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                   <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full"
                    onClick={handleAvatarClick}
                    disabled={isUploading}
                  >
                     {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    <span className="sr-only">Change avatar</span>
                  </Button>
                </div>
                <div className="flex-grow">
                  <h2 className="text-2xl font-bold">{form.watch("name")}</h2>
                  <p className="text-muted-foreground">{form.watch("email")}</p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {watchedCountry === 'US' && (
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {states.map((state) => (
                            <SelectItem key={state.code} value={state.code}>{state.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {watchedCountry === 'CA' && (
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Province</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your province" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {provinces.map((province) => (
                            <SelectItem key={province.code} value={province.code}>{province.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="address.street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Your street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address.houseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>House Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Your house number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address.postcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postcode</FormLabel>
                    <FormControl>
                      <Input placeholder="Your postcode" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="your@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us a little bit about yourself"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="text-right">
                <Button type="submit" disabled={form.formState.isSubmitting || isUploading}>
                    {form.formState.isSubmitting || isUploading ? 'Saving...' : 'Update Profile'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
         <Separator className="my-6" />
        <CardHeader>
            <CardTitle>Wallet Management</CardTitle>
            <CardDescription>
              Your Solana wallet for all transactions on the platform.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {user?.walletAddress ? (
                <div className="space-y-4">
                    <div>
                        <FormLabel>Your Solana Wallet Address</FormLabel>
                        <p className="font-mono text-sm text-muted-foreground break-all">{user.walletAddress}</p>
                    </div>
                     <Button variant="secondary" onClick={() => setShowSeedPhrase(true)}>
                        <Eye className="mr-2" /> Show Seed Phrase
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col items-start gap-4">
                    <p className="text-muted-foreground">You do not have a wallet yet.</p>
                    <Button onClick={handleCreateWallet} disabled={isCreatingWallet}>
                        {isCreatingWallet ? <Loader2 className="animate-spin mr-2"/> : <KeyRound className="mr-2" />}
                        Create Wallet
                    </Button>
                </div>
            )}
        </CardContent>
      </Card>
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
  )
}
