// Chat types for club chat feature

export interface ChatUser {
  id: string;
  name: string;
  image: string | null;
  chessUsername: string | null;
  chessPlatform: string | null;
  flagCode: string | null;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: ChatUser;
}

export interface ChatChannel {
  id: string;
  clubId: string;
  name: string;
  eloMin: number;
  eloMax: number;
  createdAt: Date;
}

// ELO range presets for channel creation
export const ELO_RANGES = [
  { name: "Beginner", min: 0, max: 800 },
  { name: "Intermediate", min: 800, max: 1400 },
  { name: "Advanced", min: 1400, max: 2000 },
  { name: "Master", min: 2000, max: 9999 },
] as const;

// Socket event types
export interface ChatSendPayload {
  channelId: string;
  content: string;
}

export interface ChatEditPayload {
  messageId: string;
  content: string;
}

export interface ChatDeletePayload {
  messageId: string;
}

export interface ChatJoinPayload {
  channelId: string;
}

export interface ChatNewMessageEvent {
  message: ChatMessage;
}

export interface ChatEditMessageEvent {
  messageId: string;
  content: string;
  updatedAt: Date;
}

export interface ChatDeleteMessageEvent {
  messageId: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string;
}
