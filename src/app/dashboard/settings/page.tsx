
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Loader2, Sparkles, Wand2 } from "lucide-react";
import { countries } from "@/data/countries";
import { states } from "@/data/states";
import { provinces } from "@/data/provinces";
import { useAuth } from "@/hooks/use-auth";
import { db, storage, ref, uploadBytesResumable, getDownloadURL } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useEffect, useMemo, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { geohashForLocation } from "geofire-common";
import { storeCategories } from "@/data/store-categories";
import { enhanceDescription } from "@/ai/flows/enhance-description";
import { generateImage } from "@/ai/flows/generate-image";
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
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";


type Position = { lat: number; lng: number };

// ---------- OpenStreetMap (Nominatim) geocoder ----------
async function geocodeAddress({
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
      // OSM/Nominatim require a descriptive User-Agent with contact
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

const storeSettingsSchema = z.object({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  category: z.string().min(1, { message: "Please select a store category." }),
  country: z.string().min(1, { message: "Please select a country." }),
  street: z.string().min(3, { message: "Please enter a street name." }),
  houseNumber: z.string().min(1, { message: "Please enter a house number." }),
  city: z.string().min(2, { message: "Please enter a city." }),
  state: z.string().optional(),
  zipCode: z.string().min(3, { message: "Please enter a ZIP or postal code." }),
  contactEmail: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(6, { message: "Please enter a valid phone number." }),
  website: z.string().url().optional().or(z.literal('')),
  instagram: z.string().optional(),
  description: z.string().min(20, { message: "Description must be at least 20 characters." }),
  taxNumber: z.string().optional(),
  logo: z.any().optional(),
  banner: z.any().optional(),
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

type StoreSettingsValues = z.infer<typeof storeSettingsSchema>;

const GenerateImageDialog = ({ onGenerate, fileType }: { onGenerate: (file: File) => void, fileType: 'logo' | 'banner' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();

    // Function to convert data URI to File object
    const dataUriToFiIe = (dataURI: string, filename: string): File => {
        const [meta, base64Data] = dataURI.split(',');
        const mimeType = meta.split(';')[0].split(':')[1];
        const binary = atob(base64Data);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
        }
        return new File([array], filename, { type: mimeType });
    };


    const handleGenerateClick = async () => {
        if (!prompt) {
            toast({ title: "Prompt Required", description: "Please enter a prompt for the image.", variant: "destructive" });
            return;
        }
        setIsGenerating(true);
        try {
            const result = await generateImage({ prompt });
            const file = dataUriToFiIe(result.imageDataUri, `${fileType}-${Date.now()}.png`);
            onGenerate(file);
            setIsOpen(false);
        } catch (error) {
            console.error("Image generation failed:", error);
            toast({ title: "Generation Failed", description: "Could not generate the image.", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <Button type="button" variant="outline" size="sm">
                    <Wand2 className="h-4 w-4 mr-2" /> Generate
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate {fileType.charAt(0).toUpperCase() + fileType.slice(1)} with AI</DialogTitle>
                    <DialogDescription>
                        Describe the image you want to create. Be as specific as possible for the best results.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <Textarea 
                        placeholder={`e.g., "A minimalist logo of a coffee cup with steam rising"`}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleGenerateClick} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Generate Image
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function StoreSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [merchantData, setMerchantData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [positionPreview, setPositionPreview] = useState<Position | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [isShutdownDialogOpen, setIsShutdownDialogOpen] = useState(false);
  const [shutdownConfirmation, setShutdownConfirmation] = useState("");


  const form = useForm<StoreSettingsValues>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {},
    mode: "onTouched",
  });

  // Subscribe to merchant doc
  useEffect(() => {
    if (user && user.merchantId) {
      const merchantDocRef = doc(db, 'merchants', user.merchantId);
      const unsubscribe = onSnapshot(merchantDocRef, (snapshot) => {
        const data = snapshot.data();
        if (data) {
          setMerchantData(data);
          form.reset(data as Partial<StoreSettingsValues>);
          // If position exists in doc, show preview
          if (data.position?.lat && data.position?.lng) {
            setPositionPreview({ lat: data.position.lat, lng: data.position.lng });
          }
        }
        setIsLoading(false);
      }, (err) => {
        console.error("Error loading merchant document:", err);
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      setIsLoading(false);
    }
  }, [user, form]);

  const selectedCountry = form.watch("country");

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleBannerClick = () => {
    bannerFileInputRef.current?.click();
  };
  
  const handleFileChange = async (file: File, fileType: 'logo' | 'banner') => {
    if (file && user && user.merchantId) {
      if (fileType === 'logo') {
        setIsUploading(true);
      } else {
        setIsUploadingBanner(true);
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('merchantId', user.merchantId);

      try {
          const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
          });

          if (!response.ok) {
              throw new Error('Upload failed');
          }

          const { url } = await response.json();
          
          const merchantDocRef = doc(db, 'merchants', user.merchantId);
          await setDoc(merchantDocRef, { [fileType]: url }, { merge: true });

          toast({ title: `${fileType.charAt(0).toUpperCase() + fileType.slice(1)} Updated`, description: `Your new ${fileType} has been saved.` });
      } catch (error) {
          console.error("Upload failed:", error);
          toast({ title: "Upload Failed", description: `Could not upload the ${fileType}.`, variant: "destructive" });
      } finally {
        if (fileType === 'logo') {
          setIsUploading(false);
        } else {
          setIsUploadingBanner(false);
        }
      }
    }
  };

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
        const result = await enhanceDescription({ description: currentDescription });
        form.setValue('description', result.enhancedDescription, { shouldValidate: true });
    } catch (error) {
        console.error("Error enhancing description:", error);
        toast({ title: "Enhancement Failed", description: "Could not enhance the description.", variant: "destructive" });
    } finally {
        setIsEnhancing(false);
    }
  };


  const onSubmit = async (values: StoreSettingsValues) => {
    if (!user || !user.merchantId) return;

    try {
      // Determine if address fields changed compared to loaded merchantData
      const addressChanged =
        values.street !== merchantData?.street ||
        values.houseNumber !== merchantData?.houseNumber ||
        values.city !== merchantData?.city ||
        values.zipCode !== merchantData?.zipCode ||
        values.country !== merchantData?.country;

      let position: Position | null = merchantData?.position ?? null;
      let geohash: string | null = merchantData?.geohash ?? null;

      if (addressChanged || !position) {
        position = await geocodeAddress({
          street: values.street,
          houseNumber: values.houseNumber,
          city: values.city,
          zipCode: values.zipCode,
          country: values.country,
        });

        if (!position) {
          throw new Error("Could not geocode the address. Please check the details.");
        }

        geohash = geohashForLocation([position.lat, position.lng]);
      }

      const dataToUpdate = {
        ...values,
        ...(position && { position }),
        ...(geohash && { geohash }),
        // Any extra fields you'd like to maintain can be merged by setDoc merge:true
      };

      const merchantDocRef = doc(db, 'merchants', user.merchantId);
      // Create if missing, update if exists
      await setDoc(merchantDocRef, dataToUpdate, { merge: true });

      setPositionPreview(position ?? null);

      toast({
        title: "Success",
        description: "Your store settings have been updated.",
      });
    } catch (error) {
      console.error("Error updating store settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message || "There was an error updating your store settings.",
      });
    }
  };

  const handleShutdownStore = async () => {
    if (!user || !user.merchantId) {
      toast({ title: "Error", description: "Could not identify the store to shut down.", variant: "destructive" });
      return;
    }

    const merchantDocRef = doc(db, 'merchants', user.merchantId);
    const userDocRef = doc(db, 'users', user.id);

    try {
        await deleteDoc(merchantDocRef);
        await updateDoc(userDocRef, {
            role: 'user',
            merchantId: null
        });

        toast({ title: "Store Shutdown", description: "Your store has been permanently removed." });
        router.push('/');
    } catch(error) {
        console.error("Error shutting down store:", error);
        toast({ title: "Error", description: "Could not shut down the store.", variant: "destructive" });
    } finally {
        setIsShutdownDialogOpen(false);
    }
  };

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
  };

  const mapEmbedUrl = useMemo(() => {
    if (!positionPreview) return null;
    const { lat, lng } = positionPreview;
    // Create a small bbox around point for OSM embed
    const d = 0.005; // ~500m
    const minLon = lng - d;
    const minLat = lat - d;
    const maxLon = lng + d;
    const maxLat = lat + d;
    const marker = `&marker=${lat}%2C${lng}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik${marker}`;
  }, [positionPreview]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-3xl text-left shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-1/2 mx-auto" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex items-center space-x-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex-grow space-y-2">
                <Skeleton className="h-6 w-full" />
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="text-right pt-4">
              <Skeleton className="h-10 w-24 ml-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || !user.merchantId) {
    return (
      <div className="container text-center p-8">
        <p>Could not load merchant data. You may not be a merchant.</p>
      </div>
    );
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
               <div className="space-y-2">
                    <FormLabel>Logo Image</FormLabel>
                    <div className="flex items-center gap-4">
                         <div className="relative">
                          <Avatar className="h-24 w-24 border">
                            <AvatarImage src={merchantData?.logo || "https://placehold.co/100x100"} alt="Store logo" />
                            <AvatarFallback>{(merchantData?.companyName?.[0] || "S")}</AvatarFallback>
                          </Avatar>
                           <input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0], 'logo')}
                            className="hidden"
                            accept="image/png, image/jpeg, image/gif"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAvatarClick}
                                disabled={isUploading}
                            >
                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                                Upload
                            </Button>
                             <GenerateImageDialog onGenerate={(file) => handleFileChange(file, 'logo')} fileType="logo" />
                        </div>
                        <div className="flex-grow pl-4">
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
                </div>

              <div className="space-y-2">
                <FormLabel>Banner Image</FormLabel>
                <div className="w-full h-48 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50 relative">
                  {isUploadingBanner && <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-10"><Loader2 className="h-8 w-8 animate-spin text-white"/></div>}
                  {merchantData?.banner && <img src={merchantData.banner} alt="Banner" className="w-full h-full object-cover rounded-lg" />}
                   <input
                    type="file"
                    ref={bannerFileInputRef}
                    onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0], 'banner')}
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif"
                  />
                  <div className="absolute flex gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleBannerClick}
                        disabled={isUploadingBanner}
                    >
                        <Camera className="h-4 w-4 mr-2" /> Upload Banner
                    </Button>
                    <GenerateImageDialog onGenerate={(file) => handleFileChange(file, 'banner')} fileType="banner" />
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                        <FormLabel>Store Description</FormLabel>
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
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Store Category</FormLabel>
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
                          {...field}
                        />
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

              {positionPreview && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Coordinates saved: <span className="font-mono">{positionPreview.lat.toFixed(6)}, {positionPreview.lng.toFixed(6)}</span>
                  </div>
                  <div className="w-full aspect-video rounded-lg overflow-hidden border">
                    <iframe
                      title="Location preview"
                      src={mapEmbedUrl || undefined}
                      className="w-full h-full"
                      loading="lazy"
                    />
                  </div>
                  <div className="text-right">
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${positionPreview.lat}&mlon=${positionPreview.lng}#map=16/${positionPreview.lat}/${positionPreview.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm underline"
                    >
                      Open in OpenStreetMap
                    </a>
                  </div>
                </div>
              )}

              <div className="text-right pt-4">
                <Button type="submit" size="lg" disabled={form.formState.isSubmitting || isUploading || isUploadingBanner}>
                  {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>

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
                            <CardTitle className="text-base">Shutdown Store</CardTitle>
                            <CardDescription>Permanently delete your store and all associated data.</CardDescription>
                         </div>
                         <AlertDialog open={isShutdownDialogOpen} onOpenChange={setIsShutdownDialogOpen}>
                             <AlertDialogTrigger asChild>
                                <Button variant="destructive">Shutdown Store</Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action is irreversible. It will permanently delete your store, listings, and all associated data. To confirm, please type <strong className="text-foreground">shutdown my store</strong> in the box below.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <Input 
                                    value={shutdownConfirmation}
                                    onChange={(e) => setShutdownConfirmation(e.target.value)}
                                    placeholder="shutdown my store"
                                />
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={handleShutdownStore}
                                        disabled={shutdownConfirmation !== 'shutdown my store'}
                                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                    >
                                        Yes, shut down my store
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
  );
}
