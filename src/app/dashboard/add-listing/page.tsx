
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
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { storeCategories } from "@/data/store-categories"
import { enhanceItemDescription } from "@/ai/flows/enhance-item-description"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Sparkles } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(3, { message: "Item name must be at least 3 characters." }),
  price: z.coerce.number().min(0.01, { message: "Price must be greater than 0." }),
  category: z.string().min(1, { message: "Please select a category." }),
  quantity: z.coerce.number().int().min(0, { message: "Quantity must be a positive number." }),
  description: z.string().optional(),
})

export default function AddListingPage() {
  const router = useRouter();
  const { user } = useAuth(); 
  const [merchantData, setMerchantData] = useState<any>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      price: 0,
      category: "",
      quantity: 1,
      description: "",
    },
  })

  useEffect(() => {
    if (user && user.merchantId) {
      const merchantDocRef = doc(db, 'merchants', user.merchantId);
      const unsubscribe = onSnapshot(merchantDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setMerchantData(data);
        } else {
          router.push('/dashboard');
        }
      }, (error) => {
        console.error("Error fetching merchant data:", error);
        router.push('/dashboard');
      });
      return () => unsubscribe();
    } else if (user && !user.merchantId) {
       router.push('/dashboard');
    } else if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleEnhanceDescription = async () => {
    const currentDescription = form.getValues('description');
    if (!currentDescription) {
        toast({
            title: "No Description",
            description: "Please enter a description first before enhancing.",
            variant: "destructive"
        });
        return;
    }
    setIsEnhancing(true);
    try {
        const result = await enhanceItemDescription({ description: currentDescription });
        form.setValue('description', result.enhancedDescription, { shouldValidate: true });
    } catch (error) {
        console.error("Error enhancing description:", error);
        toast({ title: "Enhancement Failed", description: "Could not enhance the description.", variant: "destructive" });
    } finally {
        setIsEnhancing(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !user.merchantId) {
      return; 
    }

    const merchantRef = doc(db, "merchants", user.merchantId);

    try {
      const currentListings = merchantData?.listings || [];

      const newListing = {
        id: Date.now().toString(),
        active: true,
        ...values
      };

      await updateDoc(merchantRef, {
        listings: [...currentListings, newListing]
      });

      router.push('/dashboard');
    } catch (error) {
      console.error("Error adding listing:", error);
    }
  };

  if (!user || !merchantData) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-center">
        <p>Loading merchant data...</p>
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
                          {storeCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Item Description</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleEnhanceDescription}
                        disabled={isEnhancing}
                      >
                        {isEnhancing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Enhance with AI
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the item..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
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
