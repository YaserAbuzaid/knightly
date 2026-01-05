import { Player, TimeControl, Game, GameStatus, MatchmakingStats, GameClock } from "../types";
import { Chess } from "chess.ts";
import { v4 as uuidv4 } from "uuid";
import { Server } from "socket.io";
import { GameService } from "./game";

export class MatchmakingService {
  private waitingPlayers: Player[] = [];
  private matchmakingStats: MatchmakingStats[] = [];
  private io: Server;
  private gameService: GameService | null = null;
  private maxEloDifference: number = 400;
  private fallbackMatchTime: number = 60 * 1000; // 60 seconds in milliseconds
  private matchmakingInterval: NodeJS.Timeout | null = null;

  constructor(io: Server) {
    this.io = io;
    this.startMatchmaking();
  }

  // Set the game service reference
  public setGameService(gameService: GameService): void {
    this.gameService = gameService;
  }

  public addPlayerToQueue(player: Player): void {
    // Check if player is already in queue
    const existingPlayerIndex = this.waitingPlayers.findIndex(p => p.id === player.id);
    if (existingPlayerIndex !== -1) {
      // Update the existing player
      this.waitingPlayers[existingPlayerIndex] = player;
      return;
    }

    this.waitingPlayers.push(player);
    console.log(`Player ${player.id} (ELO: ${player.elo}) added to matchmaking queue`);

    // Try to find a match immediately
    this.tryMatchPlayers();
  }

  public removePlayerFromQueue(playerId: string): void {
    this.waitingPlayers = this.waitingPlayers.filter(player => player.id !== playerId);
    console.log(`Player ${playerId} removed from matchmaking queue`);
  }

  private startMatchmaking(): void {
    // Run matchmaking every 5 seconds
    this.matchmakingInterval = setInterval(() => {
      this.tryMatchPlayers();
    }, 5000);
  }

  private tryMatchPlayers(): void {
    if (this.waitingPlayers.length < 2) {
      return;
    }

    // Sort players by join time (oldest first)
    this.waitingPlayers.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

    // Try to find a match with ELO difference <= maxEloDifference
    for (let i = 0; i < this.waitingPlayers.length; i++) {
      const player1 = this.waitingPlayers[i];
      const currentTime = new Date().getTime();
      const waitTime = currentTime - player1.joinedAt.getTime();

      // If player has been waiting for more than fallbackMatchTime, match with the next player
      const shouldFallback = waitTime >= this.fallbackMatchTime;

      for (let j = i + 1; j < this.waitingPlayers.length; j++) {
        const player2 = this.waitingPlayers[j];
        const eloDifference = Math.abs(player1.elo - player2.elo);

        // Match if ELO difference is acceptable or if fallback time has been reached
        if (eloDifference <= this.maxEloDifference || shouldFallback) {
          // Create a match
          this.createMatch(player1, player2);

          // Remove matched players from queue
          this.waitingPlayers = this.waitingPlayers.filter(
            p => p.id !== player1.id && p.id !== player2.id
          );

          // Record matchmaking stats
          this.recordMatchmakingStats(player1, player2);

          // Start over since we've modified the array
          return this.tryMatchPlayers();
        }
      }
    }
  }

  private createMatch(player1: Player, player2: Player): Game {
    // Use player1's time control (as per requirements)
    const timeControl = player1.requestedTimeControl;

    // Create a new game ID
    const gameId = uuidv4();

    // Initialize game clock
    const clock: GameClock = {
      white: timeControl.baseTime * 1000, // Convert to milliseconds
      black: timeControl.baseTime * 1000,
    };

    // Create a new game
    const chessInstance = new Chess();
    console.log(`Creating new chess game with initial FEN: ${chessInstance.fen()}`);
    console.log(`Initial position check status: inCheck=${chessInstance.inCheck()}, inCheckmate=${chessInstance.inCheckmate()}, inDraw=${chessInstance.inDraw()}, inStalemate=${chessInstance.inStalemate()}`);

    const game: Game = {
      id: gameId,
      chess: chessInstance,
      players: {
        white: player1.id,
        black: player2.id,
      },
      timeControl,
      clock,
      status: GameStatus.WAITING,
      disconnectedPlayers: new Map(),
      disconnectTimeouts: new Map(),
    };

    // Notify players about the match with detailed opponent info
    player1.socket.emit("matchFound", {
      gameId,
      color: "white",
      opponent: {
        id: player2.id,
        elo: player2.elo,
        username: player2.username,
        image: player2.image,
        chessPlatform: player2.chessPlatform,
        country: player2.country,
        flagCode: player2.flagCode,
        flagUrl: player2.flagUrl
      },
      timeControl,
    });

    player2.socket.emit("matchFound", {
      gameId,
      color: "black",
      opponent: {
        id: player1.id,
        elo: player1.elo,
        username: player1.username,
        image: player1.image,
        chessPlatform: player1.chessPlatform,
        country: player1.country,
        flagCode: player1.flagCode,
        flagUrl: player1.flagUrl
      },
      timeControl,
    });

    // Join both players to the game room
    player1.socket.join(gameId);
    player2.socket.join(gameId);

    console.log(`Match created: ${player1.id} (ELO: ${player1.elo}) vs ${player2.id} (ELO: ${player2.elo})`);

    // Register the game with the game service
    if (this.gameService) {
      console.log(`Registering game ${gameId} with game service`);
      this.gameService.addGame(game);
    } else {
      console.error(`Cannot register game ${gameId} - game service not set`);
    }

    return game;
  }

  private recordMatchmakingStats(player1: Player, player2: Player): void {
    const waitTime = new Date().getTime() - player1.joinedAt.getTime();
    const eloDelta = Math.abs(player1.elo - player2.elo);

    const stats: MatchmakingStats = {
      waitTime,
      eloDelta,
      timeControl: player1.requestedTimeControl,
    };

    this.matchmakingStats.push(stats);
    console.log(`Matchmaking stats: Wait time: ${waitTime}ms, ELO delta: ${eloDelta}`);
  }

  public getMatchmakingStats(): MatchmakingStats[] {
    return this.matchmakingStats;
  }

  public getAverageWaitTime(): number {
    if (this.matchmakingStats.length === 0) {
      return 0;
    }

    const totalWaitTime = this.matchmakingStats.reduce((sum, stat) => sum + stat.waitTime, 0);
    return totalWaitTime / this.matchmakingStats.length;
  }

  public getAverageEloDelta(): number {
    if (this.matchmakingStats.length === 0) {
      return 0;
    }

    const totalEloDelta = this.matchmakingStats.reduce((sum, stat) => sum + stat.eloDelta, 0);
    return totalEloDelta / this.matchmakingStats.length;
  }

  public getQueueLength(): number {
    return this.waitingPlayers.length;
  }

  public stopMatchmaking(): void {
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval);
      this.matchmakingInterval = null;
    }
  }
}
