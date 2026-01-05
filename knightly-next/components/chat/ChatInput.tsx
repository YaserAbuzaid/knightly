"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Write a message...",
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        150
      )}px`;
    }
  }, [content]);

  const handleSend = () => {
    if (content.trim() && !disabled) {
      onSend(content.trim());
      setContent("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="flex items-end gap-2 p-4">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10 rounded-full"
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>

        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "min-h-[44px] max-h-[150px] resize-none pr-12 rounded-2xl",
              "bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
            )}
            rows={1}
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          size="icon"
          className={cn(
            "shrink-0 h-10 w-10 rounded-full transition-all",
            content.trim()
              ? "bg-primary hover:bg-primary/90"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Send
            className={cn(
              "h-5 w-5 transition-transform",
              content.trim() && "translate-x-0.5 -translate-y-0.5"
            )}
          />
        </Button>
      </div>
    </motion.div>
  );
}
