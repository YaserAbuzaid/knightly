import { Server, Socket } from "socket.io";

// Note: In knightly-ws, we don't have direct access to Prisma since it's a separate service.
// The frontend will use REST APIs for persistence, and WebSocket for real-time broadcasting.
// This service handles the real-time messaging portion only.

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

interface ConnectedUser {
  socket: Socket;
  userId: string;
  channels: Set<string>;
}

export class ChatService {
  private io: Server;
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private channelUsers: Map<string, Set<string>> = new Map(); // channelId -> userIds

  constructor(io: Server) {
    this.io = io;
  }

  // Join a chat channel
  joinChannel(socket: Socket, channelId: string, userId: string): void {
    // Add to socket room
    socket.join(`chat:${channelId}`);

    // Track connected user
    let user = this.connectedUsers.get(userId);
    if (!user) {
      user = { socket, userId, channels: new Set() };
      this.connectedUsers.set(userId, user);
    }
    user.socket = socket; // Update socket reference
    user.channels.add(channelId);

    // Track channel membership
    if (!this.channelUsers.has(channelId)) {
      this.channelUsers.set(channelId, new Set());
    }
    this.channelUsers.get(channelId)!.add(userId);

    console.log(`User ${userId} joined channel ${channelId}`);

    // Notify others in channel
    socket.to(`chat:${channelId}`).emit("chat:userJoined", {
      channelId,
      userId,
    });
  }

  // Leave a chat channel
  leaveChannel(socket: Socket, channelId: string, userId: string): void {
    socket.leave(`chat:${channelId}`);

    const user = this.connectedUsers.get(userId);
    if (user) {
      user.channels.delete(channelId);
      if (user.channels.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }

    const channelMembers = this.channelUsers.get(channelId);
    if (channelMembers) {
      channelMembers.delete(userId);
      if (channelMembers.size === 0) {
        this.channelUsers.delete(channelId);
      }
    }

    console.log(`User ${userId} left channel ${channelId}`);

    // Notify others in channel
    socket.to(`chat:${channelId}`).emit("chat:userLeft", {
      channelId,
      userId,
    });
  }

  // Broadcast a new message to all users in a channel
  broadcastNewMessage(channelId: string, message: ChatMessage): void {
    this.io.to(`chat:${channelId}`).emit("chat:newMessage", {
      message,
    });
    console.log(`Broadcasted message ${message.id} to channel ${channelId}`);
  }

  // Broadcast an edited message
  broadcastEditMessage(
    channelId: string,
    messageId: string,
    content: string,
    updatedAt: Date,
    userId: string
  ): void {
    this.io.to(`chat:${channelId}`).emit("chat:editMessage", {
      messageId,
      content,
      updatedAt,
      userId,
    });
    console.log(
      `Broadcasted edit for message ${messageId} to channel ${channelId} by user ${userId}`
    );
  }

  // Broadcast a deleted message
  broadcastDeleteMessage(
    channelId: string,
    messageId: string,
    userId: string
  ): void {
    this.io.to(`chat:${channelId}`).emit("chat:deleteMessage", {
      messageId,
      userId,
    });
    console.log(
      `Broadcasted delete for message ${messageId} to channel ${channelId} by user ${userId}`
    );
  }

  // Send error to a specific socket
  sendError(socket: Socket, message: string): void {
    socket.emit("chat:error", { message });
  }

  // Handle user disconnect - clean up all channel memberships
  handleDisconnect(socket: Socket): void {
    // Find user by socket
    for (const [userId, user] of this.connectedUsers.entries()) {
      if (user.socket.id === socket.id) {
        // Leave all channels
        for (const channelId of user.channels) {
          this.leaveChannel(socket, channelId, userId);
        }
        this.connectedUsers.delete(userId);
        console.log(`User ${userId} disconnected from chat`);
        break;
      }
    }
  }

  // Get number of users in a channel
  getChannelUserCount(channelId: string): number {
    return this.channelUsers.get(channelId)?.size || 0;
  }

  // Get total connected users
  getTotalConnectedUsers(): number {
    return this.connectedUsers.size;
  }
}
