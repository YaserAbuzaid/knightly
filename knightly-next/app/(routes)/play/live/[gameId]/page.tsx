import { ChessGame } from "@/components/chess/chessBoardMain";
import React from "react";

const Page = async ({ params }: { params: Promise<{ gameId: string }> }) => {
  const { gameId } = await params;
  return (
    <div className="w-full h-full">
      <ChessGame gameId={gameId} />
    </div>
  );
};

export default Page;
