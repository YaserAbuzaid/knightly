"use client";

import { authClient } from "@/lib/auth-client";
import { useLoggingOutStore } from "@/lib/zustand";
import { Loader2 } from "lucide-react";
import { Chessboard } from "@/components/chess/chessBoard";
import { ChessSidebar } from "@/components/chess/chessSidebar/chessSideBar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/chess/chessSidebar/sideBar";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { getUser } from "@/actions/userActions";
import { toast } from "sonner";
import { User } from "@/lib/user-types";
import ChessPlayerProfile from "@/components/chess/chessPlayerProfile";
import OpponentProfile from "@/components/chess/opponentProfile";
import { getChessComUserStats } from "@/actions/getChessComUserData";
import { getLichessUserStats } from "@/actions/getLichessUserData";

export default function Page() {
  const isLoggingOut = useLoggingOutStore((state) => state.loggingOut);
  const [userData, setUserData] = useState<User>();
  const [elo, setElo] = useState("1000");

  useEffect(() => {
    const getUserData = async () => {
      const user = await authClient.getSession();
      const userData = await getUser(user.data.user.id);

      if (typeof userData == "string" || userData instanceof String) {
        toast.error(userData);
        return;
      }

      if (userData.chessPlatform === "lichess") {
        const response = await getLichessUserStats(userData.chessUsername);
        if (typeof response == "string" || response instanceof String) {
          toast.error(response);
          return;
        }
        setElo(response.perfs.rapid.rating);
      } else if (userData.chessPlatform === "chess.com") {
        const response = await getChessComUserStats(userData.chessUsername);
        if (typeof response == "string" || response instanceof String) {
          toast.error(response);
          return;
        }
        setElo(response.chess_rapid.last.rating);
      }

      setUserData(userData);

      return;
    };
    getUserData();
  }, []);

  if (!userData) {
    return (
      <div className="w-full flex flex-col lg:flex-row  justify-center h-full items-center">
        <div className="md:w-[50%] w-full h-full flex items-center flex-col gap-4">
          <div className="w-full flex">
            <OpponentProfile userId={""} />
          </div>
          <Chessboard
            id="ClickToMove"
            customDarkSquareStyle={{ backgroundColor: "#779952" }}
            customLightSquareStyle={{ backgroundColor: "#edeed1" }}
            isDraggablePiece={({ piece }) => false}
          />
          <div className="w-full flex">
            <ChessPlayerProfile user={null} Elo={null} loading={true} />
          </div>
        </div>
      </div>
    );
  }

  if (isLoggingOut) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col lg:flex-row  justify-center h-full items-center">
      <div className="md:w-[50%] w-full h-full flex items-center flex-col gap-4">
        <div className="w-full flex">
          <OpponentProfile userId={""} />
        </div>
        <Chessboard
          id="ClickToMove"
          customDarkSquareStyle={{ backgroundColor: "#779952" }}
          customLightSquareStyle={{ backgroundColor: "#edeed1" }}
          isDraggablePiece={({ piece }) => false}
        />
        <div className="w-full flex">
          <ChessPlayerProfile user={userData} Elo={elo} />
        </div>
      </div>
    </div>
  );
}
