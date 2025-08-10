
import type { Merchant } from "@/types";

// Note: This is mock data. The `id` will be replaced by Firestore's auto-generated ID.
// The `ownerId` should correspond to a `uid` in your `users` collection.
export const merchants: Omit<Merchant, 'id'>[] = [
    {
      companyName: "SunnySide Cafe",
      category: "Cafe",
      rating: 4.8,
      logo: "https://placehold.co/100x100.png",
      banner: "https://placehold.co/600x400.png",
      aiHint: "bright cafe",
      position: { lat: 52.516, lng: 13.454 },
      description: "Cozy spot for artisanal coffee and sunny side up eggs.",
      ownerId: "user-merchant-001",
      listings: [
        { id: "i1", name: "Espresso", price: 2.50, quantity: 100, category: 'Coffee', active: true },
        { id: "i2", name: "Croissant", price: 3.00, quantity: 50, category: 'Pastry', active: true },
        { id: "i3", name: "Sunny-Side Up Special", price: 12.00, quantity: 20, category: 'Food', active: true },
      ],
    },
    {
      companyName: "The Grand Hotel",
      category: "Hotel",
      rating: 4.5,
      logo: "https://placehold.co/100x100.png",
      banner: "https://placehold.co/600x400.png",
      aiHint: "luxury hotel lobby",
      position: { lat: 52.518, lng: 13.450 },
      description: "Luxury stays with a historical touch in the heart of the city.",
      ownerId: "user-merchant-002",
      listings: [
        { id: "i4", name: "Standard Room", price: 150.00, quantity: 10, category: 'Accommodation', active: true },
        { id: "i5", name: "Suite", price: 300.00, quantity: 5, category: 'Accommodation', active: true },
        { id: "i6", name: "Spa Access", price: 50.00, quantity: 30, category: 'Service', active: true },
      ],
    },
    {
      companyName: "Tech Cowork Space",
      category: "Coworking",
      rating: 4.9,
      logo: "https://placehold.co/100x100.png",
      banner: "https://placehold.co/600x400.png",
      aiHint: "modern coworking space",
      position: { lat: 52.513, lng: 13.458 },
      description: "A vibrant community for startups and freelancers.",
      ownerId: "user-merchant-003",
      listings: [
        { id: "i7", name: "Day Pass", price: 20.00, quantity: 100, category: 'Workspace', active: true },
        { id: "i8", name: "Dedicated Desk (Month)", price: 250.00, quantity: 10, category: 'Workspace', active: true },
      ],
    },
    {
      companyName: "Seaside Restaurant",
      category: "Restaurant",
      rating: 4.6,
      logo: "https://placehold.co/100x100.png",
      banner: "https://placehold.co/600x400.png",
      aiHint: "restaurant with ocean view",
      position: { lat: 52.510, lng: 13.452 },
      description: "Fresh seafood with a stunning view of the sunset.",
      ownerId: "user-merchant-004",
      listings: [
        { id: "i9", name: "Fish & Chips", price: 18.00, quantity: 40, category: 'Dining', active: true },
        { id: "i10", name: "3-Course Menu", price: 55.00, quantity: 20, category: 'Dining', active: true },
        { id: "i11", name: "Local Wine", price: 8.00, quantity: 60, category: 'Beverages', active: true },
      ],
    },
  ];
