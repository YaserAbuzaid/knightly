"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatSocket } from "@/hooks/useChatSocket";
import { ChatChannel } from "@/lib/chat-types";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { EloChannelSelector } from "./EloChannelSelector";
import { Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

interface ClubChatProps {
  clubId: string;
  clubName: string;
  channels: ChatChannel[];
  userElo?: number;
}

export function ClubChat({
  clubId,
  clubName,
  channels,
  userElo,
}: ClubChatProps) {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    channels.length > 0 ? channels[0].id : null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const {
    messages,
    isLoading,
    hasMore,
    userId,
    sendMessage,
    editMessage,
    deleteMessage,
    loadMoreMessages,
  } = useChatSocket({ channelId: selectedChannelId });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll]);

  // useEffect(() => {
  //   if (channelRange) {
  //     setSelectedChannelId(channelRange);
  //   }
  // }, [channelRange]);

  // Check if user is near bottom to enable auto-scroll
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isNearBottom);

      // Load more when scrolling to top
      if (scrollTop === 0 && hasMore && !isLoading) {
        loadMoreMessages();
      }
    }
  };

  const selectedChannel = channels.find((ch) => ch.id === selectedChannelId);

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <MessageSquare className="h-12 w-12" />
        <p>No chat channels available for this club.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full border-t overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold">{clubName} Chat</h2>
            {selectedChannel && (
              <p className="text-xs text-muted-foreground">
                {selectedChannel.name} ({selectedChannel.eloMin}-
                {selectedChannel.eloMax === 9999 ? "∞" : selectedChannel.eloMax}{" "}
                ELO)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Channel Selector */}
      <EloChannelSelector
        channels={channels}
        selectedChannelId={selectedChannelId}
        onSelectChannel={setSelectedChannelId}
        userElo={userElo}
      />

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMoreMessages}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Load earlier messages
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2" />
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        )}

        {/* Messages */}
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isOwnMessage={message.userId === userId}
              onEdit={editMessage}
              onDelete={deleteMessage}
            />
          ))}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={!selectedChannelId}
        placeholder={
          selectedChannelId
            ? "Write a message..."
            : "Select a channel to start chatting"
        }
      />
    </motion.div>
  );
}
