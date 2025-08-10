
'use client'

import { useState } from "react"
import { translateChatMessage } from "@/ai/flows/translate-chat-message"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Message } from "@/types"
import { Languages, Trash2, Pencil, Check, X } from "lucide-react"
import { format } from 'date-fns';

interface ChatBubbleProps {
  message: Message;
  isMe: boolean;
  isLastMessage?: boolean;
  onEdit?: (messageId: string, newText: string) => void;
  onDelete?: (messageId: string) => void;
}

export function ChatBubble({ message, isMe, isLastMessage, onEdit, onDelete }: ChatBubbleProps) {
  const [translatedText, setTranslatedText] = useState<string | null>(message.translatedText || null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

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

  const handleSaveEdit = () => {
    if (editText.trim() && message.id) {
      onEdit?.(message.id, editText.trim());
      setIsEditing(false);
    }
  }

  const handleDelete = () => {
    if (message.id) {
        onDelete?.(message.id);
    }
  }

  const messageTimestamp = message.timestamp?.toDate ? format(message.timestamp.toDate(), 'p') : '';

  const canBeModified = isMe && isLastMessage && onEdit && onDelete;

  return (
    <div className={cn("group flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
      {canBeModified && !isEditing && (
         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
            </Button>
         </div>
      )}
      <div
        className={cn(
          "max-w-xs md:max-w-md lg:max-w-lg rounded-xl p-3 shadow-md",
          isMe
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground rounded-bl-none border"
        )}
      >
        {isEditing ? (
            <div className="space-y-2">
                <Input 
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="bg-white/80 text-black"
                    autoFocus
                />
                <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={handleSaveEdit}><Check className="h-4 w-4"/>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}><X className="h-4 w-4"/>Cancel</Button>
                </div>
            </div>
        ) : (
            <>
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
                  {messageTimestamp}
                </p>
            </>
        )}
      </div>
    </div>
  )
}
