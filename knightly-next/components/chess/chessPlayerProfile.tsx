import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { User } from "@/lib/user-types";
import { toast } from "sonner";
import { Dot } from "lucide-react";
import { Skeleton, SVGSkeleton } from "../ui/skeleton";

type Props = {
  user: User;
  Elo: string;
  loading?: boolean;
};

function capitalizeFirstLetter(val: string) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

const LoadingSkeleton = () => (
  <>
    <div className="w-full flex items-center justify-evenly">
      <div className="w-full flex items-center gap-2 pl-2">
        <div>
          <span className="relative flex h-10 w-10 shrink-0">
            <SVGSkeleton className="aspect-square w-full h-full" />
          </span>
        </div>
        <div>
          <div>
            <Skeleton className="w-[112px] max-w-full h-5 mb-2" />
          </div>
          <div>
            <Skeleton className="w-[32px] max-w-full h-5" />
          </div>
        </div>
      </div>
      <div className="justify-end">
        <Skeleton className="w-[128px] max-w-full h-10" />
      </div>
    </div>
  </>
);

const ChessPlayerProfile = ({ user, Elo, loading = false }: Props) => {
  if (typeof user == "string" || user instanceof String) {
    toast.error(user);
    return <div className="w-full">user</div>;
  }
  if (loading) {
    return <LoadingSkeleton />;
  }
  return (
    <div className="w-full flex items-center justify-evenly">
      <div className="w-full flex items-center gap-2 pl-2">
        <div>
          {user.image ? (
            <Avatar className="rounded-lg">
              <AvatarImage src={user.image} alt="Player Avatar" />
              <AvatarFallback>GG</AvatarFallback>
            </Avatar>
          ) : (
            <Dot size={40} className="text-green-600" />
          )}
        </div>
        <div>
          <div>
            {user.chessUsername || "User"}{" "}
            {user.flagCode && (
              <img
                width={20}
                height={20}
                src={`https://flagcdn.com/48x36/${user.flagCode.toLowerCase()}.png`}
                alt={user.flagCode}
              />
            )}
          </div>
          <div className="text-muted-foreground">{Elo}</div>
        </div>
      </div>
      <div className="justify-end text-muted-foreground">
        {capitalizeFirstLetter(user.chessPlatform || "lichess")} Player
      </div>
    </div>
  );
};

export default ChessPlayerProfile;
