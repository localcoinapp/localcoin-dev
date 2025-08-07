'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { doc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface EditListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchantId: string; // Added merchantId prop
  listing: any; // Replace 'any' with your actual listing type
}

const categories = ['Coffee', 'Pastry', 'Accommodation', 'Food', 'Workspace', 'Dining', 'Beverages', 'Service']; // Define categories

const EditListingModal: React.FC<EditListingModalProps> = ({ isOpen, onClose, merchantId, listing }) => {
  const [editedListing, setEditedListing] = useState(listing);
  
  const formSchema = z.object({
    name: z.string().min(1, { message: 'Name is required.' }),
    price: z.coerce.number().positive({ message: 'Price must be positive.' }),
    category: z.string().min(1, { message: 'Category is required.' }),
    quantity: z.coerce.number().min(0, { message: 'Quantity cannot be negative.' }),
    // Add other fields as needed
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: listing?.name || '',
      price: listing?.price || 0,
      category: listing?.category || '',
      quantity: listing?.quantity || 0,
      // Initialize other fields
    },
  });

  useEffect(() => {
    // Reset form values when a new listing is passed in (modal opens with different listing)
    if (listing) {
      form.reset({
        name: listing.name || '',
        price: listing.price || 0,
        category: listing.category || '',
        quantity: listing.quantity || 0,
        // Reset other fields
      });
    }
  }, [listing]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('Form values submitted:', values);

    if (!merchantId || !listing) {
      console.error("Merchant ID or listing data is missing.");
      return;
    }

    const merchantDocRef = doc(db, 'merchants', merchantId);
    const updatedListing = { ...values, id: listing.id };

    try {
      await updateDoc(merchantDocRef, {
        listings: arrayRemove(listing)
      });
      await updateDoc(merchantDocRef, {
        listings: arrayUnion(updatedListing)
      });
      console.log("Listing updated successfully!");
      onClose(); // Close modal on success
    } catch (error) {
      console.error("Error updating listing:", error);
      // TODO: Show an error toast
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Listing: {listing?.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">Name</FormLabel>
                  <FormControl className="col-span-3">
                    <Input {...field} />
                  </FormControl>
                  <FormMessage className="col-span-4 col-start-1 text-right" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">Price</FormLabel>
                  <FormControl className="col-span-3">
                    <Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                  </FormControl>
                  <FormMessage className="col-span-4 col-start-1 text-right" />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl className="col-span-3">
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
                  <FormMessage className="col-span-4 col-start-1 text-right" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-4">
                  <FormLabel className="text-right">Quantity</FormLabel>
                   <FormControl className="col-span-3">
                    <Input type="number" step="1" {...field} onChange={(e) => field.onChange(parseInt(e.target.value, 10))} />
                  </FormControl>
                  <FormMessage className="col-span-4 col-start-1 text-right" />
                </FormItem>
              )}
            />
            {/* Add other form fields here */}
            <div className="flex justify-end col-span-4">
              <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
              <Button className="ml-2" type="submit">Save changes</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditListingModal;