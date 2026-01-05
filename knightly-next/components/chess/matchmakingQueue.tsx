"use client";

import React, { useEffect, useState } from "react";
import { useMatchmakingStore } from "@/stores/matchmakingStore";
import { TimeControl } from "@/lib/chess-types";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, X, Check } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { getUser } from "@/actions/userActions";
import { toast } from "sonner";
import { initializeSocket } from "@/services/socketService";
import { getChessComUserStats } from "@/actions/getChessComUserData";
import { getLichessUserStats } from "@/actions/getLichessUserData";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";

const MatchmakingQueue: React.FC = () => {
  const {
    inQueue,
    queuePosition,
    matchFound,
    opponent,
    playerColor,
    timeControl,
    joinQueue,
    leaveQueue,
    respondToMatch,
    setupMatchmakingListeners,
    cleanupMatchmakingListeners,
  } = useMatchmakingStore();

  const [userId, setUserId] = useState<string | null>(null);
  const [elo, setElo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Format time control for display
  const formatTimeControl = (tc: TimeControl) => {
    return `${Math.floor(tc.baseTime / 60)}+${tc.increment}`;
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const session = await authClient.getSession();

        if (typeof session === "string" || session instanceof String) {
          toast.error(String(session));
          return;
        }

        const user = await getUser(session.data.user.id);

        if (typeof user === "string" || user instanceof String) {
          toast.error(String(user));
          return;
        }

        try {
          if (user.chessPlatform === "lichess") {
            const response = await getLichessUserStats(user.chessUsername);

            if (typeof response == "string" || response instanceof String) {
              toast.error(response);
              // Use a default ELO rather than returning
              setElo("1500");
            } else {
              // Check if there was an error but we got a fallback rating
              if (response.error) {
                toast.warning(`Lichess API: ${response.error}`);
              }
              setElo(response.perfs.rapid.rating.toString());
            }
          } else {
            const response = await getChessComUserStats(user.chessUsername);

            if (typeof response == "string" || response instanceof String) {
              toast.error(response);
              // Use a default ELO rather than returning
              setElo("1500");
            } else {
              // Check if there was an error but we got a fallback rating
              if (response.error) {
                toast.warning(`Chess.com API: ${response.error}`);
              }
              setElo(response.chess_rapid.last.rating.toString());
            }
          }
        } catch (error) {
          console.error("Error fetching chess platform stats:", error);
          toast.error("Could not fetch rating. Using default rating.");
          setElo("1500"); // Default rating if all else fails
        }

        const userId = session.data.user.id;
        setUserId(userId);

        // Initialize socket and setup listeners
        initializeSocket();
        setupMatchmakingListeners(userId);

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load user data");
        setIsLoading(false);
      }
    };

    fetchUserData();

    return () => {
      cleanupMatchmakingListeners();
    };
  }, [setupMatchmakingListeners, cleanupMatchmakingListeners]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex justify-center items-center p-8">
        <Loader2 className="animate-spin mr-2" size={24} />
        <span>Loading matchmaking...</span>
      </div>
    );
  }

  if (!userId) {
    return (
      <Card className="w-full p-6 rounded-lg shadow-md">
        <CardHeader>
          <h2 className="text-xl font-bold mb-4 text-white">Matchmaking</h2>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Please sign in to use matchmaking.
          </p>
          <Button
            variant="default"
            onClick={() => (window.location.href = "/sign-in")}
          >
            Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (matchFound && opponent) {
    return (
      <Card className="w-full p-6 rounded-lg shadow-md">
        <CardHeader>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Clock className="h-5 w-5 text-green-500 mr-2" />
            Match Found!
          </h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-2">
            <span className="text-muted-foreground mr-2">Opponent:</span>
            <span>{opponent.username || opponent.id}</span>
            {opponent.flagUrl && (
              <img
                src={opponent.flagUrl}
                alt={opponent.flagCode || "Flag"}
                width={20}
                height={15}
                className="ml-2 rounded-sm"
              />
            )}
            {opponent.chessPlatform && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-zinc-700 rounded-full text-zinc-300">
                {opponent.chessPlatform.charAt(0).toUpperCase() +
                  opponent.chessPlatform.slice(1)}
              </span>
            )}
          </div>
          <p className="mb-2">
            <span className="text-muted-foreground">Rating:</span>{" "}
            {opponent.elo}
          </p>
          <p className="mb-2">
            <span className="text-muted-foreground">Your Color:</span>{" "}
            {playerColor}
          </p>
          <p className="mb-2">
            <span className="text-muted-foreground">Time Control:</span>{" "}
            {formatTimeControl(timeControl)}
          </p>
        </CardContent>
        <CardFooter className="flex space-x-2">
          <Button
            onClick={() => respondToMatch(userId, true)}
            className="flex-1 text-white"
          >
            <Check className="mr-2 h-4 w-4" />
            Accept
          </Button>
          <Button
            onClick={() => respondToMatch(userId, false)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            variant="destructive"
          >
            <X className="mr-2 h-4 w-4" />
            Decline
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full p-6 rounded-lg shadow-md">
      <CardHeader>
        <h2 className="text-xl font-bold flex items-center">
          <Clock className="h-5 w-5 text-green-500 mr-2" />
          Matchmaking
        </h2>
      </CardHeader>

      <CardContent>
        {inQueue ? (
          <div>
            <div className="mb-4 flex items-center">
              <Loader2 className="animate-spin mr-2 text-green-500" size={20} />
              <p className="text-muted-foreground">
                Searching for opponent... Position: {queuePosition}
              </p>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Time Control: {formatTimeControl(timeControl)}
            </p>
            <Button
              onClick={leaveQueue}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              variant="destructive"
            >
              Cancel Search
            </Button>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">
              Current Time Control: {formatTimeControl(timeControl)}
            </p>
            <Button
              onClick={() => joinQueue(userId, elo.toString())}
              className="w-full"
            >
              Find Match
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchmakingQueue;
