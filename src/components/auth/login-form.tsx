'use client';

import React, { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import { auth, db, functions } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "../logo";
import { useToast } from "@/hooks/use-toast";
import { siteConfig } from "@/config/site";

const USERS_COL = "users";
function norm(s: any) {
  return typeof s === "string" ? s.trim().toLowerCase() : String(s ?? "");
}

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  // Callable for blocked users
  const checkBlocked = httpsCallable(functions, "checkBlocked");

  const handlePostLogin = async (user: any) => {
    // Call server-side function to check blocked status
    const blockedResult: any = await checkBlocked({ uid: user.uid });
    if (blockedResult?.data?.blocked) {
      await auth.signOut();
      toast({
        variant: "destructive",
        title: "Account Blocked",
        description: "Your account has been blocked. Please contact support.",
      });
      return;
    }

    const userDocRef = doc(db, USERS_COL, user.uid);
    await setDoc(
      userDocRef,
      {
        uid: user.uid,
        email: user.email,
        lastLoginAt: serverTimestamp(),
      },
      { merge: true }
    );

    const refreshedDoc = await getDoc(userDocRef);
    const roleRaw = refreshedDoc.exists() ? refreshedDoc.data()?.role : null;
    const role = norm(roleRaw) || "user";

    toast({ title: "Success", description: "You have been logged in." });

    if (role === "admin") {
      router.push("/admin");
    } else if (role === "merchant") {
      router.push("/dashboard");
    } else {
      router.push("/");
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const userCred = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      await handlePostLogin(userCred.user);
    } catch (error: any) {
      console.error("Login Error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
    }
  };

  const handleSocialSignIn = async (provider: GoogleAuthProvider | OAuthProvider) => {
    try {
      try {
        const result = await signInWithPopup(auth, provider);
        await handlePostLogin(result.user);
      } catch (popupErr: any) {
        console.warn("Popup sign-in failed, falling back to redirect:", popupErr);
        await signInWithRedirect(auth, provider);
      }
    } catch (error: any) {
      console.error("Social Sign-In Error:", error);
      toast({
        variant: "destructive",
        title: "Sign-In Failed",
        description: error.message,
      });
    }
  };

  const handleGoogleSignIn = () => handleSocialSignIn(new GoogleAuthProvider());
  const handleAppleSignIn = () => handleSocialSignIn(new OAuthProvider("apple.com"));

  // Handle redirect result after signInWithRedirect
  useEffect(() => {
    (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          await handlePostLogin(result.user);
        }
      } catch (err) {
        console.error("Redirect Sign-In Error:", err);
      }
    })();
  }, []);

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Logo />
        </div>
        <CardTitle className="text-2xl font-headline">Welcome Back</CardTitle>
        <CardDescription>
          Sign in to access your wallet and the marketplace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
            Sign in with Google
          </Button>
          <Button variant="outline" className="w-full" onClick={handleAppleSignIn}>
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
            <Button type="submit" className="w-full">
              Sign In
            </Button>
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
  );
}
