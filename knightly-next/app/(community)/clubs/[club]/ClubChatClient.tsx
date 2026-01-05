"use client";

import { ClubChat } from "@/components/chat";
import { ChatChannel } from "@/lib/chat-types";

interface ClubChatClientProps {
  clubId: string;
  clubName: string;
  channels: ChatChannel[];
  userElo?: number;
}

export function ClubChatClient({
  clubId,
  clubName,
  channels,
  userElo,
}: ClubChatClientProps) {
  return (
    <ClubChat
      clubId={clubId}
      clubName={clubName}
      channels={channels}
      userElo={userElo}
    />
  );
}
