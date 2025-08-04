
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"

const settingsFormSchema = z.object({
  theme: z.enum(["light", "dark"], {
    required_error: "Please select a theme.",
  }),
  notifications: z.object({
    email: z.boolean().default(false).optional(),
    inApp: z.boolean().default(true).optional(),
  }),
})

type SettingsFormValues = z.infer<typeof settingsFormSchema>

// This can be fetched from a user's settings in a database.
const defaultValues: Partial<SettingsFormValues> = {
  theme: "light",
  notifications: {
    email: true,
    inApp: true,
  },
}

export default function SettingsPage() {
    const { toast } = useToast()

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsFormSchema),
        defaultValues,
    })

    const theme = form.watch("theme");

    React.useEffect(() => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
    }, [theme]);

    function onSubmit(data: SettingsFormValues) {
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
                            <FormField
                                control={form.control}
                                name="theme"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                    <FormLabel className="text-lg font-semibold">Appearance</FormLabel>
                                    <FormDescription>
                                        Select the theme for the application.
                                    </FormDescription>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex flex-col space-y-1"
                                        >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="light" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    Light
                                                </FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="dark" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    Dark
                                                </FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    </FormItem>
                                )}
                            />
                            
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
