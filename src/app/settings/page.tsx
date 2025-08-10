
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
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "@/components/theme-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsFormSchema),
        defaultValues: {
            ...defaultValues,
            theme: theme || "default-eco",
            mode: mode || "system",
        },
    })
    
    React.useEffect(() => {
        form.setValue("theme", theme || "default-eco");
        form.setValue("mode", mode || "system");
    }, [theme, mode, form]);


    function onSubmit(data: SettingsFormValues) {
        setTheme(data.theme);
        setMode(data.mode);
        toast({
            title: "Settings Saved",
            description: "Your preferences have been updated.",
        })
        console.log("Settings data:", data)
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
                </CardContent>
            </Card>
        </div>
    )
}
