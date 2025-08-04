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
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera } from "lucide-react"

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email(),
  bio: z.string().max(160).optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

// This can be fetched from a database in a real application
const defaultValues: Partial<ProfileFormValues> = {
  name: "Current User",
  email: "user@example.com",
  bio: "I'm a user of this awesome platform!",
}

export default function ProfilePage() {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: "onChange",
  })

  function onSubmit(data: ProfileFormValues) {
    console.log("Profile updated:", data)
    // Here you would typically send the data to your backend
  }

  return (
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
                    <AvatarImage src="https://placehold.co/100x100" alt="User avatar" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full"
                  >
                    <Camera className="h-4 w-4" />
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
                <Button type="submit">Update Profile</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
