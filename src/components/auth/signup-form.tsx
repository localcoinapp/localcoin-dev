async function onSubmit(values: z.infer<typeof formSchema>) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, values.email, values.password);

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      id: user.uid,
      email: values.email,
      country: values.country,
      role: 'user',
      profileComplete: false,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    }, { merge: true });

    await sendEmailVerification(user);

    // Force a clean email-verification flow
    await auth.signOut();
    toast({
      title: "Almost there!",
      description: "Check your inbox and verify your email, then sign in.",
      duration: 9000,
    });
    router.push("/login?verify=1");
  } catch (error: any) {
    console.error("Signup Error:", error);
    toast({
      variant: "destructive",
      title: "Signup Failed",
      description: `Error: ${error.code} - ${error.message}`,
    });
  }
}
