import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
// import cors from "cors";
import { MatchmakingService } from "./services/matchmaking";
import { GameService } from "./services/game";
import { ChatService, ChatMessage } from "./services/chat";
import { Player, TimeControl } from "./types";
import { v4 as uuidv4 } from "uuid";

const app = express();
// app.use(cors());

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Store player data
const players: Map<string, Player> = new Map();

// Initialize services
const gameService = new GameService(io);
const matchmakingService = new MatchmakingService(io);
const chatService = new ChatService(io);

// Set up service dependencies
gameService.setPlayersMap(players);
matchmakingService.setGameService(gameService);

io.on("connection", (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle player registration
  socket.on(
    "registerPlayer",
    ({
      id,
      elo,
      timeControl,
      username,
      image,
      chessPlatform,
      country,
      flagCode,
      flagUrl,
    }: {
      id: string;
      elo: number;
      timeControl: TimeControl;
      username?: string;
      image?: string | null;
      chessPlatform?: string;
      country?: string;
      flagCode?: string;
      flagUrl?: string | null;
    }) => {
      const player: Player = {
        id,
        elo,
        socket,
        requestedTimeControl: timeControl,
        joinedAt: new Date(),
        username,
        image,
        chessPlatform,
        country,
        flagCode,
        flagUrl,
      };

      players.set(id, player);
      console.log(
        `Player registered: ${id} (ELO: ${elo}, Username: ${
          username || "unknown"
        }, Platform: ${chessPlatform || "unknown"})`
      );

      // Send acknowledgment
      socket.emit("playerRegistered", {
        id,
        elo,
        username,
        image,
        chessPlatform,
        country,
        flagCode,
        flagUrl,
      });
    }
  );

  // Handle joining matchmaking queue
  socket.on("joinQueue", ({ id }: { id: string }) => {
    const player = players.get(id);
    if (!player) {
      socket.emit("error", { message: "Player not registered" });
      console.log(`Player not registered: ${id}`);
      return;
    }

    // Add player to matchmaking queue
    matchmakingService.addPlayerToQueue(player);

    // Send acknowledgment
    socket.emit("joinedQueue", {
      position: matchmakingService.getQueueLength(),
    });
  });

  // Handle leaving matchmaking queue
  socket.on("leaveQueue", ({ id }: { id: string }) => {
    matchmakingService.removePlayerFromQueue(id);

    // Send acknowledgment
    socket.emit("leftQueue");
  });

  // Handle accepting/rejecting match
  socket.on(
    "respondToMatch",
    ({
      id,
      gameId,
      accept,
    }: {
      id: string;
      gameId: string;
      accept: boolean;
    }) => {
      const player = players.get(id);
      if (!player) {
        socket.emit("error", { message: "Player not registered" });
        return;
      }

      if (!accept) {
        // If player rejects, notify opponent and return both to queue
        io.to(gameId).emit("matchRejected", { gameId, rejectingPlayerId: id });
        return;
      }

      // If player accepts, join the game
      socket.join(gameId);
      socket.emit("matchAccepted", { gameId });

      // Check if the game exists in the game service
      const game = gameService.getGameById(gameId);
      if (!game) {
        console.error(
          `Game ${gameId} not found when player ${id} accepted match`
        );
        socket.emit("error", { message: "Game not found" });
        return;
      }

      // Log that the player accepted the match
      console.log(`Player ${id} accepted match for game ${gameId}`);
    }
  );

  // Handle making a move
  socket.on(
    "makeMove",
    ({
      id,
      gameId,
      move,
    }: {
      id: string;
      gameId: string;
      move: { from: string; to: string; promotion?: string };
    }) => {
      console.log(
        `Received move request from player ${id} for game ${gameId}: ${move.from} to ${move.to}`
      );

      // Get the game to log its state before the move
      const game = gameService.getGameById(gameId);
      if (game) {
        console.log(
          `Game state before move: FEN=${game.chess.fen()}, Status=${
            game.status
          }, History length=${game.chess.history().length}`
        );
        console.log(
          `Game check status before move: inCheck=${game.chess.inCheck()}, inCheckmate=${game.chess.inCheckmate()}, inDraw=${game.chess.inDraw()}, inStalemate=${game.chess.inStalemate()}`
        );
      }

      const result = gameService.makeMove(gameId, id, move);

      if (!result) {
        console.log(`Invalid move by player ${id}: ${move.from} to ${move.to}`);
        socket.emit("invalidMove", { error: "Invalid move" });
      } else {
        console.log(`Move successful: ${move.from} to ${move.to}`);

        // Log game state after the move
        if (game) {
          console.log(
            `Game state after move: FEN=${game.chess.fen()}, Status=${
              game.status
            }, History length=${game.chess.history().length}`
          );
          console.log(
            `Game check status after move: inCheck=${game.chess.inCheck()}, inCheckmate=${game.chess.inCheckmate()}, inDraw=${game.chess.inDraw()}, inStalemate=${game.chess.inStalemate()}`
          );
        }
      }
    }
  );

  // Handle resignation
  socket.on("resign", ({ id, gameId }: { id: string; gameId: string }) => {
    gameService.resignGame(gameId, id);
  });

  // Handle request for current game state (used after invalid moves)
  socket.on(
    "requestGameState",
    ({ id, gameId }: { id: string; gameId: string }) => {
      console.log(
        `Player ${id} requested current game state for game ${gameId}`
      );
      const game = gameService.getGameById(gameId);
      if (game) {
        // Send the current game state to the player
        gameService.sendGameStateToPlayer(gameId, id, socket);
      } else {
        socket.emit("error", { message: "Game not found" });
      }
    }
  );

  // Handle reconnection
  socket.on("reconnect", ({ id }: { id: string }) => {
    console.log(`Reconnection attempt from player ${id}`);

    // Check if player exists in the players map
    const player = players.get(id);
    if (player) {
      // Update socket reference
      player.socket = socket;
      console.log(`Updated socket for player ${id}`);

      // Handle game reconnection
      gameService.handlePlayerReconnect(id, socket);

      // Send reconnection confirmation to the client
      socket.emit("reconnected", { id });
      console.log(`Sent reconnected event to player ${id}`);
    } else {
      console.log(`Player not found in players map: ${id}`);

      // Re-register the player if they're not in the players map
      socket.emit("error", {
        message: "Player not registered. Please refresh the page.",
      });
    }
  });

  // ===== CHAT EVENT HANDLERS =====

  // Handle joining a chat channel
  socket.on(
    "chat:join",
    ({ channelId, userId }: { channelId: string; userId: string }) => {
      if (!channelId || !userId) {
        chatService.sendError(socket, "Channel ID and User ID are required");
        return;
      }
      chatService.joinChannel(socket, channelId, userId);
    }
  );

  // Handle leaving a chat channel
  socket.on(
    "chat:leave",
    ({ channelId, userId }: { channelId: string; userId: string }) => {
      if (!channelId || !userId) return;
      chatService.leaveChannel(socket, channelId, userId);
    }
  );

  // Handle sending a chat message
  socket.on(
    "chat:send",
    ({
      channelId,
      userId,
      content,
      user,
    }: {
      channelId: string;
      userId: string;
      content: string;
      user?: {
        id: string;
        name: string;
        image: string | null;
        chessUsername: string | null;
        chessPlatform: string | null;
        flagCode: string | null;
      };
    }) => {
      if (!channelId || !userId || !content?.trim()) {
        chatService.sendError(
          socket,
          "Channel ID, User ID, and content are required"
        );
        return;
      }

      // Create message object
      const message: ChatMessage = {
        id: uuidv4(),
        channelId,
        userId,
        content: content.trim(),
        isEdited: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: user || {
          id: userId,
          name: "Unknown",
          image: null,
          chessUsername: null,
          chessPlatform: null,
          flagCode: null,
        },
      };

      // Broadcast to all users in channel
      chatService.broadcastNewMessage(channelId, message);
    }
  );

  // Handle editing a chat message
  socket.on(
    "chat:edit",
    ({
      channelId,
      messageId,
      userId,
      content,
    }: {
      channelId: string;
      messageId: string;
      userId: string;
      content: string;
    }) => {
      if (!channelId || !messageId || !userId || !content?.trim()) {
        chatService.sendError(socket, "All fields are required");
        return;
      }

      // Note: Authorization check should be done on the frontend/API
      // The WebSocket just broadcasts the edit
      chatService.broadcastEditMessage(
        channelId,
        messageId,
        content.trim(),
        new Date(),
        userId
      );
    }
  );

  // Handle deleting a chat message
  socket.on(
    "chat:delete",
    ({
      channelId,
      messageId,
      userId,
    }: {
      channelId: string;
      messageId: string;
      userId: string;
    }) => {
      if (!channelId || !messageId || !userId) {
        chatService.sendError(socket, "All fields are required");
        return;
      }

      // Note: Authorization check should be done on the frontend/API
      chatService.broadcastDeleteMessage(channelId, messageId, userId);
    }
  );

  // Handle loading chat history (WebSocket just acknowledges, actual data comes from REST API)
  socket.on(
    "chat:history",
    ({
      channelId,
      limit,
      cursor,
    }: {
      channelId: string;
      limit?: number;
      cursor?: string;
    }) => {
      // The frontend should use REST API for history, this is just for acknowledgement
      socket.emit("chat:history", {
        messages: [],
        hasMore: false,
        message: "Please use REST API for message history",
      });
    }
  );

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    // Clean up chat connections
    chatService.handleDisconnect(socket);

    // Find player by socket
    let disconnectedPlayerId: string | null = null;
    players.forEach((player, id) => {
      if (player.socket.id === socket.id) {
        disconnectedPlayerId = id;
      }
    });

    if (disconnectedPlayerId) {
      // Remove from matchmaking queue if present
      matchmakingService.removePlayerFromQueue(disconnectedPlayerId);

      // Handle game disconnection
      gameService.handlePlayerDisconnect(disconnectedPlayerId);
    }
  });
});

// Health check endpoint
app.get("/health", (_req, res) => {
  const stats = {
    status: "healthy",
    activeGames: gameService.getActiveGamesCount(),
    queueLength: matchmakingService.getQueueLength(),
    averageWaitTime: matchmakingService.getAverageWaitTime(),
    averageEloDelta: matchmakingService.getAverageEloDelta(),
    chatConnectedUsers: chatService.getTotalConnectedUsers(),
  };

  res.json(stats);
});

app.get("/", (_req, res) => {
  res.send("Knightly WebSocket Server is running.");
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
