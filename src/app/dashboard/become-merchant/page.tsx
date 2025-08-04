
'use client'

import { useState } from "react";
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
import { Activity, CheckCircle } from "lucide-react"

const formSchema = z.object({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  address: z.string().min(10, { message: "Please enter a valid address." }),
  contactEmail: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "Please enter a valid phone number." }),
  website: z.string().url().optional().or(z.literal('')),
  instagram: z.string().optional(),
  description: z.string().min(20, { message: "Description must be at least 20 characters." }),
})


export default function BecomeMerchantPage() {
  const [applicationStatus, setApplicationStatus] = useState<'idle' | 'pending' | 'approved'>('idle');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      address: "",
      contactEmail: "",
      phone: "",
      website: "",
      instagram: "",
      description: "",
    },
  })

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log("Application submitted for review:", values);
    setApplicationStatus('pending');
    // In a real application, you would send this data to your backend for manual review.
    // We'll simulate the review process with a timeout.
    setTimeout(() => {
        setApplicationStatus('approved');
    }, 3000);
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-2xl text-left shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-center">Become a Merchant</CardTitle>
          <CardDescription className="text-center">
            Join our network of local businesses and start offering your services on the marketplace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applicationStatus === 'idle' && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="SunnySide Cafe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St, Anytown, USA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input placeholder="contact@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="instagram"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instagram (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="@yourhandle" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tell us about what you offer</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your business, services, and what makes you unique."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="text-center pt-4">
                    <Button type="submit" size="lg">Submit Application</Button>
                  </div>
                </form>
              </Form>
          )}
          {applicationStatus === 'pending' && (
              <div className="flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
                  <Activity className="h-16 w-16 mx-auto text-primary mb-4 animate-spin"/>
                  <p className="text-xl font-semibold">Application Under Review</p>
                  <p className="text-muted-foreground mt-2">Thank you for submitting. We are currently reviewing your application and this may take a few days.</p>
              </div>
          )}
          {applicationStatus === 'approved' && (
              <div className="flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
                  <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4"/>
                  <p className="text-xl font-semibold">Congratulations! You're Approved!</p>
                  <p className="text-muted-foreground mt-2">Your merchant application has been approved. You can now access the full merchant dashboard to list your services.</p>
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
