'use client'

import { useState } from 'react';
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
import { ArrowLeft, Send } from 'lucide-react'
import type { Chat, Message, User } from '@/types'
import { ChatBubble } from '@/components/chat/chat-bubble'
import Link from 'next/link';

const me: User = { id: '0', name: 'Me', avatar: 'https://placehold.co/100x100' };
const otherUser: User = { id: '1', name: 'SunnySide Cafe', avatar: 'https://placehold.co/100x100' };

const initialMessages: Message[] = [
  { id: '1', text: 'Hello! I would like to know if you have gluten-free options.', createdAt: '10:00 AM', sender: me },
  { id: '2', text: 'Hola! Sí, tenemos varias opciones sin gluten. ¿Qué te gustaría saber?', createdAt: '10:01 AM', sender: otherUser },
  { id: '3', text: 'Great! Do you have a gluten-free version of your pancakes?', createdAt: '10:02 AM', sender: me },
  { id: '4', text: 'Sí, claro. Nuestras tortitas de trigo sarraceno son sin gluten y muy populares.', createdAt: '10:03 AM', sender: otherUser },
];


export default function ChatPage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    const message: Message = {
      id: (messages.length + 1).toString(),
      text: newMessage,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: me,
    }
    setMessages([...messages, message]);
    setNewMessage('');
  };

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
          <AvatarImage src={otherUser.avatar} />
          <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
            <h2 className="text-lg font-bold font-headline">{otherUser.name}</h2>
            <p className="text-sm text-muted-foreground">Online</p>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[calc(100vh-16rem)] p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} isMe={message.sender.id === me.id} />
            ))}
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
