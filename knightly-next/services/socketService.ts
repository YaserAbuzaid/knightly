"use client";

import { io, Socket } from "socket.io-client";
import { create } from "zustand";
import { GameState } from "@/lib/chess-types";
import { toast } from "sonner";

// Define the types for our socket events
export interface TimeControl {
  baseTime: number; // in seconds
  increment: number; // in seconds
}

export interface Player {
  id: string;
  elo: number;
  username?: string;
}

// Socket store to manage socket state
interface SocketStore {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

// Create a single socket instance for the entire app.
let socket: Socket | null = null;

export const useSocketStore = create<SocketStore>((set) => ({
  socket: null,
  isConnected: false,
  connect: () => {
    if (!socket) {
      // Use environment variable for the WebSocket server URL if available, otherwise use localhost
      const wsUrl = "https://knightly-express.onrender.com";
      // const wsUrl =
        // process.env.NEXT_PUBLIC_WS_SERVER_URL || "http://localhost:4000";

      socket = io(wsUrl, {
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 10000,
        autoConnect: true,
      });

      socket.on("connect", () => {
        console.log("Connected to chess websocket server");
        set({ isConnected: true });
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from chess websocket server");
        set({ isConnected: false });
      });

      socket.on("connect_error", (error) => {
        console.error("Connection error:", error);
        toast.error(
          "Failed to connect to the chess server. Please try again later."
        );
      });
    }

    set({ socket });
  },
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
      set({ socket: null, isConnected: false });
    }
  },
}));

// Initialize socket connection
export const initializeSocket = () => {
  const { connect } = useSocketStore.getState();
  connect();
  return socket;
};

// Get the socket instance
export const getSocket = () => {
  if (!socket) {
    initializeSocket();
  }
  return socket;
};
