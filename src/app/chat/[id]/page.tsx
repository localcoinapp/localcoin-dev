
'use client'

import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, Send, Loader2, ShieldAlert } from 'lucide-react'
import { Message, Chat, ChatParticipant } from '@/types'
import { ChatBubble } from '@/components/chat/chat-bubble'
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { 
    doc, 
    collection, 
    onSnapshot, 
    addDoc, 
    serverTimestamp,
    orderBy,
    query,
    updateDoc
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function ChatPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const chatId = params.id;

  useEffect(() => {
    if (authLoading) return; // Wait for authentication to resolve

    if (!user) {
        setLoading(false);
        // Auth hook will redirect, but we can show a message as well
        return;
    }

    if (!chatId) {
        setLoading(false);
        setAccessDenied(true);
        return;
    }

    // Fetch chat details
    const chatDocRef = doc(db, 'chats', chatId);
    const unsubscribeChat = onSnapshot(chatDocRef, (doc) => {
      if (doc.exists()) {
        const chatData = { id: doc.id, ...doc.data() } as Chat;
        // Security Check: Is the current user part of this chat?
        if (!chatData.participantIds.includes(user.id)) {
            setAccessDenied(true);
            setLoading(false);
        } else {
            setChat(chatData);
            setAccessDenied(false);
        }
      } else {
        setAccessDenied(true);
        setLoading(false);
      }
    });

    // Fetch messages only if user has access
    if (!accessDenied) {
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        const unsubscribeMessages = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching messages:", error);
            setLoading(false);
        });
        
        return () => {
            unsubscribeChat();
            unsubscribeMessages();
        };
    }

    return () => {
      unsubscribeChat();
    };
  }, [chatId, user, authLoading]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user || !chatId || accessDenied) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const chatDocRef = doc(db, 'chats', chatId);
    const text = newMessage;
    setNewMessage('');

    try {
        const messagePayload: Omit<Message, 'id'> = {
            senderId: user.id,
            text,
            timestamp: serverTimestamp() as any, // Will be replaced by server
        };
        await addDoc(messagesRef, messagePayload);

        // Update last message on chat document
        await updateDoc(chatDocRef, {
            lastMessage: {
                text,
                timestamp: serverTimestamp(),
            },
            updatedAt: serverTimestamp()
        });

    } catch (error) {
        console.error("Error sending message:", error);
        // Handle error (e.g., show a toast)
    }
  };

  const otherUser = chat?.participants.find(p => p.id !== user?.id);

  if (loading || authLoading) {
    return <ChatPageSkeleton />;
  }

  if (!user) {
    return (
        <div className="flex justify-center items-center h-full p-4 text-center">
            <Card className="w-full max-w-md p-8">
                <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
                <h2 className="text-xl font-bold">Authentication Required</h2>
                <p className="text-muted-foreground mt-2">Please <Link href="/login" className="underline">sign in</Link> to view this chat.</p>
            </Card>
        </div>
    );
  }
  
  if (accessDenied || !chat || !otherUser) {
    return (
        <div className="flex justify-center items-center h-full p-4 text-center">
            <Card className="w-full max-w-md p-8">
                <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
                <h2 className="text-xl font-bold">Access Denied</h2>
                <p className="text-muted-foreground mt-2">You do not have permission to view this chat, or the chat does not exist.</p>
                <Button asChild className="mt-4"><Link href="/chat">Return to Chats</Link></Button>
            </Card>
        </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-full p-4">
    <Card className="w-full max-w-2xl h-full flex flex-col shadow-2xl">
      <CardHeader className="flex flex-row items-center space-x-4 p-4 border-b">
        <Link href="/chat">
            <Button variant="ghost" size="icon">
                <ArrowLeft className="h-6 w-6" />
            </Button>
        </Link>
        <Avatar>
          <AvatarImage src={otherUser.avatar || undefined} />
          <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
            <h2 className="text-lg font-bold font-headline">{otherUser.name}</h2>
            {/* Could add online status here in the future */}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[calc(100vh-16rem)] p-4" ref={scrollAreaRef as any}>
          <div className="space-y-4">
            {messages.map((message) => {
              const isMe = message.senderId === user?.id;
              return <ChatBubble key={message.id} message={message} isMe={isMe} />
            })}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input 
            placeholder="Type a message..." 
            className="flex-1"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
    </div>
  )
}


const ChatPageSkeleton = () => (
    <div className="flex justify-center items-center h-full p-4">
        <Card className="w-full max-w-2xl h-full flex flex-col shadow-2xl">
            <CardHeader className="flex flex-row items-center space-x-4 p-4 border-b">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-3 w-[100px]" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 space-y-4">
                <div className="flex justify-start gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-16 w-3/4 rounded-lg" /></div>
                <div className="flex justify-end gap-2"><Skeleton className="h-12 w-1/2 rounded-lg" /><Skeleton className="h-8 w-8 rounded-full" /></div>
                <div className="flex justify-start gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-8 w-3/5 rounded-lg" /></div>
            </CardContent>
            <CardFooter className="p-4 border-t">
                <div className="flex w-full items-center space-x-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-10" />
                </div>
            </CardFooter>
        </Card>
    </div>
);
