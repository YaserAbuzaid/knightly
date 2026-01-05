"use client";

import { create } from "zustand";
import { getSocket } from "@/services/socketService";
import { TimeControl } from "@/services/socketService";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { getUser } from "@/actions/userActions";

interface MatchmakingState {
  inQueue: boolean;
  queuePosition: number | null;
  matchFound: boolean;
  gameId: string | null;
  opponent: {
    id: string;
    elo: number;
    username?: string;
    image?: string | null;
    chessPlatform?: string;
    country?: string;
    flagCode?: string;
    flagUrl?: string | null;
  } | null;
  playerColor: "white" | "black" | null;
  timeControl: TimeControl;

  // Actions
  setTimeControl: (timeControl: TimeControl) => void;
  joinQueue: (id:string, elo: string) => void;
  leaveQueue: () => void;
  respondToMatch: (id:string, accept: boolean) => void;
  resetMatchmaking: () => void;

  // Setup
  setupMatchmakingListeners: (userId: string) => void;
  cleanupMatchmakingListeners: () => void;
}

export const useMatchmakingStore = create<MatchmakingState>((set, get) => ({
  inQueue: false,
  queuePosition: null,
  matchFound: false,
  gameId: null,
  opponent: null,
  playerColor: null,
  timeControl: { baseTime: 300, increment: 2 }, // Default: 5+5

  setTimeControl: (timeControl: TimeControl) => {
    set({ timeControl });
  },

  joinQueue: async (id: string, elo: string) => {
    const socket = getSocket();
    const { timeControl } = get();

    const eloAsNumber = Number(elo);

    if (socket) {
      try {
        // Get user data to send with registration
        const userData = await getUser(id)

        if (typeof userData == "string" || userData instanceof String) {
          toast.error(userData);
          return;
        }

        // Get flag URL if country code is available
        let flagUrl = null;
        if (userData.flagCode) {
          flagUrl = `https://flagcdn.com/48x36/${userData.flagCode.toLowerCase()}.png`;
        } else if (userData.country) {
          try {
            const countryResponse = await fetch(userData.country);
            const countryData = await countryResponse.json();
            if (countryData.code) {
              flagUrl = `https://flagcdn.com/48x36/${countryData.code.toLowerCase()}.png`;
              userData.flagCode = countryData.code;
            }
          } catch (err) {
            console.error("Error fetching country data:", err);
          }
        }

        // Register player with full user data
        socket.emit("registerPlayer", {
          id,
          elo: eloAsNumber,
          timeControl,
          username: userData.name || userData.chessUsername,
          image: userData.image,
          chessPlatform: userData.chessPlatform,
          country: userData.country,
          flagCode: userData.flagCode,
          flagUrl: flagUrl
        });

        // Join the queue
        socket.emit("joinQueue", { id });

        toast.info("Joining matchmaking queue...");
      } catch (error) {
        console.error("Error fetching user data for matchmaking:", error);

        // Fallback to basic registration if user data fetch fails
        socket.emit("registerPlayer", { id, elo: eloAsNumber, timeControl });
        socket.emit("joinQueue", { id });

        toast.info("Joining matchmaking queue...");
      }
    } else {
      toast.error("Could not connect to matchmaking server");
    }
  },

  leaveQueue: () => {
    const socket = getSocket();

    if (socket) {
      socket.emit("leaveQueue");
      set({ inQueue: false, queuePosition: null });
      toast.info("Left matchmaking queue");
    }
  },

  respondToMatch: (id:string, accept: boolean) => {
    const socket = getSocket();
    const { gameId } = get();

    if (socket && gameId) {
      socket.emit("respondToMatch", { id, gameId, accept });

      if (!accept) {
        set({
          matchFound: false,
          gameId: null,
          opponent: null,
          playerColor: null,
        });
        toast.info("Match declined");
      }
    }
  },

  resetMatchmaking: () => {
    set({
      inQueue: false,
      queuePosition: null,
      matchFound: false,
      gameId: null,
      opponent: null,
      playerColor: null,
    });
  },

  setupMatchmakingListeners: (userId: string) => {
    const socket = getSocket();

    if (socket) {
      // Queue status updates
      socket.on("queueUpdate", (data: { position: number }) => {
        set({ inQueue: true, queuePosition: data.position });
      });

      // Match found
      socket.on(
        "matchFound",
        (data: {
          gameId: string;
          color: "white" | "black";
          opponent: {
            id: string;
            elo: number;
            username?: string;
            image?: string | null;
            chessPlatform?: string;
            country?: string;
            flagCode?: string;
            flagUrl?: string | null;
          };
          timeControl: TimeControl;
        }) => {
          set({
            matchFound: true,
            gameId: data.gameId,
            opponent: data.opponent,
            playerColor: data.color,
            timeControl: data.timeControl,
          });

          // Play sound and show notification
          // try {
          //   const audio = new Audio("/chess-sounds/standard/game-start.mp3");
          //   audio.play();
          // } catch (err) {
          //   console.error("Could not play sound");
          // }

          toast.success("Match found!", {
            description: `Opponent: ${
              data.opponent.username || data.opponent.id
            } (${data.opponent.elo})`,
          });
        }
      );

      // Match accepted
      socket.on("matchAccepted", (data: { gameId: string }) => {
        // Redirect to game page
        window.location.href = `/play/live/${data.gameId}`;
      });

      // Match rejected
      socket.on("matchRejected", () => {
        set({
          matchFound: false,
          gameId: null,
          opponent: null,
          playerColor: null,
        });
        toast.error("Opponent declined the match");
      });

      // Match canceled (e.g., opponent disconnected)
      socket.on("matchCanceled", (data: { reason: string }) => {
        set({
          matchFound: false,
          gameId: null,
          opponent: null,
          playerColor: null,
        });
        toast.error(`Match canceled: ${data.reason}`);
      });
    }
  },

  cleanupMatchmakingListeners: () => {
    const socket = getSocket();

    if (socket) {
      socket.off("queueUpdate");
      socket.off("matchFound");
      socket.off("matchAccepted");
      socket.off("matchRejected");
      socket.off("matchCanceled");
    }
  },
}));
