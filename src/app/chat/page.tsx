import Link from "next/link"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Chat, User } from "@/types"

const me: User = { id: '0', name: 'Me', avatar: 'https://placehold.co/100x100' };

const chats: Omit<Chat, 'messages'>[] = [
  {
    id: '1',
    otherUser: { id: '1', name: 'SunnySide Cafe', avatar: 'https://placehold.co/100x100' },
  },
  {
    id: '2',
    otherUser: { id: '2', name: 'The Grand Hotel', avatar: 'https://placehold.co/100x100' },
  },
  {
    id: '3',
    otherUser: { id: '3', name: 'Tech Cowork Space', avatar: 'https://placehold.co/100x100' },
  },
  {
    id: '4',
    otherUser: { id: '4', name: 'Seaside Restaurant', avatar: 'https://placehold.co/100x100' },
  },
]

export default function ChatListPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Your Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4">
              {chats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/chat/${chat.id}`}
                  className="flex items-center space-x-4 p-2 rounded-lg transition-colors hover:bg-muted"
                >
                  <Avatar>
                    <AvatarImage src={chat.otherUser.avatar} alt={chat.otherUser.name} />
                    <AvatarFallback>{chat.otherUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{chat.otherUser.name}</p>
                    <p className="text-sm text-muted-foreground">Click to view messages</p>
                  </div>
                </Link>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
