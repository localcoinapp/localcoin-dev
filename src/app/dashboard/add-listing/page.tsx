
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { doc, onSnapshot, updateDoc } from "firebase/firestore"; // Changed getDoc to onSnapshot
import { db } from "@/lib/firebase"; // Removed auth import as useAuth is used
import { useAuth } from "@/hooks/use-auth"; // Import useAuth hook
import { useEffect, useState } from "react";
import { storeCategories } from "@/data/store-categories"

const formSchema = z.object({
  name: z.string().min(3, { message: "Item name must be at least 3 characters." }),
  price: z.coerce.number().min(0.01, { message: "Price must be greater than 0." }),
  category: z.string().min(1, { message: "Please select a category." }),
  quantity: z.coerce.number().int().min(0, { message: "Quantity must be a positive number." }),
})

export default function AddListingPage() {
  const router = useRouter();
  const { user } = useAuth(); // Use useAuth hook
  const [merchantData, setMerchantData] = useState<any>(null); // State to store merchant data

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      price: 0,
      category: "",
      quantity: 1,
    },
  })

  useEffect(() => {
    if (user && user.merchantId) {
      const merchantDocRef = doc(db, 'merchants', user.merchantId);
      const unsubscribe = onSnapshot(merchantDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setMerchantData(data); // Set merchant data in state
        } else {
          // Redirect if merchant document doesn't exist for the user's merchantId
          router.push('/dashboard');
        }
      }, (error) => {
        console.error("Error fetching merchant data:", error);
        // Handle error, perhaps redirect or show an error message
        router.push('/dashboard');
      });
      return () => unsubscribe(); // Cleanup the subscription
    } else if (user && !user.merchantId) {
       // If user is logged in but has no merchantId, redirect
       router.push('/dashboard');
    } else if (!user) {
      // If user is not logged in, redirect to login
      router.push('/login');
    }
  }, [user, router]); // Depend on user and router

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !user.merchantId) {
      return; // Should be handled by useEffect redirect
    }

    const merchantRef = doc(db, "merchants", user.merchantId); // Use user.merchantId

    // No need to get the doc again here, as we have merchantData from the snapshot
    // We can directly update the listings array

    try {
      const currentListings = merchantData?.listings || []; // Use merchantData from state

      const newListing = {
        id: Date.now().toString(), // Simple unique ID based on timestamp
        ...values
      };

      await updateDoc(merchantRef, {
        listings: [...currentListings, newListing]
      });

      router.push('/dashboard');
    } catch (error) {
      console.error("Error adding listing:", error);
      // Handle error, show a toast or message
    }
  };

  if (!user || !merchantData) {
    // Show a loading spinner or a message while checking/fetching data
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-center">
        <p>Loading merchant data...</p>
      </div>
    );
  }

  // Render the form only when merchantData is available
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-2xl text-left shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-center">Add New Listing</CardTitle>
          <CardDescription className="text-center">
            Fill out the form below to add a new item or service to your store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Artisanal Coffee Beans" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (in LCL)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="15.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity Available</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" placeholder="100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {storeCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit">Add Listing</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
