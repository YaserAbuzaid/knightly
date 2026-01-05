"use client";

import React, { useEffect, useState } from "react";
import { GameState } from "@/lib/chess-types";
import { Clock } from "lucide-react";

interface GameClockProps {
  gameState: GameState | null;
  userId: string;
}

export function formatTime(milliseconds: number): string {
  if (milliseconds <= 0) return "0:00";
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function GameClock({ gameState, userId }: GameClockProps) {
  const [whiteTime, setWhiteTime] = useState<number>(0);
  const [blackTime, setBlackTime] = useState<number>(0);
  const [isWhiteTurn, setIsWhiteTurn] = useState<boolean>(true);
  
  // Determine player colors
  const isPlayerWhite = gameState?.playerColors.white === userId;
  const isPlayerBlack = gameState?.playerColors.black === userId;
  
  // Update clock display
  useEffect(() => {
    if (!gameState || !gameState.clock) return;
    
    setWhiteTime(gameState.clock.white);
    setBlackTime(gameState.clock.black);
    setIsWhiteTurn(gameState.turn === "w");
    
    // Only update the active player's clock in real-time
    const interval = setInterval(() => {
      if (gameState.status !== "ongoing") {
        clearInterval(interval);
        return;
      }
      
      const now = Date.now();
      const lastMoveTime = gameState.clock.lastMoveTime || now;
      const elapsed = now - lastMoveTime;
      
      if (gameState.turn === "w") {
        setWhiteTime((prev) => Math.max(0, gameState.clock?.white || 0) - (isWhiteTurn ? elapsed : 0));
      } else {
        setBlackTime((prev) => Math.max(0, gameState.clock?.black || 0) - (!isWhiteTurn ? elapsed : 0));
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [gameState, isWhiteTurn]);
  
  if (!gameState || !gameState.clock) {
    return null;
  }
  
  return (
    <div className="flex flex-col w-full gap-2">
      {/* Opponent's clock */}
      <div className={`flex items-center justify-between p-2 rounded-md ${
        !isWhiteTurn && isPlayerBlack || isWhiteTurn && isPlayerWhite ? "bg-zinc-800" : "bg-zinc-700"
      }`}>
        <div className="flex items-center">
          <Clock className={`h-4 w-4 mr-2 ${
            (isWhiteTurn && !isPlayerWhite) || (!isWhiteTurn && !isPlayerBlack) ? "text-green-500 animate-pulse" : "text-zinc-400"
          }`} />
          <span className="text-sm font-mono">
            {isPlayerWhite ? formatTime(blackTime) : formatTime(whiteTime)}
          </span>
        </div>
        {gameState.timeControl && (
          <span className="text-xs text-zinc-400">
            {Math.floor(gameState.timeControl.baseTime / 60)}+{gameState.timeControl.increment}
          </span>
        )}
      </div>
      
      {/* Player's clock */}
      <div className={`flex items-center justify-between p-2 rounded-md ${
        isWhiteTurn && isPlayerWhite || !isWhiteTurn && isPlayerBlack ? "bg-zinc-800" : "bg-zinc-700"
      }`}>
        <div className="flex items-center">
          <Clock className={`h-4 w-4 mr-2 ${
            (isWhiteTurn && isPlayerWhite) || (!isWhiteTurn && isPlayerBlack) ? "text-green-500 animate-pulse" : "text-zinc-400"
          }`} />
          <span className="text-sm font-mono">
            {isPlayerWhite ? formatTime(whiteTime) : formatTime(blackTime)}
          </span>
        </div>
        {gameState.timeControl && (
          <span className="text-xs text-zinc-400">
            {Math.floor(gameState.timeControl.baseTime / 60)}+{gameState.timeControl.increment}
          </span>
        )}
      </div>
    </div>
  );
}
