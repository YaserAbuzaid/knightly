"use client";

import { authClient } from "@/lib/auth-client";
import { GameState } from "@/lib/chess-types";
import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { toast } from "sonner";
import { getSocket, initializeSocket } from "@/services/socketService";

export function useWebSocket(gameId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [userId, setUserId] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const playSound = (filename: string) => {
    try {
      const audio = new Audio(`/chess-sounds/standard/${filename}.mp3`);
      audio.play();
    } catch (err) {
      console.error("Could not play sounds");
    }
  };

  useEffect(() => {
    // Initialize or get the socket
    const socketInstance = getSocket() || initializeSocket();
    setSocket(socketInstance);

    const fetchUserId = async () => {
      try {
        const user = await authClient.getSession();

        if (typeof user === "string" || user instanceof String) {
          toast.error(String(user));
          return;
        }

        const id = user.data.user.id;
        setUserId(id);

        // Once we have the user ID, reconnect to the game if needed
        if (socketInstance && id && gameId) {
          console.log(`Reconnecting to game ${gameId} as user ${id}`);
          setIsReconnecting(true);
          socketInstance.emit("reconnect", { id: id });

          // We don't need to join the game room explicitly - the server will handle this
          // The joinGame event doesn't exist on the server
        }
      } catch (error) {
        console.error("Error fetching user session:", error);
        toast.error("Failed to authenticate. Please refresh the page.");
      }
    };

    const handleConnect = () => {
      console.log("Connected to chess server");

      // If we were previously connected and have user ID, try to reconnect
      if (userId && gameId) {
        console.log(
          `Attempting to reconnect to game ${gameId} as user ${userId}`
        );
        setIsReconnecting(true);
        socketInstance?.emit("reconnect", { id: userId });
      }
    };

    const handleReconnected = (data: { id: string }) => {
      console.log(
        `Reconnected event received: ${data.id} vs userId: ${userId}`
      );

      if (data.id === userId) {
        setIsReconnecting(false);
        toast.success("Reconnected to the game");
        playSound("move-self");
      }
    };

    const handleGameStarted = (data: {
      gameId: string;
      board: string;
      turn: "w" | "b";
      clock: { white: number; black: number; lastMoveTime?: number };
      playerColors: { white: string | undefined; black: string | undefined };
      playerDetails?: {
        white?: { id: string; username?: string; elo: number };
        black?: { id: string; username?: string; elo: number };
      };
      status?: string;
    }) => {
      console.log("Game started event received:", data);

      if (data.gameId === gameId) {
        playSound("game-start");
        toast.success("Game started!");
        setIsReconnecting(false);

        // Create a complete game state from the data
        const newGameState: GameState = {
          gameId: data.gameId,
          board: data.board,
          turn: data.turn,
          clock: data.clock,
          status: data.status as "timeout" | "ongoing" | "checkmate" | "stalemate" | "draw" | "resignation" || "ongoing", // Use provided status or default to "ongoing"
          winner: null,
          legalMoves: [],
          history: [],
          playerColors: data.playerColors || {
            white: undefined,
            black: undefined,
          },
          playerDetails: data.playerDetails,
        };

        console.log(`Game started with status: ${newGameState.status}`);

        console.log("Setting new game state:", newGameState);
        setGameState(newGameState);
      } else {
        console.log(
          `Game started but not for us. Our game id: ${gameId} vs ${data.gameId}`
        );
      }
    };

    const handleGameState = (state: any) => {
      console.log(
        `Received game state for game ${state.gameId}, our game: ${gameId}`
      );
      console.log("Game state:", state);

      if (state.gameId === gameId) {
        // If status is not provided, default to "ongoing"
        if (!state.status) {
          console.log("Status not provided in game state, defaulting to 'ongoing'");
          state.status = "ongoing";
        }

        // Log the status to help diagnose issues
        console.log(`Game status: ${state.status}`);

        // Ensure the state conforms to GameState type
        const validatedState: GameState = {
          ...state,
          status: state.status || "ongoing",
          winner: state.winner || null,
          legalMoves: state.legalMoves || [],
          history: state.history || [],
        };

        setGameState(validatedState);
        setIsReconnecting(false);

        // Play move sound when the game state updates (a move was made)
        if (state.lastMove) {
          playSound("move-opponent");
        }
      } else {
        console.warn(
          `Received game state for different game: ${state.gameId} vs ${gameId}`
        );
      }
    };

    const handleInvalidMove = (state: { error: string }) => {
      playSound("illegal");
      toast.error(state.error);

      // If we receive an invalid move response, we need to revert any optimistic updates
      // by forcing a refresh of the game state from the server
      if (socket && userId && gameId) {
        console.log("Requesting fresh game state after invalid move");
        // Request the current game state to ensure we're in sync with the server
        socket.emit("requestGameState", { id: userId, gameId });
      }
    };

    const handleGameClock = (data: {
      gameId: string;
      clock: { white: number; black: number; lastMoveTime?: number };
    }) => {
      if (data.gameId === gameId) {
        setGameState((prevState) =>
          prevState ? { ...prevState, clock: data.clock } : null
        );
      }
    };

    const handleGameEnded = (data: {
      gameId: string;
      winner: string | null;
      reason: string;
      board: string;
    }) => {
      if (data.gameId === gameId) {
        const winnerColor =
          data.winner === gameState?.playerColors.white
            ? "w"
            : data.winner === gameState?.playerColors.black
            ? "b"
            : null;

        setGameState((prevState) =>
          prevState
            ? {
                ...prevState,
                status:
                  data.reason === "checkmate"
                    ? "checkmate"
                    : data.reason === "stalemate"
                    ? "stalemate"
                    : data.reason === "resignation"
                    ? "resignation"
                    : "draw",
                winner: winnerColor,
                board: data.board,
              }
            : null
        );

        // Play sound based on game result
        if (data.winner) {
          // If current user is the winner
          if (data.winner === userId) {
            playSound("game-win");
          } else {
            playSound("game-lose");
          }
        } else {
          playSound("game-draw");
        }

        toast.info(`Game ended: ${data.reason}`);
      }
    };

    const handlePlayerDisconnected = (data: {
      gameId: string;
      playerId: string;
    }) => {
      if (data.gameId === gameId && data.playerId !== userId) {
        toast.warning(
          "Opponent disconnected. They have 30 seconds to reconnect."
        );
      }
    };

    const handlePlayerReconnected = (data: {
      gameId: string;
      playerId: string;
    }) => {
      if (data.gameId === gameId && data.playerId !== userId) {
        toast.success("Opponent reconnected");
        playSound("move-opponent");
      }
    };

    if (socketInstance) {
      // Connection events
      socketInstance.on("connect", handleConnect);
      socketInstance.on("reconnected", handleReconnected);

      // Game events
      socketInstance.on("gameStarted", handleGameStarted);
      socketInstance.on("gameState", handleGameState);
      socketInstance.on("invalidMove", handleInvalidMove);
      socketInstance.on("clockUpdate", handleGameClock);
      socketInstance.on("gameEnded", handleGameEnded);

      // Player events
      socketInstance.on("playerDisconnected", handlePlayerDisconnected);
      socketInstance.on("playerReconnected", handlePlayerReconnected);
    }

    // Fetch user info and join the game room
    fetchUserId();

    return () => {
      if (socketInstance) {
        // Connection events
        socketInstance.off("connect", handleConnect);
        socketInstance.off("reconnected", handleReconnected);

        // Game events
        socketInstance.off("gameStarted", handleGameStarted);
        socketInstance.off("gameState", handleGameState);
        socketInstance.off("invalidMove", handleInvalidMove);
        socketInstance.off("clockUpdate", handleGameClock);
        socketInstance.off("gameEnded", handleGameEnded);

        // Player events
        socketInstance.off("playerDisconnected", handlePlayerDisconnected);
        socketInstance.off("playerReconnected", handlePlayerReconnected);
      }
    };
  }, [gameId]);

  function sendMove(move: { from: string; to: string; promotion?: string }) {
    if (!gameState || !socket) {
      toast.error("Game not connected");
      return;
    }

    if (isReconnecting) {
      toast.error("Still reconnecting to the game");
      return;
    }

    if (gameState.status !== "ongoing") {
      toast.error("Game is already over");
      return;
    }

    const playerColorTurn = gameState.turn; // "w" or "b"
    // Determine the player's color.
    const playerColor =
      gameState.playerColors.white === userId
        ? "w"
        : gameState.playerColors.black === userId
        ? "b"
        : undefined;

    if (playerColorTurn !== playerColor) {
      playSound("illegal");
      toast.error("It's not your turn!");
      return;
    }

    // Send the move to the server
    socket.emit("makeMove", { id: userId, gameId, move });
  }

  function resignGame() {
    if (!socket || !gameState || !userId) {
      toast.error("Cannot resign - not connected to game");
      return;
    }

    if (gameState.status !== "ongoing") {
      toast.error("Game is already over");
      return;
    }

    // Confirm resignation
    if (confirm("Are you sure you want to resign this game?")) {
      socket.emit("resign", { id: userId, gameId });
      toast.info("You resigned the game");
    }
  }

  return {
    gameState,
    sendMove,
    resignGame,
    isReconnecting,
  };
}
