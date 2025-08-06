
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
}

export type Merchant = {
  id: string
  name: string
  category: string
  rating: number
  imageUrl: string
  aiHint?: string
  position: {
    lat: number
    lng: number
  }
  description: string
  items: MerchantItem[]
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
};


export type Message = {
  id: string
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

export type CartItem = {
    id: string;
    item: MerchantItem;
    merchantId: string;
    merchantName: string;
    status: 'pending' | 'approved' | 'denied' | 'redeemed' | 'canceled';
    requestedAt: string;
    confirmationCode?: string;
}
