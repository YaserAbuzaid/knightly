"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Socket } from "socket.io-client";
import { toast } from "sonner";
import { getSocket, initializeSocket } from "@/services/socketService";
import { authClient } from "@/lib/auth-client";
import { getUser } from "@/actions/userActions";
import {
  ChatMessage,
  ChatNewMessageEvent,
  ChatEditMessageEvent,
  ChatDeleteMessageEvent,
  ChatUser,
} from "@/lib/chat-types";
import { v4 as uuidv4 } from "uuid";

interface UseChatSocketOptions {
  channelId: string | null;
}

export function useChatSocket({ channelId }: UseChatSocketOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<ChatUser | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const cursorRef = useRef<string | undefined>(undefined);
  // Track pending message IDs to prevent duplicates from WebSocket
  const pendingMessageIds = useRef<Set<string>>(new Set());

  // Initialize socket and fetch user
  useEffect(() => {
    const socketInstance = getSocket() || initializeSocket();
    setSocket(socketInstance);

    const fetchUser = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data?.user?.id) {
          setUserId(session.data.user.id);

          // Fetch full user data for chat
          const user = await getUser(session.data.user.id);
          if (user && typeof user !== "string") {
            setUserData({
              id: user.id,
              name: user.name,
              image: user.image,
              chessUsername: user.chessUsername,
              chessPlatform: user.chessPlatform,
              flagCode: user.flagCode || null,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user session:", error);
      }
    };

    fetchUser();
  }, []);

  // Fetch message history from REST API
  const fetchHistory = useCallback(
    async (cursor?: string) => {
      if (!channelId) return;

      setIsLoading(true);
      try {
        const params = new URLSearchParams({ limit: "50" });
        if (cursor) params.set("cursor", cursor);

        const response = await fetch(
          `/api/chat/messages/${channelId}?${params}`
        );
        if (!response.ok) throw new Error("Failed to fetch messages");

        const data = await response.json();

        if (cursor) {
          // Prepend older messages
          setMessages((prev) => [...data.messages, ...prev]);
        } else {
          // Replace messages for initial load
          setMessages(data.messages);
        }

        setHasMore(data.hasMore);
        cursorRef.current = data.nextCursor;
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load messages");
      } finally {
        setIsLoading(false);
      }
    },
    [channelId]
  );

  // Join/leave channel and set up event listeners
  useEffect(() => {
    if (!socket || !channelId || !userId) return;

    // Reset state when changing channels
    setMessages([]);
    setHasMore(true);
    cursorRef.current = undefined;
    pendingMessageIds.current.clear();

    // Join the channel
    socket.emit("chat:join", { channelId, userId });

    // Load initial history from REST API
    fetchHistory();

    // Event handlers for real-time updates (from OTHER users)
    const handleNewMessage = (data: ChatNewMessageEvent) => {
      // Skip if this is our own message (we already added it optimistically)
      if (data.message.userId === userId) return;

      // Skip if we already have this message
      setMessages((prev) => {
        if (prev.some((msg) => msg.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
    };

    const handleEditMessage = (
      data: ChatEditMessageEvent & { userId?: string }
    ) => {
      console.log("Received edit event:", data);
      console.log("Current userId:", userId);

      // Skip if this is our own edit (we already updated optimistically)
      if (data.userId === userId) {
        console.log("Skipping own edit event");
        return;
      }

      setMessages((prev) => {
        const foundIndex = prev.findIndex((m) => m.id === data.messageId);
        console.log(
          "Updating messages for edit. Found target?",
          foundIndex !== -1
        );

        if (foundIndex === -1) {
          console.log(
            "Target message NOT found. Available IDs:",
            prev.map((m) => m.id)
          );
          console.log("Target ID was:", data.messageId);
        }

        return prev.map((msg) =>
          msg.id === data.messageId
            ? {
                ...msg,
                content: data.content,
                isEdited: true,
                updatedAt: data.updatedAt,
              }
            : msg
        );
      });
    };

    const handleDeleteMessage = (
      data: ChatDeleteMessageEvent & { userId?: string }
    ) => {
      console.log("Received delete event:", data);
      console.log("Current userId:", userId);

      // Skip if this is our own delete (we already updated optimistically)
      if (data.userId === userId) {
        console.log("Skipping own delete event");
        return;
      }

      setMessages((prev) => {
        console.log(
          "Updating messages for delete. Found target?",
          prev.some((m) => m.id === data.messageId)
        );
        return prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, isDeleted: true } : msg
        );
      });
    };

    const handleError = (data: { message: string }) => {
      toast.error(data.message);
    };

    // Register listeners
    socket.on("chat:newMessage", handleNewMessage);
    socket.on("chat:editMessage", handleEditMessage);
    socket.on("chat:deleteMessage", handleDeleteMessage);
    socket.on("chat:error", handleError);

    // Cleanup
    return () => {
      socket.emit("chat:leave", { channelId, userId });
      socket.off("chat:newMessage", handleNewMessage);
      socket.off("chat:editMessage", handleEditMessage);
      socket.off("chat:deleteMessage", handleDeleteMessage);
      socket.off("chat:error", handleError);
    };
  }, [socket, channelId, userId, fetchHistory]);

  // Send a new message - OPTIMISTIC UPDATE
  const sendMessage = useCallback(
    async (content: string) => {
      if (!socket || !channelId || !userId || !userData || !content.trim())
        return;

      // Create optimistic message with temp ID
      const id = uuidv4();
      const optimisticMessage: ChatMessage = {
        id: id,
        channelId,
        userId,
        content: content.trim(),
        isEdited: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: userData,
      };

      // Add optimistically to UI immediately
      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        // Save to database
        const response = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, channelId, content: content.trim() }),
        });

        if (!response.ok) {
          // Rollback on error
          setMessages((prev) => prev.filter((msg) => msg.id !== id));
          toast.error("Failed to send message. Please try again.");
          return;
        }

        const { message } = await response.json();

        // Replace temp message with real one
        // setMessages((prev) =>
        //   prev.map((msg) => (msg.id === id ? message : msg))
        // );

        // Broadcast via WebSocket for real-time updates to other users
        socket.emit("chat:send", {
          channelId,
          content: message.content,
          userId,
          user: message.user,
          messageId: message.id,
        });
      } catch (error) {
        // Rollback on error
        setMessages((prev) => prev.filter((msg) => msg.id !== id));
        console.error("Error sending message:", error);
        toast.error("Failed to send message. Please try again.");
      }
    },
    [socket, channelId, userId, userData]
  );

  // Edit a message - OPTIMISTIC UPDATE
  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!socket || !userId || !channelId || !content.trim()) return;

      // Store original for rollback
      const originalMessage = messages.find((msg) => msg.id === messageId);
      if (!originalMessage) return;

      // Update optimistically
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: content.trim(), isEdited: true }
            : msg
        )
      );

      try {
        const response = await fetch("/api/chat/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, content: content.trim() }),
        });

        if (!response.ok) {
          // Rollback on error
          setMessages((prev) =>
            prev.map((msg) => (msg.id === messageId ? originalMessage : msg))
          );
          toast.error("Failed to edit message. Please try again.");
          return;
        }

        const { message } = await response.json();

        // Update with server response
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  content: message.content,
                  isEdited: true,
                  updatedAt: message.updatedAt,
                }
              : msg
          )
        );

        // Broadcast via WebSocket
        socket.emit("chat:edit", {
          channelId,
          messageId,
          content: message.content,
          userId,
        });
      } catch (error) {
        // Rollback on error
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? originalMessage : msg))
        );
        console.error("Error editing message:", error);
        toast.error("Failed to edit message. Please try again.");
      }
    },
    [socket, userId, channelId, messages]
  );

  // Delete a message - OPTIMISTIC UPDATE
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!socket || !userId || !channelId) return;

      // Store original for rollback
      const originalMessage = messages.find((msg) => msg.id === messageId);
      if (!originalMessage) return;

      // Update optimistically
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isDeleted: true } : msg
        )
      );

      try {
        const response = await fetch(
          `/api/chat/messages?messageId=${messageId}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          // Rollback on error
          setMessages((prev) =>
            prev.map((msg) => (msg.id === messageId ? originalMessage : msg))
          );
          toast.error("Failed to delete message. Please try again.");
          return;
        }

        // Broadcast via WebSocket
        socket.emit("chat:delete", { channelId, messageId, userId });
      } catch (error) {
        // Rollback on error
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? originalMessage : msg))
        );
        console.error("Error deleting message:", error);
        toast.error("Failed to delete message. Please try again.");
      }
    },
    [socket, userId, channelId, messages]
  );

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(() => {
    if (isLoading || !hasMore) return;
    fetchHistory(cursorRef.current);
  }, [isLoading, hasMore, fetchHistory]);

  return {
    messages,
    isLoading,
    hasMore,
    userId,
    sendMessage,
    editMessage,
    deleteMessage,
    loadMoreMessages,
  };
}
