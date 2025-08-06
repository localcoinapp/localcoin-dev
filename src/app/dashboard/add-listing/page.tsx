
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
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from "react";

const formSchema = z.object({
  name: z.string().min(3, { message: "Item name must be at least 3 characters." }),
  price: z.coerce.number().min(0.01, { message: "Price must be greater than 0." }),
  category: z.string().min(1, { message: "Please select a category." }),
  quantity: z.coerce.number().int().min(0, { message: "Quantity must be a positive number." }),
})

const categories = ['Coffee', 'Pastry', 'Accommodation', 'Food', 'Workspace', 'Dining', 'Beverages', 'Service'];

export default function AddListingPage() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [isMerchant, setIsMerchant] = useState(false);

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
    const checkMerchantStatus = async () => {
      if (user) {
        const merchantRef = doc(db, "merchants", user.uid);
        const docSnap = await getDoc(merchantRef);
        if (docSnap.exists()) {
          const merchantData = docSnap.data();
          // Assuming your merchant document has an 'owner' field that matches the user ID
          // And potentially a 'role' field if you have different types of users
          if (merchantData?.owner === user.uid) { // Adjust this check based on your data structure
            setIsMerchant(true);
          } else {
            router.push('/dashboard'); // Redirect if not the owner of the merchant document
          }
        } else {
          router.push('/dashboard'); // Redirect if no merchant document found for the user
        }
      } else {
        router.push('/login'); // Redirect to login if not authenticated
      }
    };
    checkMerchantStatus();
  }, [user, router]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      return; // Should be handled by useEffect redirect
    }

    const merchantRef = doc(db, "merchants", user.uid);

    getDoc(merchantRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const merchantData = docSnap.data();
          const currentListings = merchantData?.listings || []; // Assuming listings is an array

          const newListing = {
            id: Date.now().toString(), // Simple unique ID based on timestamp
            ...values
          };

          return updateDoc(merchantRef, {
            listings: [...currentListings, newListing]
          });
        } else {
          console.error("Merchant document not found for the current user.");
          throw new Error("Merchant not found");
        }
      })
      .then(() => {
        router.push('/dashboard');
      })
      .catch((error) => console.error("Error adding listing:", error));
  };

  if (!user || !isMerchant) {
    // You can show a loading spinner or a message while checking
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-center">
        <p>Checking merchant status...</p>
      </div>
    );
  }
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
                          {categories.map((cat) => (
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
