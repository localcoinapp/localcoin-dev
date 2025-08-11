
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Activity, CheckCircle, Loader2 } from "lucide-react"
import { countries } from "@/data/countries"
import { states } from "@/data/states"
import { provinces } from "@/data/provinces"
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, doc, where, query, onSnapshot } from "firebase/firestore";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { geohashForLocation } from "geofire-common";


const formSchema = z.object({
  companyName: z.string().min(2, { message: "Please enter a company name." }),
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

type Position = { lat: number; lng: number };

// ---------- OpenStreetMap (Nominatim) geocoder ----------
async function geocodeAddressOSM({
  street,
  houseNumber,
  city,
  zipCode,
  country,
}: {
  street: string;
  houseNumber: string;
  city: string;
  zipCode: string;
  country: string;
}): Promise<Position | null> {
  const query = `${houseNumber} ${street}, ${zipCode} ${city}, ${country}`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&limit=1&addressdetails=1`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "LocalCoin/1.0 (fresh@katari.farm)",
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Geocoding API request failed");
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng };
}
// --------------------------------------------------------


export default function BecomeMerchantPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [applicationStatus, setApplicationStatus] = useState<'idle' | 'pending' | 'approved' | 'loading'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.id) {
      const appRefQuery = collection(db, "merchant_applications");
      const q = query(appRefQuery, where("userId", "==", user.id));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty) {
          const appDoc = querySnapshot.docs[0];
          const data = appDoc.data();
          if(data.status === 'pending') {
            setApplicationStatus('pending');
          } else if (data.status === 'approved') {
            router.push('/dashboard');
          } else {
            setApplicationStatus('idle');
          }
        } else {
          setApplicationStatus('idle');
        }
        setIsSubmitting(false);
      }, (error) => {
         console.error("Error fetching application status:", error);
         setApplicationStatus('idle');
         setIsSubmitting(false);
      });
      return () => unsubscribe();
    } else if (!user) {
        setIsSubmitting(false);
    }
  }, [user, router]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      country: "",
      street: "",
      houseNumber: "",
      city: "",
      state: "",
      zipCode: "",
      contactEmail: user?.email || "",
      phone: "",
      website: "",
      instagram: "",
      description: "",
    },
  });
  
  // Set user's email as default when user data is available
  useEffect(() => {
    if(user?.email) {
      form.setValue('contactEmail', user.email);
    }
  }, [user, form]);


  const selectedCountry = form.watch("country");

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
        toast({ title: "Error", description: "You must be logged in to apply.", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);

    try {
      const position = await geocodeAddressOSM({
        street: values.street,
        houseNumber: values.houseNumber,
        city: values.city,
        zipCode: values.zipCode,
        country: values.country,
      });

      if (!position) {
          throw new Error("Could not geocode the address. Please check it and try again.");
      }

      const applicationData = {
        ...values,
        position,
        geohash: geohashForLocation([position.lat, position.lng]),
        userId: user.id,
        userEmail: user.email,
        status: 'pending',
        submittedAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'merchant_applications'), applicationData);

      toast({
          title: "Application Submitted!",
          description: "Your application is now under review. We'll notify you of the outcome."
      });

      setApplicationStatus('pending');

    } catch (error) {
      console.error("Error during application submission:", error);
      toast({
        title: "Submission Error",
        description: (error as Error).message || "An unexpected error occurred.",
        variant: "destructive",
      });
      setApplicationStatus('idle');
    } finally {
        setIsSubmitting(false);
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
  
  if (applicationStatus === 'loading') {
    return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-12 w-12 animate-spin" /></div>;
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
                          <Input placeholder="e.g., SunnySide Cafe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Application'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
          )}
          {applicationStatus === 'pending' && (
              <div className="flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
                  <Activity className="h-16 w-16 mx-auto text-primary mb-4"/>
                  <p className="text-xl font-semibold">Application Under Review</p>
                  <p className="text-muted-foreground mt-2">Thank you for submitting. We are currently reviewing your application and this may take a few days.</p>
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
