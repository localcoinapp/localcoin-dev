'use client'

import { useState } from "react"
import { translateChatMessage } from "@/ai/flows/translate-chat-message"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Message } from "@/types"
import { Languages } from "lucide-react"

interface ChatBubbleProps {
  message: Message;
  isMe: boolean;
}

export function ChatBubble({ message, isMe }: ChatBubbleProps) {
  const [translatedText, setTranslatedText] = useState<string | null>(message.translatedText || null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    setIsTranslating(true);
    setError(null);
    try {
      const result = await translateChatMessage({ message: message.text, targetLanguage: 'English' });
      setTranslatedText(result.translatedMessage);
    } catch (err) {
      setError("Translation failed. Please try again.");
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  }

  return (
    <div className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
      {!isMe && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={message.sender.avatar || undefined} />
          <AvatarFallback>{message.sender.name?.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-xs md:max-w-md lg:max-w-lg rounded-xl p-3 shadow-md",
          isMe
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground rounded-bl-none border"
        )}
      >
        <p className="text-sm">{message.text}</p>
        {!isMe && (
          <div className="mt-2 pt-2 border-t border-white/20">
            {isTranslating ? (
              <Skeleton className="h-5 w-32" />
            ) : translatedText ? (
              <p className="text-sm text-muted-foreground italic">{translatedText}</p>
            ) : (
              <Button
                variant={isMe ? "secondary" : "ghost"}
                size="sm"
                className="h-auto p-1 text-xs"
                onClick={handleTranslate}
                disabled={isTranslating}
              >
                <Languages className="mr-2 h-3 w-3" />
                Translate
              </Button>
            )}
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          </div>
        )}
        <p className={cn(
          "text-xs mt-1",
          isMe ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-left"
        )}>
          {message.createdAt}
        </p>
      </div>
      {isMe && message.sender.avatar && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={message.sender.avatar || undefined} />
          <AvatarFallback>{message.sender.name?.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
