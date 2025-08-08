
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera } from "lucide-react"
import { countries } from "@/data/countries"
import { states } from "@/data/states"
import { provinces } from "@/data/provinces"
import { useAuth } from "@/hooks/use-auth"
import { db } from "@/lib/firebase"
import { doc, onSnapshot, updateDoc } from "firebase/firestore"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { geocodeAddress } from "@/ai/flows/geocode-address"

const storeSettingsSchema = z.object({
    companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
    country: z.string().min(1, { message: "Please select a country." }),
    street: z.string().min(3, { message: "Please enter a street name." }),
    houseNumber: z.string().min(1, { message: "Please enter a house number." }),
    city: z.string().min(2, { message: "Please enter a city." }),
    state: z.string().optional(),
    zipCode: z.string().min(3, { message: "Please enter a ZIP or postal code." }),
    contactEmail: z.string().email({ message: "Please enter a valid email address." }),
    phone: z.string().min(10, { message: "Please enter a valid phone number." }),
    website: z.string().url().optional().or(z.literal('')),
    instagram: z.string().optional(),
    description: z.string().min(20, { message: "Description must be at least 20 characters." }),
    taxNumber: z.string().optional(),
    logo: z.any().optional(),
}).refine(data => {
    if (data.country === 'US') {
        const usPhoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
        return usPhoneRegex.test(data.phone);
    }
    return true;
}, {
    message: "Please enter a valid US phone number format (e.g., (123) 456-7890).",
    path: ["phone"],
});

type StoreSettingsValues = z.infer<typeof storeSettingsSchema>

export default function StoreSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [merchantData, setMerchantData] = useState<any>(null);
  
  const form = useForm<StoreSettingsValues>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {},
  })

  useEffect(() => {
    if (user && user.merchantId) {
      const merchantDocRef = doc(db, 'merchants', user.merchantId);
      const unsubscribe = onSnapshot(merchantDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setMerchantData(data);
          form.reset(data);
        }
      });
      return () => unsubscribe();
    }
  }, [user, form]);

  const selectedCountry = form.watch("country");

  const onSubmit = async (values: StoreSettingsValues) => {
    if (!user || !user.merchantId) return;

    try {
      const fullAddress = `${values.houseNumber} ${values.street}, ${values.city}, ${values.state || ''} ${values.zipCode}, ${values.country}`;
      const position = await geocodeAddress({ address: fullAddress });

      const dataToUpdate = {
        ...values,
        position,
      };

      const merchantDocRef = doc(db, 'merchants', user.merchantId);
      await updateDoc(merchantDocRef, dataToUpdate);

      toast({
        title: "Success",
        description: "Your store settings have been updated.",
      });
    } catch (error) {
      console.error("Error updating store settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error updating your store settings. Could not geocode address.",
      });
    }
  }

  const renderStateField = () => {
    if (selectedCountry === 'US') {
      return (
        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a state" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state.code} value={state.code}>{state.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }
    if (selectedCountry === 'CA') {
      return (
        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Province</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a province" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {provinces.map((province) => (
                    <SelectItem key={province.code} value={province.code}>{province.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }
    return null;
  }

  if (!merchantData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-3xl text-left shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-center">Store Settings</CardTitle>
          <CardDescription className="text-center">
            Manage your public store information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={merchantData.logo || "https://placehold.co/100x100"} alt="Store logo" />
                    <AvatarFallback>{merchantData.companyName?.[0] || "S"}</AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full"
                  >
                    <Camera className="h-4 w-4" />
                    <span className="sr-only">Change logo</span>
                  </Button>
                </div>
                <div className="flex-grow">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Company" {...field} className="text-2xl font-bold" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your business and what you offer."
                        className="resize-none"
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="taxNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID / VAT Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Your business tax number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Street</FormLabel>
                      <FormControl>
                        <Input placeholder="Sonnenallee" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  <FormField
                  control={form.control}
                  name="houseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>House No.</FormLabel>
                      <FormControl>
                        <Input placeholder="223" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Berlin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  {renderStateField()}
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP / Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="12059" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                        <Input 
                            placeholder={selectedCountry === 'US' ? "(555) 123-4567" : "Your phone number"}
                            {...field} />
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
                      <FormLabel>Website</FormLabel>
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
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <Input placeholder="@yourhandle" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="text-right pt-4">
                <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
