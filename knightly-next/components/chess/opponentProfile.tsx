"use client";

import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { toast } from "sonner";
import { Dot, Loader2 } from "lucide-react";
import { getUser } from "@/actions/userActions";
import { User } from "@/lib/user-types";
import { getChessComUserStats } from "@/actions/getChessComUserData";
import { getLichessUserStats } from "@/actions/getLichessUserData";
import { PlayerDetails } from "@/lib/chess-types";

type Props = {
  userId?: string;
  playerDetails?: PlayerDetails;
};

function capitalizeFirstLetter(val: string) {
  return val ? String(val).charAt(0).toUpperCase() + String(val).slice(1) : '';
}

const OpponentProfile = ({ userId, playerDetails }: Props) => {
  const [user, setUser] = useState<User | null>(null);
  const [elo, setElo] = useState<string | number>("1000");
  const [isLoading, setIsLoading] = useState(false);

  // If we have playerDetails from the websocket, use that directly
  useEffect(() => {
    if (playerDetails) {
      setElo(playerDetails.elo.toString());
    }
  }, [playerDetails]);

  // Otherwise, fetch user data from the API if we only have userId
  useEffect(() => {
    if (!playerDetails && userId && userId.length > 0) {
      setIsLoading(true);

      const getUserData = async () => {
        try {
          const res = await getUser(userId);

          if (typeof res == "string" || res instanceof String) {
            toast.error(res);
            setIsLoading(false);
            return;
          }

          // Try to get flag code
          if (res.country && res.country.length > 0) {
            try {
              const response = await fetch(res.country);
              const flagData = await response.json();
              const flagCode = flagData.code;
              res.flagCode = flagCode;
            } catch (error) {
              console.error("Error fetching country flag:", error);
              // Continue without flag code - not critical
            }
          }

          // Try to get rating from chess platform
          try {
            if (res.chessPlatform === "lichess") {
              const response = await getLichessUserStats(res.chessUsername);

              if (typeof response == "string" || response instanceof String) {
                console.error("Lichess API error:", response);
                toast.error(`Lichess API: ${response}`);
                setElo(1500); // Default rating
              } else {
                // Check if there was an error but we got a fallback rating
                if (response.error) {
                  console.warn("Lichess API warning:", response.error);
                  toast.warning(`Lichess API: ${response.error}`);
                }
                setElo(response.perfs.rapid.rating);
              }
            } else if (res.chessPlatform === "chess.com") {
              const response = await getChessComUserStats(res.chessUsername);

              if (typeof response == "string" || response instanceof String) {
                console.error("Chess.com API error:", response);
                toast.error(`Chess.com API: ${response}`);
                setElo(1500); // Default rating
              } else {
                // Check if there was an error but we got a fallback rating
                if (response.error) {
                  console.warn("Chess.com API warning:", response.error);
                  toast.warning(`Chess.com API: ${response.error}`);
                }
                setElo(response.chess_rapid.last.rating);
              }
            } else {
              // No chess platform specified, use default rating
              setElo(1500);
            }
          } catch (error) {
            console.error("Error fetching chess platform stats:", error);
            toast.error("Could not fetch rating information. Using default rating.");
            setElo(1500); // Default rating if all else fails
          }

          setUser(res);
          setIsLoading(false);
        } catch (error) {
          console.error("Error fetching user data:", error);
          setIsLoading(false);
        }
      };

      getUserData();
    }
  }, [userId, playerDetails]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center p-2">
        <Loader2 className="animate-spin mr-2" size={16} />
        <span className="text-sm">Loading opponent...</span>
      </div>
    );
  }

  // Error state
  if (typeof user == "string" || user instanceof String) {
    toast.error(user);
    return <div className="w-full">Error loading opponent</div>;
  }

  // Determine which data source to use
  const displayData = playerDetails || user;
  const username = playerDetails?.username || (user?.chessUsername || user?.name);
  const image = playerDetails?.image || user?.image;
  const flagCode = playerDetails?.flagCode || user?.flagCode;
  const flagUrl = playerDetails?.flagUrl || (flagCode ? `https://flagcdn.com/48x36/${flagCode.toLowerCase()}.png` : null);
  const platform = playerDetails?.chessPlatform || user?.chessPlatform;

  return (
    <div className="w-full flex items-center justify-between">
      <div className="flex items-center gap-2 pl-2">
        <div>
          {image ? (
            <Avatar className="rounded-lg">
              <AvatarImage src={image} alt="Player Avatar" />
              <AvatarFallback>{username?.substring(0, 2) || "OP"}</AvatarFallback>
            </Avatar>
          ) : (
            <Dot size={40} className="text-green-600" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="font-medium">{username || "Opponent"}</span>
            {flagUrl && (
              <img
                width={20}
                height={15}
                src={flagUrl}
                alt={flagCode || "Flag"}
                className="ml-1 rounded-sm"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rating: {elo}</span>
            {platform && (
              <span className="text-xs px-2 py-0.5 bg-zinc-700 rounded-full text-zinc-300">
                {capitalizeFirstLetter(platform)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpponentProfile;
