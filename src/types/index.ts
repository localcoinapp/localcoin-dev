export type NavItem = {
  title: string
  href: string
  disabled?: boolean
}

export type MainNavItem = NavItem

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
