
import type { Timestamp } from 'firebase/firestore';

export type NavItem = {
  title: string
  href: string
  disabled?: boolean
}

export type MainNavItem = NavItem

export type MerchantItem = {
  id: string
  name: string
  description?: string;
  price: number
  quantity: number
  category: string
  active?: boolean;
}

export type MerchantStatus = 'pending' | 'approved' | 'rejected' | 'blocked';

export type Merchant = {
  id: string
  owner: string;
  companyName: string;
  category: string
  rating: number
  logo: string
  banner: string
  aiHint?: string
  position: {
    lat: number
    lng: number
  }
  description: string
  listings: MerchantItem[]
  pendingOrders?: CartItem[];
  walletAddress?: string;
  seedPhrase?: string; // Should be encrypted
  street?: string;
  houseNumber?: string;
  city?: string;
  zipCode?: string;
  website?: string;
  instagram?: string;
  userEmail?: string;
  createdAt?: Timestamp;
  submittedAt?: Timestamp;
  status: MerchantStatus;
  [key: string]: any; // for other form fields
}

export type UserRole = 'admin' | 'merchant' | 'user';

export type User = {
  id: string;
  uid?: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  role: UserRole;
  bio?: string;
  country?: string;
  address?: {
    street?: string;
    houseNumber?: string;
    postcode?: string;
  };
  state?: string;
  province?: string;
  merchantId?: string;
  walletAddress?: string;
  walletBalance?: number;
  seedPhrase?: string; // Should be encrypted
  cart?: CartItem[];
  profileComplete?: boolean;
};


export type Message = {
  id?: string
  senderId: string;
  text: string;
  timestamp: Timestamp;
  translatedText?: string;
};

export type ChatParticipant = {
  id: string;
  name: string;
  avatar: string | null;
}

export type Chat = {
  id: string;
  participantIds: string[];
  participants: ChatParticipant[];
  lastMessage: {
    id: string; // Add message ID to lastMessage object
    text: string;
    timestamp: Timestamp;
  } | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};


export type OrderStatus = 'pending_approval' | 'approved' | 'rejected' | 'cancelled' | 'completed' | 'ready_to_redeem' | 'refunded';

export type CartItem = {
  orderId: string;
  title: string;
  itemId: string;
  listingId: string;
  price: number;
  quantity: number;
  merchantId: string;
  merchantName: string;
  redeemCode: string | null;
  status: OrderStatus;
  timestamp?: any;
  redeemedAt?: any;
  userId: string;
  userName: string;
  category: string;
}

// This type is no longer needed as we use a status on the Merchant type.
// export interface MerchantApplication {
//   id: string;
//   userId: string;
//   userEmail: string;
//   companyName: string;
//   description: string;
//   status: 'pending' | 'approved' | 'rejected';
//   submittedAt: Timestamp;
//   position: { lat: number; lng: number };
//   [key: string]: any; // for other form fields
// }
