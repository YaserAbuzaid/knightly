"use client";
import { useWebSocket } from "@/hooks/useWebsocket";
import { ClickToMove } from "./chessGame";
import { useEffect, useState } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "./chessSidebar/sideBar";
import { ChessSidebar } from "./chessSidebar/chessSideBar";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { Flag, Loader2, RotateCcw } from "lucide-react";
import { GameClock } from "./GameClock";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

type Props = {
  gameId: string;
};

export const ChessGame = ({ gameId }: Props) => {
  const { gameState, sendMove, resignGame, isReconnecting } = useWebSocket(gameId);
  const [userId, setUserId] = useState("");

  // Fetch user ID
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const user = await authClient.getSession();
        if (typeof user === "string" || user instanceof String) {
          toast.error(String(user));
          return;
        }
        setUserId(user.data.user.id);
      } catch (error) {
        console.error("Error fetching user ID:", error);
      }
    };

    fetchUserId();
  }, []);

  // Determine game status message
  const getGameStatusMessage = () => {
    if (isReconnecting) return "Reconnecting to game...";
    if (!gameState) return "Connecting to game...";

    switch (gameState.status) {
      case "ongoing":
        return "Game in progress";
      case "checkmate":
        return `Checkmate! ${gameState.winner === "w" ? "White" : "Black"} wins`;
      case "stalemate":
        return "Game drawn by stalemate";
      case "draw":
        return "Game drawn";
      case "resignation":
        return `${gameState.winner === "w" ? "White" : "Black"} wins by resignation`;
      case "timeout":
        return `${gameState.winner === "w" ? "White" : "Black"} wins on time`;
      default:
        return "Game in progress";
    }
  };

  return (
    <div className="w-full flex flex-col lg:flex-row justify-center h-full items-center">
      <div className="md:w-[50%] w-full h-full flex items-center">
        <ClickToMove sendMove={sendMove} gameState={gameState} />
      </div>

      <SidebarProvider>
        <ChessSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <div className="text-muted-foreground">Game Controls</div>
            </div>
          </header>

          <div className="p-4 flex flex-col gap-4">
            {/* Game status */}
            <div className="p-3 bg-zinc-800 rounded-md">
              <h3 className="text-sm font-medium mb-1">Status</h3>
              <div className="flex items-center">
                {isReconnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin text-yellow-500" />
                ) : !gameState ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-500" />
                ) : gameState.status !== "ongoing" ? (
                  <Flag className="h-4 w-4 mr-2 text-red-500" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2 animate-spin text-green-500" />
                )}
                <span className="text-sm">{getGameStatusMessage()}</span>
              </div>
            </div>

            {/* Game clock */}
            {gameState && gameState.clock && (
              <div className="p-3 bg-zinc-800 rounded-md">
                <h3 className="text-sm font-medium mb-2">Game Clock</h3>
                <GameClock gameState={gameState} userId={userId} />
              </div>
            )}

            {/* Game controls */}
            <div className="p-3 bg-zinc-800 rounded-md">
              <h3 className="text-sm font-medium mb-2">Game Controls</h3>
              <div className="flex flex-col gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={resignGame}
                  disabled={!gameState || gameState.status !== "ongoing" || isReconnecting}
                  className="w-full"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Resign Game
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = "/home"}
                  disabled={gameState && gameState.status === "ongoing"}
                  className="w-full"
                >
                  Return to Home
                </Button>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
};
