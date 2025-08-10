
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Textarea } from '../ui/textarea';
import { enhanceItemDescription } from '@/ai/flows/enhance-item-description';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles } from 'lucide-react';
import { storeCategories } from '@/data/store-categories';

interface EditListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchantId: string;
  listing: any;
}

const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  price: z.coerce.number().positive({ message: 'Price must be positive.' }),
  category: z.string().min(1, { message: 'Category is required.' }),
  quantity: z.coerce.number().min(0, { message: 'Quantity cannot be negative.' }),
  description: z.string().optional(),
  active: z.boolean(),
  id: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const EditListingModal: React.FC<EditListingModalProps> = ({ isOpen, onClose, merchantId, listing }) => {
  const { toast } = useToast();
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: listing?.name || '',
      price: listing?.price || 0,
      category: listing?.category || '',
      quantity: listing?.quantity || 0,
      description: listing?.description || '',
      active: listing?.active ?? true,
      id: listing?.id || '',
    },
  });

  useEffect(() => {
    if (listing) {
      form.reset(listing);
    }
  }, [listing, form]);

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

  const onSubmit = async (values: FormValues) => {
    if (!merchantId || !listing) return;

    const merchantDocRef = doc(db, 'merchants', merchantId);

    try {
        const merchantDoc = await getDoc(merchantDocRef);
        if (!merchantDoc.exists()) throw new Error("Merchant not found");

        const currentListings = merchantDoc.data().listings || [];
        
        const updatedListings = currentListings.map((l: any) =>
            l.id === listing.id ? values : l
        );

        await updateDoc(merchantDocRef, {
            listings: updatedListings
        });
        
        toast({ title: "Success", description: "Listing updated successfully." });
        onClose();
    } catch (error) {
        console.error("Error updating listing:", error);
        toast({ title: "Error", description: "Could not update the listing.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Listing: {listing?.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
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
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" {...field} />
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
                      Enhance
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
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditListingModal;
