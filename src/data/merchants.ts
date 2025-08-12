
import type { Merchant } from "@/types";

// Note: This is mock data. The `id` will be replaced by Firestore's auto-generated ID.
// The `owner` should correspond to a `uid` in your `users` collection.
export const merchants: Omit<Merchant, 'id'>[] = [
    // All mock merchants have been removed as requested.
    // The application will now rely on the data in your Firestore database.
  ];
