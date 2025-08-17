
'use client'

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "@/components/theme-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { auth, db } from "@/lib/firebase"
import { deleteUser } from "firebase/auth"
import { doc, deleteDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

const settingsFormSchema = z.object({
  theme: z.string(),
  mode: z.enum(["light", "dark", "system"]),
  notifications: z.object({
    email: z.boolean().default(false).optional(),
    inApp: z.boolean().default(true).optional(),
  }),
})

type SettingsFormValues = z.infer<typeof settingsFormSchema>

const defaultValues: Partial<SettingsFormValues> = {
  notifications: {
    email: true,
    inApp: true,
  },
}

export default function SettingsPage() {
    const { toast } = useToast()
    const { theme, setTheme, mode, setMode } = useTheme()
    const { user } = useAuth()
    const router = useRouter()
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
    const [deleteConfirmation, setDeleteConfirmation] = React.useState("")

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsFormSchema),
        defaultValues: {
            ...defaultValues,
            theme: theme || "theme-default-eco",
            mode: mode || "system",
        },
    })
    
    React.useEffect(() => {
        form.setValue("theme", theme || "theme-default-eco");
        form.setValue("mode", mode || "system");
    }, [theme, mode, form]);


    function onSubmit(data: SettingsFormValues) {
        setTheme(data.theme as any);
        setMode(data.mode);
        toast({
            title: "Settings Saved",
            description: "Your preferences have been updated.",
        })
        console.log("Settings data:", data)
    }

    const handleDeleteAccount = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser || !user) {
            toast({ title: "Error", description: "You must be logged in to delete your account.", variant: "destructive" });
            return;
        }

        try {
            // Conditionally run wallet logic
            if (user.walletAddress && user.walletBalance && user.walletBalance > 0) {
              // --- Wallet Transfer and Destruction Logic ---
              // In a real application, this is where you would securely:
              // 1. Load the user's wallet using their (hopefully encrypted) seed phrase.
              // 2. Transfer any remaining balance to an admin wallet.
              // 3. This logic is highly sensitive and requires a secure backend service.
              console.log("Placeholder: Transferring wallet balance for user:", user.id);
            } else {
              console.log("Skipping wallet cleanup: No wallet or zero balance.");
            }

            // Delete Firestore document
            const userDocRef = doc(db, "users", currentUser.uid);
            await deleteDoc(userDocRef);

            // Delete Firebase Auth user
            await deleteUser(currentUser);
            
            toast({ title: "Account Deleted", description: "Your account has been permanently deleted." });
            router.push('/'); // Redirect to homepage after deletion
        } catch (error: any) {
            console.error("Error deleting account:", error);
            // This can happen if the user needs to re-authenticate for security reasons
            if (error.code === 'auth/requires-recent-login') {
                toast({
                    title: "Re-authentication Required",
                    description: "Please log out and log back in again before deleting your account.",
                    variant: "destructive",
                    duration: 9000,
                });
            } else {
                toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
            }
        } finally {
            setIsDeleteDialogOpen(false);
        }
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <Card className="w-full max-w-2xl text-left shadow-lg">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline text-center">Settings</CardTitle>
                    <CardDescription className="text-center">
                        Manage your account settings and preferences.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Appearance</h3>
                                <p className="text-sm text-muted-foreground">
                                    Customize the look and feel of the application.
                                </p>
                                <FormField
                                    control={form.control}
                                    name="theme"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Theme</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a theme" />
                                                </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="theme-default-eco">Default</SelectItem>
                                                    <SelectItem value="theme-tropics">Tropics</SelectItem>
                                                    <SelectItem value="theme-berlin">Berlin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Select your color theme.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="mode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mode</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a mode" />
                                                </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="light">Light</SelectItem>
                                                    <SelectItem value="dark">Dark</SelectItem>
                                                    <SelectItem value="system">System</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Choose between light, dark, or system default mode.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold">Notifications</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Configure how you receive notifications.
                                    </p>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="notifications.email"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">Email Notifications</FormLabel>
                                                <FormDescription>
                                                    Receive notifications via email for important updates.
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="notifications.inApp"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">In-App Notifications</FormLabel>
                                                <FormDescription>
                                                    Show notifications within the application.
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="text-right pt-4">
                                <Button type="submit">Save Changes</Button>
                            </div>
                        </form>
                    </Form>
                    
                    <Separator className="my-8" />

                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold">Legal & Information</h3>
                            <p className="text-sm text-muted-foreground">
                                Review our terms and policies.
                            </p>
                        </div>
                        <Card>
                            <Link href="/user-agreement">
                                <CardHeader className="flex flex-row items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base">User Agreement</CardTitle>
                                        <CardDescription>Read our terms of service.</CardDescription>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </CardHeader>
                            </Link>
                        </Card>
                    </div>

                    <Separator className="my-8" />

                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
                            <p className="text-sm text-muted-foreground">
                                Be careful, these actions are not reversible.
                            </p>
                        </div>
                         <Card className="border-destructive">
                             <CardHeader className="flex-row items-center justify-between">
                                 <div className="space-y-1">
                                    <CardTitle className="text-base">Close Account</CardTitle>
                                    <CardDescription>Permanently delete your account and all associated data.</CardDescription>
                                 </div>
                                 <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                     <AlertDialogTrigger asChild>
                                        <Button variant="destructive">Close My Account</Button>
                                     </AlertDialogTrigger>
                                     <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action is irreversible. It will permanently delete your account, wallet, and all associated data. To confirm, please type <strong className="text-foreground">yes i am aware</strong> in the box below.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <Input 
                                            value={deleteConfirmation}
                                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                                            placeholder="yes i am aware"
                                        />
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction 
                                                onClick={handleDeleteAccount}
                                                disabled={deleteConfirmation !== 'yes i am aware'}
                                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                            >
                                                Yes, completely delete my account
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                     </AlertDialogContent>
                                 </AlertDialog>
                             </CardHeader>
                         </Card>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
