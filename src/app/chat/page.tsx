
'use client'

import { useEffect, useState } from "react";
import Link from "next/link"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import type { Chat } from "@/types";
import { formatDistanceToNow } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function ChatListPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexError, setIndexError] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const chatsRef = collection(db, "chats");
    // This query requires a composite index on (participantIds, updatedAt DESC)
    const q = query(
        chatsRef, 
        where("participantIds", "array-contains", user.id),
        orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userChats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Chat[];
      
      setIndexError(false); // Reset error on successful snapshot
      setChats(userChats);
      setLoading(false);
    }, (error) => {
        if (error.code === 'failed-precondition') {
            console.error("Firestore Index Error:", error.message);
            setIndexError(true);
        } else {
            console.error("Error fetching chats: ", error);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
      return (
         <div className="flex h-full flex-col items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline">Your Conversations</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                </CardContent>
            </Card>
         </div>
      )
  }
  
  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Your Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {indexError && (
              <Alert variant="destructive" className="mb-4">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Database Configuration Required</AlertTitle>
                  <AlertDescription>
                    A Firestore index is needed for this query. Check your browser's developer console for a link to create it automatically in the Firebase Console.
                  </AlertDescription>
              </Alert>
          )}
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4">
              {chats.length > 0 ? chats.map((chat) => {
                // Find the other participant, which could be a user or a merchant representation
                const otherUser = chat.participants.find(p => p.id !== user?.id);
                if (!otherUser) return null;

                const lastMessageText = chat.lastMessage?.text || "No messages yet.";
                const lastMessageTimestamp = chat.lastMessage?.timestamp 
                    ? formatDistanceToNow(chat.lastMessage.timestamp.toDate(), { addSuffix: true })
                    : '';

                return (
                    <Link
                    key={chat.id}
                    href={`/chat/${chat.id}`}
                    className="flex items-center space-x-4 p-2 rounded-lg transition-colors hover:bg-muted"
                    >
                    <Avatar>
                        <AvatarImage src={otherUser.avatar || undefined} alt={otherUser.name} />
                        <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold truncate">{otherUser.name}</p>
                            <p className="text-xs text-muted-foreground flex-shrink-0">{lastMessageTimestamp}</p>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{lastMessageText}</p>
                    </div>
                    </Link>
                )
              }) : (
                 <p className="text-center text-muted-foreground py-8">You have no conversations.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
