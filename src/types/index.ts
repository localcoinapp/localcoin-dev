
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

export type User = {
  id: string
  name: string
  avatar: string
}

export type Message = {
  id: string
  text: string
  createdAt: string
  sender: User
  translatedText?: string
}

export type Chat = {
  id: string
  otherUser: User
  messages: Message[]
}
