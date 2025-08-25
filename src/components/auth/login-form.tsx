
'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, OAuthProvider } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "../logo"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
})

const AuthFixAlert = () => {
    const domainToAdd = "studio--localcoin-marketplace.us-central1.hosted.app";
    const consoleUrl = `https://console.firebase.google.com/project/localcoin-marketplace/authentication/settings`;

    return (
        <Alert variant="destructive" className="mb-6">
            <Terminal className="h-4 w-4" />
            <AlertTitle className="font-bold">Action Required to Fix Login</AlertTitle>
            <AlertDescription>
                <p className="mb-2">The login error is because the application's domain is not authorized in your Firebase settings. You must add it manually.</p>
                <ol className="list-decimal list-inside space-y-2">
                    <li>
                        Click this link to go to the Firebase Console: <br/>
                        <a href={consoleUrl} target="_blank" rel="noopener noreferrer" className="font-mono underline break-all">{consoleUrl}</a>
                    </li>
                    <li>Click the **"Add domain"** button.</li>
                    <li>
                        Copy and paste this exact domain into the text box: <br/>
                        <strong className="font-mono bg-background text-destructive-foreground p-1 rounded break-all">{domainToAdd}</strong>
                    </li>
                    <li>Click **"Add"** to save it. Then, try logging in again.</li>
                </ol>
            </AlertDescription>
        </Alert>
    );
};

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Check if user is in the 'blocked_users' collection
      const blockedUserDocRef = doc(db, "blocked_users", user.uid);
      const blockedDocSnap = await getDoc(blockedUserDocRef);

      if (blockedDocSnap.exists()) {
        // If user is blocked, sign them out and show a specific error
        await auth.signOut();
        toast({
          variant: "destructive",
          title: "Account Blocked",
          description: "Your account has been blocked. Please contact support for assistance.",
          duration: 9000,
        });
        return; 
      }

      toast({ title: "Success", description: "You have been logged in." });
      router.push('/');
    } catch (error: any) {
      console.error("Login Error:", error);
      // Display the raw error in the toast to help debug
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: `Error: ${error.message}`,
        duration: 9000,
      });
    }
  }
  
  const handleSocialSignIn = async (provider: GoogleAuthProvider | OAuthProvider) => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Also check if social login user is blocked
      const blockedUserDocRef = doc(db, "blocked_users", user.uid);
      const blockedDocSnap = await getDoc(blockedUserDocRef);
      if (blockedDocSnap.exists()) {
        await auth.signOut();
        toast({
          variant: "destructive",
          title: "Account Blocked",
          description: "Your account has been blocked. Please contact support for assistance.",
          duration: 9000,
        });
        return;
      }

      // Check if user exists in Firestore's 'users' collection
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create user document if it doesn't exist (first time social login)
        await setDoc(userDocRef, {
          email: user.email,
          name: user.displayName,
          avatar: user.photoURL,
          role: 'user', // Default role
          walletBalance: 0
        });
      }
      toast({ title: "Success", description: "You have been logged in." });
      router.push('/');
    } catch (error: any) {
      console.error("Social Sign-In Error:", error);
      toast({
        variant: "destructive",
        title: "Sign-In Failed",
        description: `Error: ${error.message}`,
        duration: 9000,
      });
    }
  }

  const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();
    handleSocialSignIn(provider);
  }

  const handleAppleSignIn = () => {
    const provider = new OAuthProvider('apple.com');
    handleSocialSignIn(provider);
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Logo />
        </div>
        <CardTitle className="text-2xl font-headline">Welcome Back</CardTitle>
        <CardDescription>Sign in to access your wallet and the marketplace.</CardDescription>
      </CardHeader>
      <CardContent>
        <AuthFixAlert />
        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 62.3l-68.6 68.6c-20.5-19.4-48-31.5-79.3-31.5-62.3 0-113.5 51.6-113.5 114.9s51.2 114.9 113.5 114.9c72.3 0 96.9-46.3 102.5-69.1H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path></svg>
            Sign in with Google
          </Button>
          <Button variant="outline" className="w-full" onClick={handleAppleSignIn}>
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="apple" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C39.2 141.6 0 184.2 0 241.2c0 61.6 31.3 117.4 58.8 152.4 26.8 34.1 56.2 43.2 89.2 42.8 28.5-.3 55-11.4 77.2-11.4 21.3 0 44.4 11.9 70.2 11.9 33.6 0 62.5-11.4 86.7-34.9 21.6-20.8 34.9-50.7 34.9-85.8zM216.5 81.6c14.2-16.1 21.2-35.1 21.2-53.1-22.5.2-42.9 8.2-59.2 24.3-14.9 14.9-24.8 34.9-22.5 53.8 23.1-.4 42.9-8.7 59.2-24.3z"></path></svg>
            Sign in with Apple
          </Button>
        </div>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">Sign In</Button>
          </form>
        </Form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="underline hover:text-primary">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

    