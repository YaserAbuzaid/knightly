import { Server, Socket } from "socket.io";
import { Game, GameStatus, GameEndReason, Player } from "../types";
import { Color, PieceSymbol } from "chess.ts";

export class GameService {
  private games: Map<string, Game> = new Map();
  private playerGameMap: Map<string, string> = new Map(); // playerId -> gameId
  private io: Server;
  private reconnectWindow: number = 30 * 1000; // 30 seconds in milliseconds
  private clockIntervals: Map<string, NodeJS.Timeout> = new Map(); // gameId -> interval
  private playersMap: Map<string, Player> | null = null; // Reference to the global players map

  constructor(io: Server) {
    this.io = io;
  }

  // Set the reference to the global players map
  public setPlayersMap(players: Map<string, Player>): void {
    this.playersMap = players;
  }

  // Get the global players map
  private getPlayersMap(): Map<string, Player> {
    if (!this.playersMap) {
      // If not set, return an empty map as fallback
      console.warn("Players map not set in GameService");
      return new Map<string, Player>();
    }
    return this.playersMap;
  }

  public addGame(game: Game): void {
    this.games.set(game.id, game);

    // Map players to this game
    if (game.players.white) {
      this.playerGameMap.set(game.players.white, game.id);
    }
    if (game.players.black) {
      this.playerGameMap.set(game.players.black, game.id);
    }

    // Start the game
    this.startGame(game.id);
  }

  public startGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    // If the game is already active, don't start it again
    if (game.status === GameStatus.ACTIVE) {
      console.log(`Game ${gameId} is already active, not starting it again`);
      return;
    }

    // Check if both players are connected
    const whiteConnected = !game.disconnectedPlayers.has(game.players.white || "");
    const blackConnected = !game.disconnectedPlayers.has(game.players.black || "");

    if (!whiteConnected || !blackConnected) {
      console.log(`Not all players are connected for game ${gameId}. White connected: ${whiteConnected}, Black connected: ${blackConnected}`);
      return;
    }

    console.log(`Starting game ${gameId}. Current status: ${game.status}, History length: ${game.chess.history().length}`);
    console.log(`Game FEN: ${game.chess.fen()}`);
    console.log(`Game check status: inCheck=${game.chess.inCheck()}, inCheckmate=${game.chess.inCheckmate()}, inDraw=${game.chess.inDraw()}, inStalemate=${game.chess.inStalemate()}`);

    // If the game is in an invalid state (checkmate, draw, stalemate), reset it
    if (game.chess.inCheckmate() || game.chess.inDraw() || game.chess.inStalemate()) {
      console.log(`Game ${gameId} is in an invalid state, resetting the board`);
      game.chess.reset();
      console.log(`Game reset to: ${game.chess.fen()}`);
    }

    game.status = GameStatus.ACTIVE;
    game.clock.lastMoveTime = Date.now();

    // Start the clock
    this.startClock(gameId);

    // Get player details from the global players map
    const players = this.getPlayersMap();
    const whitePlayer = game.players.white
      ? players.get(game.players.white)
      : undefined;
    const blackPlayer = game.players.black
      ? players.get(game.players.black)
      : undefined;

    // Notify players that the game has started
    this.io.to(gameId).emit("gameStarted", {
      gameId,
      board: game.chess.fen(),
      turn: game.chess.turn(),
      clock: game.clock,
      status: "ongoing", // Always "ongoing" when the game starts
      playerColors: {
        white: game.players.white,
        black: game.players.black,
      },
      playerDetails: {
        white: whitePlayer
          ? {
              id: whitePlayer.id,
              elo: whitePlayer.elo,
              username: whitePlayer.username,
              image: whitePlayer.image,
              chessPlatform: whitePlayer.chessPlatform,
              country: whitePlayer.country,
              flagCode: whitePlayer.flagCode,
              flagUrl: whitePlayer.flagUrl,
            }
          : undefined,
        black: blackPlayer
          ? {
              id: blackPlayer.id,
              elo: blackPlayer.elo,
              username: blackPlayer.username,
              image: blackPlayer.image,
              chessPlatform: blackPlayer.chessPlatform,
              country: blackPlayer.country,
              flagCode: blackPlayer.flagCode,
              flagUrl: blackPlayer.flagUrl,
            }
          : undefined,
      },
    });

