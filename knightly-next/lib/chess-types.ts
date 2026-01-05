export interface TimeControl {
  baseTime: number; // in seconds
  increment: number; // in seconds
}

export interface PlayerDetails {
  id: string;
  elo: number;
  username?: string;
  image?: string | null;
  chessPlatform?: string;
  country?: string;
  flagCode?: string;
  flagUrl?: string | null;
}

export type GameState = {
  gameId?: string; // Game ID
  board: string; // FEN string
  turn: "w" | "b";
  legalMoves: { from: string; to: string; promotion?: string }[];
  status: "ongoing" | "checkmate" | "stalemate" | "draw" | "resignation" | "timeout";
  winner: "w" | "b" | null;
  playerColors: {
    white: string | undefined;
    black: string | undefined;
  };
  playerDetails?: {
    white?: PlayerDetails;
    black?: PlayerDetails;
  };
  history: any[]; // Move history
  timeControl?: TimeControl;
  clock?: {
    white: number; // remaining time in milliseconds
    black: number;
    lastMoveTime?: number;
  };
  lastMove?: {
    from: string;
    to: string;
    color: string;
    flags: string;
    piece: string;
    san: string;
  };
};
