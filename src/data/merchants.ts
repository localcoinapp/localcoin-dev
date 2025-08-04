import type { Merchant } from '@/types';

export const merchants: Merchant[] = [
    {
      id: '1',
      name: 'Kaffee Klatsch',
      category: 'Cafe',
      rating: 4.7,
      imageUrl: 'https://placehold.co/600x400',
      aiHint: 'berlin cafe',
      position: { lat: 52.516, lng: 13.452 },
      description: 'Artsy cafe with direct-trade coffee and vegan cakes.',
      items: [
        { id: 'i1', name: 'Espresso', price: 2.50, quantity: 100, category: 'Coffee' },
        { id: 'i2', name: 'Cappuccino', price: 3.50, quantity: 50, category: 'Coffee' },
        { id: 'i3', name: 'Vegan Carrot Cake', price: 4.00, quantity: 0, category: 'Pastry' },
      ]
    },
    {
      id: '2',
      name: 'Hotel an der Spree',
      category: 'Hotel',
      rating: 4.8,
      imageUrl: 'https://placehold.co/600x400',
      aiHint: 'modern hotel',
      position: { lat: 52.514, lng: 13.456 },
      description: 'Stylish hotel with a beautiful view of the Spree river.',
      items: [
        { id: 'i4', name: 'Standard Room', price: 120.00, quantity: 5, category: 'Accommodation' },
        { id: 'i5', name: 'Suite with River View', price: 250.00, quantity: 2, category: 'Accommodation' },
        { id: 'i6', name: 'Breakfast Buffet', price: 25.00, quantity: 30, category: 'Food' },
      ]
    },
    {
      id: '3',
      name: 'Friedrichshain Coworking',
      category: 'Coworking',
      rating: 4.9,
      imageUrl: 'https://placehold.co/600x400',
      aiHint: 'coworking space',
      position: { lat: 52.517, lng: 13.458 },
      description: 'Creative coworking space with 24/7 access.',
       items: [
        { id: 'i7', name: 'Day Pass', price: 20.00, quantity: 15, category: 'Workspace' },
        { id: 'i8', name: 'Monthly Membership', price: 200.00, quantity: 10, category: 'Workspace' },
        { id: 'i9', name: 'Private Office', price: 500.00, quantity: 0, category: 'Workspace' },
      ]
    },
    {
      id: '4',
      name: 'Restaurant Spindler',
      category: 'Restaurant',
      rating: 4.6,
      imageUrl: 'https://placehold.co/600x400',
      aiHint: 'fine dining',
      position: { lat: 52.513, lng: 13.451 },
      description: 'Modern European cuisine in a restored industrial building.',
       items: [
        { id: 'i10', name: '3-Course Menu', price: 55.00, quantity: 40, category: 'Dining' },
        { id: 'i11', name: 'Wine Pairing', price: 30.00, quantity: 40, category: 'Beverages' },
        { id: 'i12', name: 'Business Lunch', price: 25.00, quantity: 20, category: 'Dining' },
      ]
    },
  ];