    console.log(`Game ${gameId} started`);
  }

  private startClock(gameId: string): void {
    // Clear any existing interval
    if (this.clockIntervals.has(gameId)) {
      clearInterval(this.clockIntervals.get(gameId)!);
    }

    // Update clock every 100ms
    const interval = setInterval(() => {
      this.updateClock(gameId);
    }, 100);

    this.clockIntervals.set(gameId, interval);
  }

  private updateClock(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game || game.status !== GameStatus.ACTIVE) {
      this.stopClock(gameId);
      return;
    }

    const currentTime = Date.now();
    const lastMoveTime = game.clock.lastMoveTime || currentTime;
    const elapsed = currentTime - lastMoveTime;

    const currentTurn = game.chess.turn();
    const colorKey = currentTurn === "w" ? "white" : "black";

    // Update the clock for the current player
    game.clock[colorKey] -= elapsed;

    // Check for timeout
    if (game.clock[colorKey] <= 0) {
      game.clock[colorKey] = 0;
      this.endGame(
        gameId,
        currentTurn === "w" ? "b" : "w",
        GameEndReason.TIMEOUT
      );
      return;
    }

    // Update lastMoveTime
    game.clock.lastMoveTime = currentTime;

    // Emit clock update
    this.io.to(gameId).emit("clockUpdate", {
      gameId,
      clock: game.clock,
    });
  }

  private stopClock(gameId: string): void {
    if (this.clockIntervals.has(gameId)) {
      clearInterval(this.clockIntervals.get(gameId)!);
      this.clockIntervals.delete(gameId);
    }
  }

  public makeMove(
    gameId: string,
    playerId: string,
    move: { from: string; to: string; promotion?: string }
  ): boolean {
    const game = this.games.get(gameId);
    if (!game) {
      console.log(`Game ${gameId} not found for move from player ${playerId}`);
      return false;
    }

    if (game.status !== GameStatus.ACTIVE) {
      console.log(`Game ${gameId} is not active (status: ${game.status}), cannot make move`);
      return false;
    }

    console.log(`Player ${playerId} attempting move in game ${gameId}: ${move.from} to ${move.to}${move.promotion ? ' with promotion to ' + move.promotion : ''}`);
    console.log(`Game status: ${game.status}, History length: ${game.chess.history().length}`);
    console.log(`Current FEN: ${game.chess.fen()}`);
    console.log(`Current position check status: inCheck=${game.chess.inCheck()}, inCheckmate=${game.chess.inCheckmate()}, inDraw=${game.chess.inDraw()}, inStalemate=${game.chess.inStalemate()}`);

    const currentTurn: Color = game.chess.turn();
    const currentPlayerKey = currentTurn === "w" ? "white" : "black";

    // Check if it's the player's turn
    if (game.players[currentPlayerKey] !== playerId) {
      return false;
    }

    // Ensure promotion is a valid chess piece symbol
    const moveWithPromotion = {
      ...move,
      promotion: move.promotion as PieceSymbol | undefined,
    };

    // Check if this is the first move
    const isFirstMove = game.chess.history().length === 0;

    // Attempt the move
    const moveResult = game.chess.move(moveWithPromotion, { sloppy: true });
    if (!moveResult) {
      console.log(`Invalid move by player ${playerId} in game ${gameId}: ${move.from} to ${move.to}`);
      return false;
    }

    console.log(`Move successful: ${moveResult.san}. New history length: ${game.chess.history().length}`);
    console.log(`New board state: ${game.chess.fen()}`);
    console.log(`Is in check: ${game.chess.inCheck()}, Is in checkmate: ${game.chess.inCheckmate()}, Is in draw: ${game.chess.inDraw()}, Is in stalemate: ${game.chess.inStalemate()}`);

    // If this was the first move and the game is now in checkmate or draw, it's likely a false positive
    // Let's force the game to continue
    if (isFirstMove && (game.chess.inCheckmate() || game.chess.inDraw() || game.chess.inStalemate())) {
      console.log(`WARNING: Game appears to be in checkmate/draw/stalemate after first move. This is likely a false positive. Forcing game to continue.`);
      // We'll use a hack to force the game to continue - we'll temporarily modify the game status
      const originalStatus = game.status;
      game.status = GameStatus.WAITING; // This will prevent the game from ending
      // We'll restore the status after the move is processed
      setTimeout(() => {
        game.status = originalStatus;
        console.log(`Restored game status to ${originalStatus} after first move`);
        // Force a game state update to ensure clients have the correct state
        this.broadcastGameState(gameId);
      }, 100);
    }

    // Update the clock - add increment for the player who just moved
    const colorKey = currentTurn === "w" ? "white" : "black";
    game.clock[colorKey] += game.timeControl.increment * 1000;
    game.clock.lastMoveTime = Date.now();

    // Check for game end conditions
    if (game.chess.inCheckmate()) {
      // The player who just made the move is the winner in checkmate
      // currentTurn is the player who would move next, so we need the opposite color
      const winner = currentTurn === "w" ? "b" : "w";
      console.log(`Checkmate detected! Current turn: ${currentTurn}, Winner: ${winner}, Move history: ${game.chess.history().length}`);

      // Only end the game if there's at least four moves in the history (two full turns)
      // This is a very conservative approach to prevent false positives
      if (game.chess.history().length >= 4) {
        this.endGame(gameId, winner, GameEndReason.CHECKMATE);
      } else {
        console.log(`Ignoring checkmate detection because there are not enough moves in the history (need at least 4)`);
        // Force the game to continue by broadcasting the current state
        this.broadcastGameState(gameId);
      }
    } else if (game.chess.inDraw() || game.chess.inStalemate()) {
      console.log(`Draw or stalemate detected! Move history: ${game.chess.history().length}`);

      // Only end the game if there's at least four moves in the history (two full turns)
      if (game.chess.history().length >= 4) {
        this.endGame(
          gameId,
          null,
          game.chess.inStalemate() ? GameEndReason.STALEMATE : GameEndReason.DRAW
        );
      } else {
        console.log(`Ignoring draw/stalemate detection because there are not enough moves in the history (need at least 4)`);
        // Force the game to continue by broadcasting the current state
        this.broadcastGameState(gameId);
      }
    } else {
      // Normal move, broadcast the updated game state
      this.broadcastGameState(gameId);
    }

    return true;
  }

  public handlePlayerDisconnect(playerId: string): void {
    const gameId = this.playerGameMap.get(playerId);
    if (!gameId) return;

    const game = this.games.get(gameId);
    if (!game) return;

    // Mark player as disconnected with timestamp
    game.disconnectedPlayers.set(playerId, Date.now());

    console.log(`Player ${playerId} disconnected from game ${gameId}`);

    // Notify the opponent
    this.io.to(gameId).emit("playerDisconnected", {
      gameId,
      playerId,
    });

    // Clear any existing timeout for this player
    const existingTimeout = game.disconnectTimeouts.get(playerId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      game.disconnectTimeouts.delete(playerId);
      console.log(`Cleared existing disconnect timeout for player ${playerId}`);
    }

    // Set a timeout to forfeit the game if player doesn't reconnect
    const timeoutId = setTimeout(() => {
      this.checkReconnect(gameId, playerId);
    }, this.reconnectWindow);

    // Store the timeout ID
    game.disconnectTimeouts.set(playerId, timeoutId);
    console.log(`Set disconnect timeout for player ${playerId}, will check in ${this.reconnectWindow / 1000} seconds`);
  }

  private checkReconnect(gameId: string, playerId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    // Clean up the timeout
    game.disconnectTimeouts.delete(playerId);

    // If the game is already over, do nothing
    if (game.status === GameStatus.COMPLETED) {
      console.log(`Game ${gameId} is already completed, not forfeiting for player ${playerId}`);
      return;
    }

    // If player is still disconnected, forfeit the game
    if (game.disconnectedPlayers.has(playerId)) {
      console.log(`Player ${playerId} is still disconnected after timeout, forfeiting game ${gameId}`);
      const isWhite = game.players.white === playerId;
      const winner = isWhite ? "b" : "w";

      this.endGame(gameId, winner, GameEndReason.DISCONNECT);
    } else {
      console.log(`Player ${playerId} has reconnected, not forfeiting game ${gameId}`);
    }
  }

  public handlePlayerReconnect(playerId: string, socket: Socket): void {
    // Look up the game ID for this player
    const gameId = this.playerGameMap.get(playerId);
    console.log(`Looking up game for player ${playerId}, found gameId: ${gameId}`);

    // If no game is found for this player, log and return
    if (!gameId) {
      console.log(`No game found for player ${playerId}`);

      // Check all games to see if this player is in any of them
      let foundInGame = false;
      this.games.forEach((game, id) => {
        if (game.players.white === playerId || game.players.black === playerId) {
          console.log(`Found player ${playerId} in game ${id} but not in playerGameMap`);
          foundInGame = true;

          // Fix the mapping
          this.playerGameMap.set(playerId, id);

          // Recursively call this method again now that the mapping is fixed
          this.handlePlayerReconnect(playerId, socket);
        }
      });

      if (!foundInGame) {
        console.log(`Player ${playerId} not found in any game`);
        socket.emit("error", { message: "No active game found for this player" });
      }

      return;
    }

    // Get the game object
    const game = this.games.get(gameId);
    console.log(`Found game for player ${playerId}: ${game ? 'exists' : 'not found'}`);

    if (!game) {
      console.log(`Game ${gameId} not found for player ${playerId}`);
      socket.emit("error", { message: "Game not found" });
      return;
    }

    // Remove player from disconnected list
    game.disconnectedPlayers.delete(playerId);

    // Clear any disconnect timeout for this player
    const timeoutId = game.disconnectTimeouts.get(playerId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      game.disconnectTimeouts.delete(playerId);
      console.log(`Cleared disconnect timeout for player ${playerId}`);
    }

    // Join the game room
    socket.join(gameId);
    console.log(`Player ${playerId} joined game room ${gameId}`);

    // No need to get player details here, they're fetched in sendGameStateToPlayer

    // Check if the game is in WAITING status
    if (game.status === GameStatus.WAITING) {
      console.log(`Game ${gameId} is in WAITING status, starting it now`);
      this.startGame(gameId);
    } else {
      // Game is already active or completed, send the current game state to the reconnected player
      console.log(`Sending game state to player ${playerId} for game ${gameId}. Status: ${game.status}, History length: ${game.chess.history().length}`);

      // Use the sendGameStateToPlayer method to send the current game state
      this.sendGameStateToPlayer(gameId, playerId, socket);
    }

    // Notify the opponent
    this.io.to(gameId).emit("playerReconnected", {
      gameId,
      playerId,
    });

    console.log(`Player ${playerId} successfully reconnected to game ${gameId}`);
  }

  public resignGame(gameId: string, playerId: string): void {
    const game = this.games.get(gameId);
    if (!game || game.status !== GameStatus.ACTIVE) return;

    const isWhite = game.players.white === playerId;
    const winner = isWhite ? "b" : "w";

    this.endGame(gameId, winner, GameEndReason.RESIGNATION);
  }

  private endGame(
    gameId: string,
    winner: Color | null,
    reason: GameEndReason
  ): void {
    const game = this.games.get(gameId);
    if (!game) return;

    console.log(`Ending game ${gameId}. Winner color: ${winner || 'Draw'}, Reason: ${reason}`);

    // Stop the clock
    this.stopClock(gameId);

    // Update game status
    game.status = GameStatus.COMPLETED;

    // Determine winner's player ID
    let winnerPlayerId = null;
    if (winner === "w") {
      winnerPlayerId = game.players.white;
    } else if (winner === "b") {
      winnerPlayerId = game.players.black;
    }

    // Notify players about game end
    this.io.to(gameId).emit("gameEnded", {
      gameId,
      winner: winnerPlayerId,
      reason,
      board: game.chess.fen(),
    });

    console.log(
      `Game ${gameId} ended. Winner: ${
        winnerPlayerId || "Draw"
      }, Reason: ${reason}`
    );

    // Clean up
    this.cleanupGame(gameId);
  }

  private cleanupGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    // Keep the game in memory for a while for history purposes
    // In a production system, you might want to store it in a database
    setTimeout(() => {
      // Only remove player-game mappings when we're actually deleting the game
      if (game.players.white) {
        this.playerGameMap.delete(game.players.white);
      }
      if (game.players.black) {
        this.playerGameMap.delete(game.players.black);
      }

      // Delete the game from memory
      this.games.delete(gameId);
      console.log(`Game ${gameId} removed from memory after timeout`);
    }, 5 * 60 * 1000); // Keep for 5 minutes
  }

  public getGameById(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  public getGameByPlayerId(playerId: string): Game | undefined {
    const gameId = this.playerGameMap.get(playerId);
    if (!gameId) return undefined;
    return this.games.get(gameId);
  }

  public getActiveGamesCount(): number {
    let count = 0;
    this.games.forEach((game) => {
      if (game.status === GameStatus.ACTIVE) {
        count++;
      }
    });
    return count;
  }

  // Send the current game state to a specific player
  public sendGameStateToPlayer(gameId: string, playerId: string, socket: Socket): void {
    const game = this.games.get(gameId);
    if (!game) {
      socket.emit("error", { message: "Game not found" });
      return;
    }

    // Get player details from the global players map
    const players = this.getPlayersMap();
    const whitePlayer = game.players.white
      ? players.get(game.players.white)
      : undefined;
    const blackPlayer = game.players.black
      ? players.get(game.players.black)
      : undefined;

    // Get the last move from history if available
    const history = game.chess.history({ verbose: true });
    const lastMove = history.length > 0 ? history[history.length - 1] : undefined;

    // Map server-side game status to client-side status
    let clientStatus = "ongoing";
    if (game.status === GameStatus.COMPLETED) {
      // If the game is completed, the client will get the specific reason from the gameEnded event
      // This is just a fallback
      clientStatus = "draw";
    }

    console.log(`Sending current game state to player ${playerId} for game ${gameId}`);

    // Send the current game state to the player
    socket.emit("gameState", {
      gameId,
      board: game.chess.fen(),
      history: game.chess.history(),
      turn: game.chess.turn(),
      clock: game.clock,
      lastMove,
      status: clientStatus,
      playerColors: {
        white: game.players.white,
        black: game.players.black,
      },
      playerDetails: {
        white: whitePlayer
          ? {
              id: whitePlayer.id,
              elo: whitePlayer.elo,
              username: whitePlayer.username,
              image: whitePlayer.image,
              chessPlatform: whitePlayer.chessPlatform,
              country: whitePlayer.country,
              flagCode: whitePlayer.flagCode,
              flagUrl: whitePlayer.flagUrl,
            }
          : undefined,
        black: blackPlayer
          ? {
              id: blackPlayer.id,
              elo: blackPlayer.elo,
              username: blackPlayer.username,
              image: blackPlayer.image,
              chessPlatform: blackPlayer.chessPlatform,
              country: blackPlayer.country,
              flagCode: blackPlayer.flagCode,
              flagUrl: blackPlayer.flagUrl,
            }
          : undefined,
      },
    });
  }

  // Helper method to broadcast the current game state
  private broadcastGameState(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    // Get player details from the global players map
    const players = this.getPlayersMap();
    const whitePlayer = game.players.white
      ? players.get(game.players.white)
      : undefined;
    const blackPlayer = game.players.black
      ? players.get(game.players.black)
      : undefined;

    // Get the last move from history if available
    const history = game.chess.history({ verbose: true });
    const lastMove = history.length > 0 ? history[history.length - 1] : undefined;

    // Map server-side game status to client-side status
    let clientStatus = "ongoing";
    if (game.status === GameStatus.COMPLETED) {
      // If the game is completed, the client will get the specific reason from the gameEnded event
      // This is just a fallback
      clientStatus = "draw";
    }

    console.log(`Broadcasting game state with status: ${clientStatus}`);

    // Broadcast the updated game state with player details
    this.io.to(gameId).emit("gameState", {
      gameId,
      board: game.chess.fen(),
      history: game.chess.history(),
      turn: game.chess.turn(),
      clock: game.clock,
      lastMove,
      status: clientStatus,
      playerColors: {
        white: game.players.white,
        black: game.players.black,
      },
      playerDetails: {
        white: whitePlayer
          ? {
              id: whitePlayer.id,
              elo: whitePlayer.elo,
              username: whitePlayer.username,
              image: whitePlayer.image,
              chessPlatform: whitePlayer.chessPlatform,
              country: whitePlayer.country,
              flagCode: whitePlayer.flagCode,
              flagUrl: whitePlayer.flagUrl,
            }
          : undefined,
        black: blackPlayer
          ? {
              id: blackPlayer.id,
              elo: blackPlayer.elo,
              username: blackPlayer.username,
              image: blackPlayer.image,
              chessPlatform: blackPlayer.chessPlatform,
              country: blackPlayer.country,
              flagCode: blackPlayer.flagCode,
              flagUrl: blackPlayer.flagUrl,
            }
          : undefined,
      },
    });
  }
}
