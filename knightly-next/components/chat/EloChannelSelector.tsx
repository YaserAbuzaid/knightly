"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChatChannel, ELO_RANGES } from "@/lib/chat-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

interface EloChannelSelectorProps {
  channels: ChatChannel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  userElo?: number;
}

export function EloChannelSelector({
  channels,
  selectedChannelId,
  onSelectChannel,
  userElo,
}: EloChannelSelectorProps) {
  // Find the recommended channel based on user's ELO
  const getRecommendedChannel = () => {
    if (!userElo) return null;
    return channels.find((ch) => userElo >= ch.eloMin && userElo < ch.eloMax);
  };

  const recommendedChannel = getRecommendedChannel();

  return (
    <div className="flex flex-col gap-2 p-4 border-b">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Users className="h-4 w-4" />
        <span>Chat Channels</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {channels.map((channel, index) => {
          const isSelected = channel.id === selectedChannelId;
          const isRecommended = channel.id === recommendedChannel?.id;
          const eloRange = ELO_RANGES.find(
            (range) =>
              range.min === channel.eloMin && range.max === channel.eloMax
          );

          return (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Button
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => onSelectChannel(channel.id)}
                className={cn(
                  "relative transition-all",
                  isRecommended && !isSelected && "ring-2 ring-primary/50",
                  isSelected && "shadow-lg"
                )}
              >
                <span>{channel.name}</span>
                {isRecommended && !isSelected && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
                )}
              </Button>
            </motion.div>
          );
        })}
      </div>

      {recommendedChannel && (
        <p className="text-xs text-muted-foreground mt-1">
          💡 Based on your rating ({userElo}), we recommend:{" "}
          <span className="font-medium text-primary">
            {recommendedChannel.name}
          </span>
        </p>
      )}
    </div>
  );
}
