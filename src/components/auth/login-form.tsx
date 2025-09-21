'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider
} from "firebase/auth"
import { auth, db, app } from "@/lib/firebase"            // <-- IMPORTANT: export `app` from your firebase init
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { getFunctions, httpsCallable } from "firebase/functions"

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
import { siteConfig } from "@/config/site"

const USERS_COL = "users";
const BLOCKED_COL = "blocked_users";
function norm(s: any) { return (typeof s === "string" ? s.trim().toLowerCase() : String(s ?? "")); }

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
})

/*
  IMPORTANT PRE-REQS:
  - Your firebase init (e.g. /lib/firebase) must export `app`, `auth`, and `db`.
    Example:
      import { initializeApp } from "firebase/app"
      import { getAuth } from "firebase/auth"
      import { getFirestore } from "firebase/firestore"
      const app = initializeApp(firebaseConfig)
      const auth = getAuth(app)
      const db = getFirestore(app)
      export { app, auth, db }
  - Deploy a callable function named "checkBlocked" (admin SDK reads blocked_users).
*/

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  // functions client, bound to same app
  const functions = getFunctions(app);
  const checkBlockedCallable = httpsCallable(functions, 'checkBlocked');

  async function checkBlockedForCurrentUser(): Promise<boolean> {
    // Caller must be signed-in; callable uses context.auth to know uid.
    const resp = await checkBlockedCallable({});
    // resp.data expected: { blocked: boolean }
    return !!resp?.data?.blocked;
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      if (!user?.uid) throw new Error("No user id returned from auth.");

      // Use callable to check blocked status (no client read to blocked_users)
      try {
        const isBlocked = await checkBlockedForCurrentUser();
        if (isBlocked) {
          await auth.signOut();
          toast({
            variant: "destructive",
            title: "Account Blocked",
            description: "Your account has been blocked. Please contact support for assistance.",
            duration: 9000,
          });
          return;
        }
      } catch (err: any) {
        // Callable failed — treat conservatively
        console.error("checkBlocked callable failed:", err);
        await auth.signOut();
        toast({
          variant: "destructive",
          title: "Sign-In Failed",
          description: "Unable to verify account status. Try again later.",
        });
        return;
      }

      // Upsert lastLoginAt into users doc (this is allowed by your rules; user can write own doc)
      const userDocRef = doc(db, USERS_COL, user.uid);
      await setDoc(userDocRef, { lastLoginAt: serverTimestamp() }, { merge: true });

      // Read authoritative role & route accordingly
      const refreshedUserDoc = await getDoc(userDocRef);
      const roleRaw = refreshedUserDoc.exists() ? refreshedUserDoc.data()?.role : null;
      const role = norm(roleRaw) || "user";

      toast({ title: "Success", description: "You have been logged in." });
      if (role === 'admin') router.push('/admin');
      else if (role === 'merchant') router.push('/dashboard');
      else router.push('/');
    } catch (error: any) {
      console.error("Login Error:", error);
      toast({ variant: "destructive", title: "Login Failed", description: `Error: ${error.message}`, duration: 9000 });
    }
  }

  // SOCIAL SIGN-IN supporting popup, with fallback to redirect to avoid COOP/COEP popup close errors
  const signInWithProvider = async (provider: GoogleAuthProvider | OAuthProvider) => {
    // first try popup
    try {
      const result = await signInWithPopup(auth, provider);
      // popup succeeded — handle post-sign-in flows
      await afterSocialSignIn(result.user);
    } catch (popupError: any) {
      console.warn("signInWithPopup failed — falling back to redirect:", popupError?.message || popupError);
      // If popup was blocked by COOP/COEP/CSP or browser settings, use redirect
      try {
        await signInWithRedirect(auth, provider);
        // note: after redirect you must handle the result on page load (see below)
      } catch (redirectErr: any) {
        console.error("signInWithRedirect also failed:", redirectErr);
        toast({ variant: "destructive", title: "Sign-In Failed", description: `Social sign-in failed: ${redirectErr.message || redirectErr}`, duration: 9000 });
      }
    }
  }

  // afterSocialSignIn runs after a successful sign-in (popup result or after handling redirect result)
  const afterSocialSignIn = async (user: any) => {
    if (!user?.uid) {
      toast({ variant: "destructive", title: "Sign-In Failed", description: "No user ID available." });
      await auth.signOut();
      return;
    }

    // callable to check if blocked
    try {
      const isBlocked = await checkBlockedForCurrentUser();
      if (isBlocked) {
        await auth.signOut();
        toast({ variant: "destructive", title: "Account Blocked", description: "Your account has been blocked. Contact support.", duration: 9000 });
        return;
      }
    } catch (e: any) {
      console.error("checkBlocked callable failed:", e);
      await auth.signOut();
      toast({ variant: "destructive", title: "Sign-In Failed", description: "Unable to verify account status. Try again later." });
      return;
    }

    // safe upsert: we do a setDoc({merge:true}) so we do not require read permission for blocked_users etc.
    const userDocRef = doc(db, USERS_COL, user.uid);
    // calculate admin from email fallback (for new social users) too
    const normalizedEmail = norm(user.email);
    const isAdminEmail = normalizedEmail && normalizedEmail === norm(siteConfig.adminEmail);

    await setDoc(userDocRef, {
      lastLoginAt: serverTimestamp(),
      uid: user.uid,
      id: user.uid,
      email: user.email,
      name: user.displayName,
      avatar: user.photoURL,
      // only default role for new users; merge:true preserves existing role
      role: isAdminEmail ? "admin" : "user",
      profileComplete: isAdminEmail ? true : false,
      createdAt: serverTimestamp()
    }, { merge: true });

    const refreshed = await getDoc(userDocRef);
    const roleRaw = refreshed.exists() ? refreshed.data()?.role : null;
    const role = norm(roleRaw) || (isAdminEmail ? "admin" : "user");

    toast({ title: "Success", description: "You have been logged in." });
    if (role === "admin") router.push("/admin");
    else if (role === "merchant") router.push("/dashboard");
    else router.push("/");
  }

  // On page load: handle redirect result if social sign-in used redirect fallback earlier
  React.useEffect(() => {
    (async () => {
      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult && redirectResult.user) {
          // a redirect sign-in completed — run normal after sign-in
          await afterSocialSignIn(redirectResult.user);
        }
      } catch (err) {
        console.warn("getRedirectResult error (this is okay if no redirect just happened):", err);
      }
    })();
  }, []);

  const handleGoogleSignIn = () => signInWithProvider(new GoogleAuthProvider());
  const handleAppleSignIn = () => signInWithProvider(new OAuthProvider('apple.com'));

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4"><Logo /></div>
        <CardTitle className="text-2xl font-headline">Welcome Back</CardTitle>
        <CardDescription>Sign in to access your wallet and the marketplace.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>Sign in with Google</Button>
          <Button variant="outline" className="w-full" onClick={handleAppleSignIn}>Sign in with Apple</Button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or continue with</span></div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input placeholder="name@example.com" {...field} /></FormControl>
                <FormMessage/>
              </FormItem>
            )}/>
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl><Input type="password" placeholder="********" {...field} /></FormControl>
                <FormMessage/>
              </FormItem>
            )}/>
            <Button type="submit" className="w-full">Sign In</Button>
          </form>
        </Form>

        <p className="mt-4 text-center text-sm text-muted-foreground">Don't have an account? <Link href="/signup" className="underline hover:text-primary">Sign up</Link></p>
      </CardContent>
    </Card>
  )
}
