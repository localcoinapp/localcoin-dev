
export type NavItem = {
  title: string
  href: string
  disabled?: boolean
}

export type MainNavItem = NavItem

export type MerchantItem = {
  id: string
  name: string
  price: number
  quantity: number
  category: string
  active?: boolean;
}

export type Merchant = {
  id: string
  name?: string;
  companyName: string;
  category: string
  rating: number
  imageUrl: string
  aiHint?: string
  position: {
    lat: number
    lng: number
  }
  description: string
  listings: MerchantItem[]
  pendingOrders?: CartItem[];
  merchantWalletBalance?: number;
  street?: string;
  houseNumber?: string;
  city?: string;
  zipCode?: string;
  website?: string;
  instagram?: string;
  logo?: string;
  banner?: string;
}

export type UserRole = 'admin' | 'merchant' | 'user';

export type User = {
  id: string;
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
  walletBalance?: number;
  cart?: CartItem[];
};


export type Message = {
  id:string
  text: string
  createdAt: string
  sender: Pick<User, 'id' | 'name' | 'avatar'>
  translatedText?: string
}

export type Chat = {
  id: string
  otherUser: Pick<User, 'id' | 'name' | 'avatar'>
  messages: Message[]
}

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
}
