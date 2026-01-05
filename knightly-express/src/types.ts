import { Socket } from "socket.io";
import { Chess } from "chess.ts";

export interface Player {
  id: string;
  elo: number;
  socket: Socket;
  requestedTimeControl: TimeControl;
  joinedAt: Date;
  // User profile data
  username?: string;
  image?: string | null;
  chessPlatform?: string;
  country?: string;
  flagCode?: string;
  flagUrl?: string | null;
}

export interface TimeControl {
  baseTime: number; // in seconds
  increment: number; // in seconds
}

export interface GameClock {
  white: number; // remaining time in milliseconds
  black: number;
  lastMoveTime?: number; // timestamp of the last move
}

export interface Game {
  id: string;
  chess: Chess;
  players: {
    white?: string; // player id
    black?: string; // player id
  };
  timeControl: TimeControl;
  clock: GameClock;
  status: GameStatus;
  disconnectedPlayers: Map<string, number>; // player id -> disconnect timestamp
  disconnectTimeouts: Map<string, NodeJS.Timeout>; // player id -> timeout ID
}

export enum GameStatus {
  WAITING = "waiting",
  ACTIVE = "active",
  COMPLETED = "completed",
}

export enum GameEndReason {
  CHECKMATE = "checkmate",
  STALEMATE = "stalemate",
  DRAW = "draw",
  RESIGNATION = "resignation",
  TIMEOUT = "timeout",
  DISCONNECT = "disconnect",
}

export interface MatchmakingStats {
  waitTime: number; // in milliseconds
  eloDelta: number;
  timeControl: TimeControl;
}
